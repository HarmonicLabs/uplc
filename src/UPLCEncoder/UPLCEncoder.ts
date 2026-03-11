import { fromUtf8 } from "@harmoniclabs/uint8array-utils";
import { FlatEncoder } from "../_internal/flat";
import { UPLCProgram, UPLCVersion } from "../UPLCProgram";
import { UPLCTermObj } from "../UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";
import { constPairTypeUtils, ConstType, ConstTyTag, IBuiltin, IUPLCConst, Pair } from "../UPLCTerms";
import { serializeVersion } from "./serial/serializeVersion";
import { Data, dataToCbor } from "@harmoniclabs/plutus-data";

// const n0 = BigInt(0);
const n1 = BigInt(1);
const n2 = BigInt(2);
const n7 = BigInt(7);
const n127 = BigInt(127);
const n0x7f = BigInt(0x7f);
const nMaxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER ?? 0xff_ff_ff_ff);

/**
 * Converts the internal ConstType (flat array without tyApp tags) to
 * the wire format (which uses 7 = tyApp as a prefix for compound types).
 *
 * Internal examples:
 *   [ConstTyTag.int]                              → [2]
 *   [ConstTyTag.list, ConstTyTag.int]             → [7, 5, 2]
 *   [ConstTyTag.pair, ConstTyTag.int, ConstTyTag.byteStr] → [7, 7, 6, 2, 1]
 */
function constTypeToWire(type: ConstType): number[] {
    if (type[0] === ConstTyTag.list) {
        return [7, 5, ...constTypeToWire(type.slice(1) as ConstType)];
    }
    if (type[0] === ConstTyTag.pair) {
        const fstType = constPairTypeUtils.getFirstTypeArgument(type);
        const sndType = constPairTypeUtils.getSecondTypeArgument(type);
        return [7, 7, 6, ...constTypeToWire(fstType), ...constTypeToWire(sndType)];
    }
    return [type[0] as number];
}


export function compileUPLC(
    program: UPLCProgram
): Uint8Array
{
    return (new UPLCEncoder()).compile( program );
}

/**
 * alias for `compileUPLC`
 */
export const encodeUPLC = compileUPLC;

export class UPLCEncoder extends FlatEncoder
{
    static compile( program: UPLCProgram ): Uint8Array
    {
        return (new UPLCEncoder()).compile( program );
    }

    compile( program: UPLCProgram ): Uint8Array
    {
        this.encodeVersion( program.version );
        this.encodeTerm( program.body );
        this.pad();
        return this.getBytes();
    }

    encodeVersion(version: UPLCVersion): void {
        this.pushByte(version.major);
        this.pushByte(version.minor);
        this.pushByte(version.patch);
    }

    encodeTerm(term: UPLCTermObj): void {
        const tag = term.tag;
        this.pushBits(tag, 4);

        switch (tag) {
            // old bug, keep backwards compatiblity
            // our UPLCVar is 0-indexed, but the encoding expects 1-indexed variables, so we add 1 here
            case UPLCTermTag.Var: return this.encodeNatural(term.deBruijn + 1);
            case UPLCTermTag.Delay: return this.encodeTerm(term.delayedTerm);
            case UPLCTermTag.Lambda: return this.encodeTerm(term.body);
            case UPLCTermTag.Application: {
                this.encodeTerm(term.func);
                this.encodeTerm(term.arg);
                return;
            }
            case UPLCTermTag.Const: return this.encodeConst(term);
            case UPLCTermTag.Force: return this.encodeTerm(term.forced);
            case UPLCTermTag.Error: return; // No additional data to encode for error
            case UPLCTermTag.Builtin: return this.encodeBuiltin(term);
            case UPLCTermTag.Constr: {
                this.encodeNatural(term.index);
                this.encodeList(term.terms, (t) => this.encodeTerm(t));
                return;
            };
            case UPLCTermTag.Case: {
                this.encodeTerm(term.constrTerm);
                this.encodeList(term.continuations, (c) => this.encodeTerm(c));
                return;
            }
            default: throw new Error("Unknown UPLCTermTag: " + tag);
        }
    }

    encodeList<T>(items: T[], encode: (t: T) => void): void {
        for (let i = 0; i < items.length; i++) {
            this.pushBit(1);
            encode(items[i]);
        }
        this.pushBit(0);
    }

