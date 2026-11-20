import { UPLCBuiltinTag, builtinTagToString } from "../UPLCBuiltinTag";
import { Builtin } from "../Builtin";
import { UPLCProgram } from "../../../UPLCProgram/UPLCProgram";
import { compileUPLC } from "../../../UPLCEncoder/UPLCEncoder";
import { parseUPLC } from "../../../UPLCDecoder/UPLCDecoder";

/**
 * The tag of every builtin in the flat encoding, as Plutus has it
 * (`encodeBuiltin` in plutus-core/plutus-core/src/PlutusCore/Default/Builtins.hs;
 * 75 and up from the conformance suite's reference machines).
 *
 * A tag is what goes on chain: a script that calls `bls12_381_G1_uncompress`
 * and is written with another builtin's number runs that other builtin on a
 * node. The numbers are NOT the order the constructors are declared in: for
 * each BLS group, `hashToGroup` is declared before `compress` and
 * `uncompress` and encoded after them. This library had the declaration
 * order (hashToGroup 58, compress 59, uncompress 60, and 65, 66, 67), and a
 * machine that reads the same table does not notice.
 */
const PLUTUS: [ number, string ][] = [
    [ 0, "addInteger" ], [ 1, "subtractInteger" ], [ 2, "multiplyInteger" ], [ 3, "divideInteger" ], [ 4, "quotientInteger" ],
    [ 5, "remainderInteger" ], [ 6, "modInteger" ], [ 7, "equalsInteger" ], [ 8, "lessThanInteger" ], [ 9, "lessThanEqualsInteger" ],
    [ 10, "appendByteString" ], [ 11, "consByteString" ], [ 12, "sliceByteString" ], [ 13, "lengthOfByteString" ], [ 14, "indexByteString" ],
    [ 15, "equalsByteString" ], [ 16, "lessThanByteString" ], [ 17, "lessThanEqualsByteString" ],
    [ 18, "sha2_256" ], [ 19, "sha3_256" ], [ 20, "blake2b_256" ], [ 21, "verifyEd25519Signature" ],
    [ 22, "appendString" ], [ 23, "equalsString" ], [ 24, "encodeUtf8" ], [ 25, "decodeUtf8" ],
    [ 26, "ifThenElse" ], [ 27, "chooseUnit" ], [ 28, "trace" ], [ 29, "fstPair" ], [ 30, "sndPair" ],
    [ 31, "chooseList" ], [ 32, "mkCons" ], [ 33, "headList" ], [ 34, "tailList" ], [ 35, "nullList" ],
    [ 36, "chooseData" ], [ 37, "constrData" ], [ 38, "mapData" ], [ 39, "listData" ], [ 40, "iData" ], [ 41, "bData" ],
    [ 42, "unConstrData" ], [ 43, "unMapData" ], [ 44, "unListData" ], [ 45, "unIData" ], [ 46, "unBData" ], [ 47, "equalsData" ],
    [ 48, "mkPairData" ], [ 49, "mkNilData" ], [ 50, "mkNilPairData" ],
    [ 51, "serialiseData" ], [ 52, "verifyEcdsaSecp256k1Signature" ], [ 53, "verifySchnorrSecp256k1Signature" ],
    [ 54, "bls12_381_G1_add" ], [ 55, "bls12_381_G1_neg" ], [ 56, "bls12_381_G1_scalarMul" ], [ 57, "bls12_381_G1_equal" ],
    [ 58, "bls12_381_G1_compress" ], [ 59, "bls12_381_G1_uncompress" ], [ 60, "bls12_381_G1_hashToGroup" ],
    [ 61, "bls12_381_G2_add" ], [ 62, "bls12_381_G2_neg" ], [ 63, "bls12_381_G2_scalarMul" ], [ 64, "bls12_381_G2_equal" ],
    [ 65, "bls12_381_G2_compress" ], [ 66, "bls12_381_G2_uncompress" ], [ 67, "bls12_381_G2_hashToGroup" ],
    [ 68, "bls12_381_millerLoop" ], [ 69, "bls12_381_mulMlResult" ], [ 70, "bls12_381_finalVerify" ],
    [ 71, "keccak_256" ], [ 72, "blake2b_224" ], [ 73, "integerToByteString" ], [ 74, "byteStringToInteger" ],
    [ 75, "andByteString" ], [ 76, "orByteString" ], [ 77, "xorByteString" ], [ 78, "complementByteString" ],
    [ 79, "readBit" ], [ 80, "writeBits" ], [ 81, "replicateByte" ], [ 82, "shiftByteString" ], [ 83, "rotateByteString" ],
    [ 84, "countSetBits" ], [ 85, "findFirstSetBit" ], [ 86, "ripemd_160" ],
    [ 87, "expModInteger" ], [ 88, "dropList" ], [ 89, "lengthOfArray" ], [ 90, "listToArray" ], [ 91, "indexArray" ],
    [ 92, "bls12_381_G1_multiScalarMul" ], [ 93, "bls12_381_G2_multiScalarMul" ],
    [ 94, "insertCoin" ], [ 95, "lookupCoin" ], [ 96, "unionValue" ], [ 97, "valueContains" ], [ 98, "valueData" ], [ 99, "unValueData" ], [ 100, "scaleValue" ],
];

