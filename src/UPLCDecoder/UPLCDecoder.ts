import { Cbor, CborBytes, CborObj } from "@harmoniclabs/cbor";
import { FlatDecoder } from "../_internal/flat";
import { UPLCProgram, UPLCVersion } from "../UPLCProgram";
import { UPLCTerm } from "../UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";
import { Application, Builtin, Case, Delay, Force, constPairTypeUtils, Constr, constT, ConstType, constTypeEq, constTypeToStirng, ConstTyTag, ErrorUPLC, Lambda, Pair, UPLCConst, UPLCVar } from "../UPLCTerms";
import { Data, dataFromCbor } from "@harmoniclabs/plutus-data";
import { toUtf8 } from "@harmoniclabs/uint8array-utils";

const n0 = BigInt(0);
const n1 = BigInt(1);
const n2 = BigInt(2);
const n7 = BigInt(7);

export type SerializedScriptFormat = "cbor" | "flat";

/**
 * Converts a flat list of raw 4-bit type tags from the wire format
 * (which uses 7 = tyApp as a prefix for compound types) to the internal
 * ConstType representation (a flat array of ConstTyTag without tyApp tags).
 *
 * Wire examples:
 *   [2]           → [ConstTyTag.int]
 *   [7, 5, 2]     → [ConstTyTag.list, ConstTyTag.int]
 *   [7, 7, 6, 2, 1] → [ConstTyTag.pair, ConstTyTag.int, ConstTyTag.byteStr]
 */
function wireToConstType(rawTags: number[]): ConstType {
    // Returns [parsed ConstType tags, next index to continue from]
    function parse(idx: number): [ConstType, number] {
        if (idx >= rawTags.length) throw new Error("UPLCDecoder: empty const type");
        const tag = rawTags[idx]!;
        if (tag === 7) {
            const next = rawTags[idx + 1];
            if (next === 5) {
                // list <innerType>
                const [innerType, nextIdx] = parse(idx + 2);
                return [[ConstTyTag.list, ...innerType], nextIdx];
            } else if (next === 7 && rawTags[idx + 2] === 6) {
                // pair <firstType> <secondType>
                const [firstType, afterFirst] = parse(idx + 3);
                const [secondType, afterSecond] = parse(afterFirst);
                return [[ConstTyTag.pair, ...firstType, ...secondType], afterSecond];
            }
            throw new Error("UPLCDecoder: unknown type application at index " + (idx + 1));
        }
        return [[tag as ConstTyTag], idx + 1];
    }
    return parse(0)[0];
}

export class UPLCDecoder extends FlatDecoder {
    constructor(bytes: Uint8Array) { super(bytes); }
    static parse(
        serializedScript: Uint8Array,
        format: SerializedScriptFormat = "cbor"
    ): UPLCProgram {
        if (format === "cbor") {
            let shouldTryParseCbor = true;
            let tmp: CborObj = undefined as any;

            while (shouldTryParseCbor) {
                try {
                    tmp = Cbor.parse(serializedScript);
                }
                catch {
                    shouldTryParseCbor = false;
                }

                if (!(tmp instanceof CborBytes)) shouldTryParseCbor = false;
                else serializedScript = tmp.bytes;
            }

            format = "flat";
        }

        return (new UPLCDecoder(serializedScript)).decodeProgram();
    }

    decode(): UPLCProgram { return this.decodeProgram(); }
    decodeProgram(): UPLCProgram {
        const version = this.decodeVersion();
        const body = this.decodeTerm( n0 );
        return new UPLCProgram(version, body);
    }

    /**
     * Decodes a version number from the binary stream.
     * @returns {SemVer} The decoded semantic versioning number as a string.
     */
    decodeVersion(): UPLCVersion {
        const major = this.popByte();
        const minor = this.popByte();
        const patch = this.popByte();
        return new UPLCVersion(major, minor, patch);
    }

    decodeTerm(lamDepth: bigint): UPLCTerm {
        const tag = this.popBits(4) as UPLCTermTag;
        switch (tag) {
            case UPLCTermTag.Var: {
                const deBruijn = this.decodeNatural();
                return new UPLCVar(deBruijn - n1);
            }
            case UPLCTermTag.Lambda: return new Lambda(this.decodeTerm(lamDepth + n1));
            case UPLCTermTag.Application: {
                const func = this.decodeTerm(lamDepth);
                const arg = this.decodeTerm(lamDepth);
                return new Application(func, arg);
            }
            case UPLCTermTag.Builtin: return new Builtin(this.popBits(7));
            case UPLCTermTag.Delay: return new Delay(this.decodeTerm(lamDepth));
            case UPLCTermTag.Force: return new Force(this.decodeTerm(lamDepth));
            case UPLCTermTag.Constr: return new Constr(
                this.decodeNatural(),
                this.decodeList(() => this.decodeTerm(lamDepth))
            );
            case UPLCTermTag.Case: return new Case(
                this.decodeTerm(lamDepth),
                this.decodeList(() => this.decodeTerm(lamDepth))
            );
            case UPLCTermTag.Error: return new ErrorUPLC();
            case UPLCTermTag.Const: {
                const rawTags = this.decodeList(() => this.popBits(4) as number);
                if (rawTags.length < 1) throw new Error(
                    "UPLCDecoder.decodeTerm: expected at least one tag for the Const type; got an empty list"
                );
                const type = wireToConstType(rawTags);
                return new UPLCConst(
                    type,
                    this.decodeConstValue(type)
                )
            };
            default: throw new Error("Unknown UPLCTermTag: " + tag);
        }
    }