    encodeNatural(n: number): void {
        if (n <= 127) {
            this.pushBits( n, 8 );
            return;
        }
        const bits: number[] = [];
        while (n > 0) {
            bits.push(n & 0x7f);
            n >>= 7;
        }
        for (let i = 0; i < bits.length; i++) {
            this.pushBit(i !== bits.length - 1 ? 1 : 0);
            this.pushBits(bits[i]!, 7);
        }
    }
    /**
     * Encodes a natural number (non-negative integer).
     * @param n - The natural number to encode.
     */
    encodeNaturalBig(n: bigint): void {
        if (n <= n127) {
            this.pushBits(Number(n), 8);
            return;
        }
        if( n <= nMaxSafeInteger ) {
            this.encodeNatural( Number(n) );
            return;
        }
        const bits: number[] = [];
        while (n > 0) {
            bits.push(Number(n & n0x7f));
            n >>= n7;
        }
        for (let i = 0; i < bits.length; i++) {
            this.pushBit(i !== bits.length - 1 ? 1 : 0);
            this.pushBits(bits[i]!, 7);
        }
    }

    encodeBuiltin(builtin: IBuiltin): void {
        // const nRequiredForces = getNRequiredForces( builtin.builtinTag );
        // if( nRequiredForces > 0 ) {
        //     for( let i = 0; i < nRequiredForces; i++ ) {
        //         this.pushBits( UPLCTermTag.Force, 4 );
        //     }
        // }
        return this.pushBits(builtin.builtinTag, 7);
    }

    encodeConst(con: IUPLCConst): void {
        this.encodeList(constTypeToWire(con.type), n => this.pushBits(n, 4));
        this.encodeConstValue(con.type, con.value);
    }
    encodeConstValue(type: ConstType, value: unknown): void {
        const typeTag = type[0]!;
        const restType = type.slice(1) as ConstType;
        switch (typeTag) {
            case ConstTyTag.int: return this.encodeInteger(value as bigint);
            case ConstTyTag.byteStr: return this.encodeByteString(value as Uint8Array);
            case ConstTyTag.str: return this.encodeByteString(fromUtf8(value as string));
            case ConstTyTag.unit: return; // No value to encode for unit
            case ConstTyTag.bool: return this.encodeBool(value as boolean);
            case ConstTyTag.list: {
                this.encodeList( value as unknown[], v => this.encodeConstValue(restType, v) );
                return;
            };
            case ConstTyTag.pair: {
                const { fst, snd } = value as Pair<unknown, unknown>;
                const fstType = constPairTypeUtils.getFirstTypeArgument( type );
                const sndType = type.slice( fstType.length + 1 ) as ConstType;
                this.encodeConstValue(fstType, fst);
                this.encodeConstValue(sndType, snd);
                return;
            };
            // tyApp = 7, // only used internally for types like list and pair
            case ConstTyTag.data: return this.encodeByteString( dataToCbor( value as Data ) );
            /* NEVER ENCODED; still needed for plutus-machine values */
            // bls12_381_G1_element = 9,
            // bls12_381_G2_element = 10,
            // bls12_381_MlResult = 11
            default: throw new Error("Unknown ConstTyTag: " + typeTag);
        }
    }

    /**
     * Encodes an integer (positive or negative).
     * @param i - The integer to encode.
     */
    encodeInteger(i: bigint): void {
        const n = i >= 0 ? i * n2 : -i * n2 - n1;
        this.encodeNaturalBig(n);
    }

    /**
     * Encodes a byte string.
     * @param bytes - The byte string to encode as a Uint8Array.
     */
    encodeByteString(bytes: Uint8Array): void {
        this.pad(); // Ensure byte alignment before encoding bytestring

        if (bytes.length === 0) {
            this.pushByte(0);
            return;
        }

        const chunks: Uint8Array[] = [];
        for (let i = 0; i < bytes.length; i += 255) {
            chunks.push(bytes.subarray(i, i + 255));
        }

        for (const chunk of chunks) {
            this.pushByte(chunk.length);
            this.pushBytes(chunk);
        }
        this.pushByte(0); // End of encoding marker
    }

    /**
     * Encodes a boolean value.
     * @param value - The boolean value to encode.
     */
    encodeBool(value: boolean): void {
        this.pushBit(value ? 1 : 0);
    }
}