/** the member of the enum a Plutus name is called by here */
const memberOf = ( plutusName: string ): string => plutusName === "lessThanEqualsInteger" ? "lessThanEqualInteger" : plutusName;

describe( "builtin tags are Plutus' flat tags", () => {

    test( "every builtin has the number Plutus encodes it with, and no other number is a builtin", () => {
        for( const [ tag, name ] of PLUTUS )
        {
            expect( [ name, ( UPLCBuiltinTag as any )[ memberOf( name ) ] ] ).toEqual( [ name, tag ] );
            expect( ( UPLCBuiltinTag as any )[ tag ] ).toBe( memberOf( name ) );
            expect( builtinTagToString( tag as UPLCBuiltinTag ) ).toBe( name );
        }
        const numbers = Object.values( UPLCBuiltinTag ).filter( v => typeof v === "number" ) as number[];
        expect( numbers.slice().sort( ( a, b ) => a - b ) ).toEqual( PLUTUS.map( ( [ tag ] ) => tag ) );
    });

    test( "the three BLS builtins of each group that are encoded in another order than they are declared", () => {
        expect( UPLCBuiltinTag.bls12_381_G1_compress ).toBe( 58 );
        expect( UPLCBuiltinTag.bls12_381_G1_uncompress ).toBe( 59 );
        expect( UPLCBuiltinTag.bls12_381_G1_hashToGroup ).toBe( 60 );
        expect( UPLCBuiltinTag.bls12_381_G2_compress ).toBe( 65 );
        expect( UPLCBuiltinTag.bls12_381_G2_uncompress ).toBe( 66 );
        expect( UPLCBuiltinTag.bls12_381_G2_hashToGroup ).toBe( 67 );
    });

    test( "a builtin is written as the term tag 7 and its seven bits: the bytes a node reads", () => {
        // (program 1.1.0 (builtin bls12_381_G1_uncompress)): 0111 0111011, padded 00001
        const uncompress = compileUPLC( new UPLCProgram( [ 1, 1, 0 ], new Builtin( UPLCBuiltinTag.bls12_381_G1_uncompress ) ) );
        expect( Array.from( uncompress ) ).toEqual( [ 1, 1, 0, 0x77, 0x61 ] );
        // (builtin bls12_381_G2_hashToGroup): 0111 1000011, padded 00001
        const hash = compileUPLC( new UPLCProgram( [ 1, 1, 0 ], new Builtin( UPLCBuiltinTag.bls12_381_G2_hashToGroup ) ) );
        expect( Array.from( hash ) ).toEqual( [ 1, 1, 0, 0x78, 0x61 ] );
        for( const [ tag, name ] of PLUTUS )
        {
            const bytes = compileUPLC( new UPLCProgram( [ 1, 1, 0 ], new Builtin( tag as UPLCBuiltinTag ) ) );
            // 4 bits of term tag, 7 of builtin, 00001
            const bits = "0111" + tag.toString( 2 ).padStart( 7, "0" ) + "00001";
            expect( [ name, Array.from( bytes ) ] ).toEqual( [ name, [ 1, 1, 0, parseInt( bits.slice( 0, 8 ), 2 ), parseInt( bits.slice( 8 ), 2 ) ] ] );
            const back = parseUPLC( bytes, "flat" ).body;
            expect( back instanceof Builtin && back.builtinTag ).toBe( tag );
        }
    });
});