    decodeConstValue(type: ConstType): any {
        if (constTypeEq(type, constT.int)) return this.decodeInteger();
        else if (constTypeEq(type, constT.byteStr)) return this.decodeByteString();
        else if (constTypeEq(type, constT.str)) return toUtf8(this.decodeByteString());
        else if (constTypeEq(type, constT.unit)) return undefined;
        else if (constTypeEq(type, constT.bool)) return this.decodeBool();
        else if (constTypeEq(type, constT.data)) return this.decodeCborData();
        else if (type[0] === ConstTyTag.list) return this.decodeList(() => this.decodeConstValue(type.slice(1) as ConstType));
        else if (type[0] === ConstTyTag.pair) {
            const fstType = constPairTypeUtils.getFirstTypeArgument( type );
            // const sndType = constPairTypeUtils.getSecondTypeArgument( restType );
            const sndType = type.slice( fstType.length + 1 ) as ConstType;
            const fst = this.decodeConstValue(fstType);
            const snd = this.decodeConstValue(sndType);
            return { fst, snd } as Pair<unknown, unknown>;
        }
        throw new Error(
            "Unknown ConstType: " + type
        );
    }


    /**
     * Decodes an integer from the binary stream.
     * @returns {bigint} The decoded integer.
     */
    decodeInteger(): bigint {
        const nat = this.decodeNatural();
        return nat % n2 === n0 ? nat / n2 : -((nat + n1) / n2);
    }

    /**
     * Decodes a byte string from the binary stream.
     * @returns {Uint8Array} The decoded byte array.
     */
    decodeByteString(): Uint8Array {
        this.skipByte();
        let blockLength: number = this.popByte();
        if (blockLength === 0) {
            return new Uint8Array();
        }
        let arr: Uint8Array | undefined;
        while (blockLength !== 0) {
            if (arr === undefined) {
                arr = this.takeBytes(blockLength);
            } else {
                const takenSlice = this.takeBytes(blockLength);
                const newArray = new Uint8Array(arr.length + takenSlice.length);
                newArray.set(arr, 0);
                newArray.set(takenSlice, arr.length);
                arr = newArray;
            }
            blockLength = this.takeBytes(1)[0]!;
        }
        if (arr === undefined) {
            throw new Error(
                "UPLCDecoder decodeByteString: failed to decode any length.",
            );
        }
        return arr;
    }

    /**
     * Decodes a boolean value from the binary stream.
     * @returns {object} The decoded boolean value as a UPLC data structure.
     */
    decodeBool(): boolean {
        return this.popBit() === 1;
    }

    /**
     * Decodes CBOR data from the binary stream.
     * @returns {Data} The decoded data in Plutus core format.
     */
    decodeCborData(): Data {
        return dataFromCbor( this.decodeByteString());
    }

    /**
     * Decodes a natural number from the binary stream.
     * @returns {bigint} The decoded natural number.
     */
    decodeNatural(): bigint {
        const bytes = this.decodeList2(() => this.popBits(7));
        let val = n0;
        for (let i = 0; i < bytes.length; i += 1) {
            val += BigInt(bytes[i]!) << (BigInt(i) * n7);
        }
        return val;
    }

    /**
     * Decodes a list of items from the binary stream.
     * @typeParam Item The type of items in the list.
     * @param {() => Item} decodeItem A function to decode a single item.
     * @returns {Item[]} The decoded list of items.
     */
    decodeList<Item>(decodeItem: () => Item): Item[] {
        const list: Item[] = [];
        let cont = this.popBit();
        while (cont === 1) {
            list.push(decodeItem());
            cont = this.popBit();
        }
        return list;
    }

    /**
     * Decodes a list of items where the list is expected to have at least one item.
     * @typeParam Item The type of items in the list.
     * @returns {Item[]} The decoded list of items.
     */
    decodeList2<Item>(decodeItem: () => Item): Item[] {
        const list: Item[] = [];
        let cont = this.popBit();
        while (cont === 1) {
            list.push(decodeItem());
            cont = this.popBit();
        }
        list.push(decodeItem());
        return list;
    }
}

export function parseUPLC(
    serializedScript: Uint8Array,
    format: SerializedScriptFormat = "flat"
): UPLCProgram {
    return UPLCDecoder.parse(serializedScript, format);
}