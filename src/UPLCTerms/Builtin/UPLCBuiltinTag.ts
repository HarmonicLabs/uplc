import { assert } from "../../utils/assert";

export type UPLCBuiltinTagNumber
    = 0  | 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9  
    | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 
    | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 
    | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 
    | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 
    | 50 | 51 | 52 | 53 ;

/**
 * to encode as 7-bits
 */
export enum UPLCBuiltinTag {
    // integers monoidal operations
    addInteger                  = 0,  // 0000000
    subtractInteger             = 1,  // 0000001
    multiplyInteger             = 2,  // 0000010
    divideInteger               = 3,  // 0000011
    quotientInteger             = 4,  // 0000100
    remainderInteger            = 5,  // 0000101
    modInteger                  = 6,  // 0000110
    // integers comparison operaitons
    equalsInteger               = 7,  // 0000111
    lessThanInteger             = 8,  // 0001000
    lessThanEqualInteger        = 9,  // 0001001
    // bytestring operations
    appendByteString            = 10, // 0001010
    consByteString              = 11, // 0001011
    sliceByteString             = 12, // 0001100
    lengthOfByteString          = 13, // 0001101
    indexByteString             = 14, // 0001110
    // bytestring comparison operations
    equalsByteString            = 15, // 0001111
    lessThanByteString          = 16, // 0010000
    lessThanEqualsByteString    = 17, // 0010001
    // hashes
    sha2_256                    = 18, // 0010010
    sha3_256                    = 19, // 0010011
    blake2b_256                 = 20, // 0010100
    verifyEd25519Signature      = 21, // 0010101
    // string operations
    appendString                = 22, // 0010110
    equalsString                = 23, // 0010111
    encodeUtf8                  = 24, // 0011000
    decodeUtf8                  = 25, // 0011001
    // control flow
    ifThenElse                  = 26, // 0011010
    chooseUnit                  = 27, // 0011011
    // tracing
    trace                       = 28, // 0011100
    // data
    fstPair                     = 29, // 0011101
    sndPair                     = 30, // 0011110
    chooseList                  = 31, // 0011111
    mkCons                      = 32, // 0100000
    headList                    = 33, // 0100001
    tailList                    = 34, // 0100010
    nullList                    = 35, // 0100011
    chooseData                  = 36, // 0100100
    constrData                  = 37, // 0100101
    mapData                     = 38, // 0100110
    listData                    = 39, // 0100111
    iData                       = 40, // 0101000
    bData                       = 41, // 0101001
    unConstrData                = 42, // 0101010
    unMapData                   = 43, // 0101011
    unListData                  = 44, // 0101100
    unIData                     = 45, // 0101101
    unBData                     = 46, // 0101110
    equalsData                  = 47, // 0101111
    mkPairData                  = 48, // 0110000
    mkNilData                   = 49, // 0110001
    mkNilPairData               = 50, // 0110010
    // Vasil (Plutus V2)
    serialiseData                   = 51,
    verifyEcdsaSecp256k1Signature   = 52,
    verifySchnorrSecp256k1Signature = 53,
    // Plutus V3
    bls12_381_G1_add                = 54,
    bls12_381_G1_neg                = 55,
    bls12_381_G1_scalarMul          = 56,
    bls12_381_G1_equal              = 57,
    bls12_381_G1_hashToGroup        = 58,
    bls12_381_G1_compress           = 59,
    bls12_381_G1_uncompress         = 60,
    bls12_381_G2_add                = 61,
    bls12_381_G2_neg                = 62,
    bls12_381_G2_scalarMul          = 63,
    bls12_381_G2_equal              = 64,
    bls12_381_G2_hashToGroup        = 65,
    bls12_381_G2_compress           = 66,
    bls12_381_G2_uncompress         = 67,
    bls12_381_millerLoop            = 68,
    bls12_381_mulMlResult           = 69,
    bls12_381_finalVerify           = 70,
    keccak_256                      = 71,
    blake2b_224                     = 72,
    // bitwise
    integerToByteString             = 73,
    byteStringToInteger             = 74,
    // plomin (batch 5)
    andByteString                   = 75,
    orByteString                    = 76,
    xorByteString                   = 77,
    complementByteString            = 78,
    readBit                         = 79,
    writeBits                       = 80,
    replicateByte                   = 81,
    shiftByteString                 = 82,
    rotateByteString                = 83,
    countSetBits                    = 84,
    findFirstSetBit                 = 85,
    ripemd_160                      = 86
}
Object.freeze( UPLCBuiltinTag );

function isNonNegativeInt( n: any ): n is number
{
    return (n >>> 0) === n;
}

const highestTag = Object.values( UPLCBuiltinTag )
.reduce((max, tag) =>
    isNonNegativeInt( tag ) ?
    ( tag > max ? tag : max )
    : max, 0
);

export function isUPLCBuiltinTag( tag: UPLCBuiltinTag | UPLCBuiltinTagNumber ): boolean
{
    return (
        isNonNegativeInt(tag) // tag is a non-negative integer
        &&
        tag <= highestTag
    );
}

export function getNRequiredForces( tag: UPLCBuiltinTag ): ( 0 | 1 | 2 )
{
    assert(
        isUPLCBuiltinTag( tag ),
        `in getNRequiredForces; the function is specific for UPLCBuiltinTags; input was: ${tag}`
    );

    // tags that do have one type parameter; 1 force
    if(
        tag === UPLCBuiltinTag.ifThenElse ||
        tag === UPLCBuiltinTag.chooseUnit ||
        tag === UPLCBuiltinTag.trace      ||
        tag === UPLCBuiltinTag.mkCons     ||
        tag === UPLCBuiltinTag.headList   ||
        tag === UPLCBuiltinTag.tailList   ||
        tag === UPLCBuiltinTag.nullList   ||
        tag === UPLCBuiltinTag.chooseData
    )
    {
        return 1;
    }

    // tags that do have two types paramters; two forces
    if(
        tag === UPLCBuiltinTag.fstPair ||
        tag === UPLCBuiltinTag.sndPair ||
        tag === UPLCBuiltinTag.chooseList
    )
    {
        return 2;
    }

    // tags from 0 to 25 and from 37 to 53 are all fixed in type; no forces requred
    if(
        tag <= 25 ||
        // all fixed type after constrData 
        tag >= UPLCBuiltinTag.constrData
    ) 
    {
        return 0;
    }

    throw new Error(
        "'getNRequiredForces' did not match any tag; the input was: " + tag
    );
}

export function isV1Supported( tag: UPLCBuiltinTag | UPLCBuiltinTagNumber ): boolean
{
    return (
        isUPLCBuiltinTag( tag ) &&
        tag <= 50
    );
}

export function isV2Supported( tag: UPLCBuiltinTag | UPLCBuiltinTagNumber ): boolean
{
    return (
        isUPLCBuiltinTag( tag )
    );
}

export function builtinTagToString( tag: UPLCBuiltinTag ): string
{
    switch( tag )
        {
            case UPLCBuiltinTag.addInteger :                        return "addInteger";
            case UPLCBuiltinTag.subtractInteger :                   return "subtractInteger";
            case UPLCBuiltinTag.multiplyInteger :                   return "multiplyInteger";
            case UPLCBuiltinTag.divideInteger :                     return "divideInteger";
            case UPLCBuiltinTag.quotientInteger :                   return "quotientInteger";
            case UPLCBuiltinTag.remainderInteger :                  return "remainderInteger";
            case UPLCBuiltinTag.modInteger :                        return "modInteger";
            case UPLCBuiltinTag.equalsInteger :                     return "equalsInteger";
            case UPLCBuiltinTag.lessThanInteger :                   return "lessThanInteger";
            case UPLCBuiltinTag.lessThanEqualInteger :              return "lessThanEqualsInteger";
            case UPLCBuiltinTag.appendByteString :                  return "appendByteString";
            case UPLCBuiltinTag.consByteString :                    return "consByteString";
            case UPLCBuiltinTag.sliceByteString :                   return "sliceByteString";
            case UPLCBuiltinTag.lengthOfByteString :                return "lengthOfByteString";
            case UPLCBuiltinTag.indexByteString :                   return "indexByteString";
            case UPLCBuiltinTag.equalsByteString :                  return "equalsByteString";
            case UPLCBuiltinTag.lessThanByteString :                return "lessThanByteString";
            case UPLCBuiltinTag.lessThanEqualsByteString :          return "lessThanEqualsByteString";
            case UPLCBuiltinTag.sha2_256 :                          return "sha2_256";
            case UPLCBuiltinTag.sha3_256 :                          return "sha3_256";
            case UPLCBuiltinTag.blake2b_256 :                       return "blake2b_256";
            case UPLCBuiltinTag.verifyEd25519Signature:             return "verifyEd25519Signature";
            case UPLCBuiltinTag.appendString :                      return "appendString";
            case UPLCBuiltinTag.equalsString :                      return "equalsString";
            case UPLCBuiltinTag.encodeUtf8 :                        return "encodeUtf8";
            case UPLCBuiltinTag.decodeUtf8 :                        return "decodeUtf8";
            case UPLCBuiltinTag.ifThenElse :                        return "ifThenElse";
            case UPLCBuiltinTag.chooseUnit :                        return "chooseUnit";
            case UPLCBuiltinTag.trace :                             return "trace";
            case UPLCBuiltinTag.fstPair :                           return "fstPair";
            case UPLCBuiltinTag.sndPair :                           return "sndPair";
            case UPLCBuiltinTag.chooseList :                        return "chooseList";
            case UPLCBuiltinTag.mkCons :                            return "mkCons";
            case UPLCBuiltinTag.headList :                          return "headList";
            case UPLCBuiltinTag.tailList :                          return "tailList";
            case UPLCBuiltinTag.nullList :                          return "nullList";
            case UPLCBuiltinTag.chooseData :                        return "chooseData";
            case UPLCBuiltinTag.constrData :                        return "constrData";
            case UPLCBuiltinTag.mapData :                           return "mapData";
            case UPLCBuiltinTag.listData :                          return "listData";
            case UPLCBuiltinTag.iData    :                          return "iData";
            case UPLCBuiltinTag.bData    :                          return "bData";
            case UPLCBuiltinTag.unConstrData :                      return "unConstrData";
            case UPLCBuiltinTag.unMapData    :                      return "unMapData";
            case UPLCBuiltinTag.unListData   :                      return "unListData";
            case UPLCBuiltinTag.unIData      :                      return "unIData";
            case UPLCBuiltinTag.unBData      :                      return "unBData";
            case UPLCBuiltinTag.equalsData   :                      return "equalsData";
            case UPLCBuiltinTag.mkPairData   :                      return "mkPairData";
            case UPLCBuiltinTag.mkNilData    :                      return "mkNilData";
            case UPLCBuiltinTag.mkNilPairData:                      return "mkNilPairData";
            case UPLCBuiltinTag.serialiseData:                      return "serialiseData";
            case UPLCBuiltinTag.verifyEcdsaSecp256k1Signature:      return "verifyEcdsaSecp256k1Signature";
            case UPLCBuiltinTag.verifySchnorrSecp256k1Signature:    return "verifySchnorrSecp256k1Signature";
            case UPLCBuiltinTag.bls12_381_G1_add        :           return "bls12_381_G1_add";
            case UPLCBuiltinTag.bls12_381_G1_neg        :           return "bls12_381_G1_neg";
            case UPLCBuiltinTag.bls12_381_G1_scalarMul  :           return "bls12_381_G1_scalarMul";
            case UPLCBuiltinTag.bls12_381_G1_equal      :           return "bls12_381_G1_equal";
            case UPLCBuiltinTag.bls12_381_G1_hashToGroup:           return "bls12_381_G1_hashToGroup";
            case UPLCBuiltinTag.bls12_381_G1_compress   :           return "bls12_381_G1_compress";
            case UPLCBuiltinTag.bls12_381_G1_uncompress :           return "bls12_381_G1_uncompress";
            case UPLCBuiltinTag.bls12_381_G2_add        :           return "bls12_381_G2_add";
            case UPLCBuiltinTag.bls12_381_G2_neg        :           return "bls12_381_G2_neg";
            case UPLCBuiltinTag.bls12_381_G2_scalarMul  :           return "bls12_381_G2_scalarMul";
            case UPLCBuiltinTag.bls12_381_G2_equal      :           return "bls12_381_G2_equal";
            case UPLCBuiltinTag.bls12_381_G2_hashToGroup:           return "bls12_381_G2_hashToGroup";
            case UPLCBuiltinTag.bls12_381_G2_compress   :           return "bls12_381_G2_compress";
            case UPLCBuiltinTag.bls12_381_G2_uncompress :           return "bls12_381_G2_uncompress";
            case UPLCBuiltinTag.bls12_381_millerLoop    :           return "bls12_381_millerLoop";
            case UPLCBuiltinTag.bls12_381_mulMlResult   :           return "bls12_381_mulMlResult";
            case UPLCBuiltinTag.bls12_381_finalVerify   :           return "bls12_381_finalVerify";
            case UPLCBuiltinTag.keccak_256              :           return "keccak_256";
            case UPLCBuiltinTag.blake2b_224             :           return "blake2b_224";
            case UPLCBuiltinTag.integerToByteString     :           return "integerToByteString";
            case UPLCBuiltinTag.byteStringToInteger     :           return "byteStringToInteger";
            case UPLCBuiltinTag.andByteString           :           return "andByteString";
            case UPLCBuiltinTag.orByteString            :           return "orByteString";
            case UPLCBuiltinTag.xorByteString           :           return "xorByteString";
            case UPLCBuiltinTag.complementByteString    :           return "complementByteString";
            case UPLCBuiltinTag.readBit                 :           return "readBit";
            case UPLCBuiltinTag.writeBits               :           return "writeBits";
            case UPLCBuiltinTag.replicateByte           :           return "replicateByte";
            case UPLCBuiltinTag.shiftByteString         :           return "shiftByteString";
            case UPLCBuiltinTag.rotateByteString        :           return "rotateByteString";
            case UPLCBuiltinTag.countSetBits            :           return "countSetBits";
            case UPLCBuiltinTag.findFirstSetBit         :           return "findFirstSetBit";
            case UPLCBuiltinTag.ripemd_160              :           return "ripemd_160";

            
            default:
                // tag; // check that is of type 'never'
                return "";
        }
}


export function builtinTagFromString( tag: string ): UPLCBuiltinTag
{
    switch( tag.trim() )
    {
        case "addInteger" :                        return UPLCBuiltinTag.addInteger;
        case "subtractInteger" :                   return UPLCBuiltinTag.subtractInteger;
        case "multiplyInteger" :                   return UPLCBuiltinTag.multiplyInteger;
        case "divideInteger" :                     return UPLCBuiltinTag.divideInteger;
        case "quotientInteger" :                   return UPLCBuiltinTag.quotientInteger;
        case "remainderInteger" :                  return UPLCBuiltinTag.remainderInteger;
        case "modInteger" :                        return UPLCBuiltinTag.modInteger;
        case "equalsInteger" :                     return UPLCBuiltinTag.equalsInteger;
        case "lessThanInteger" :                   return UPLCBuiltinTag.lessThanInteger;
        case "lessThanEqualInteger" :              return UPLCBuiltinTag.lessThanEqualInteger;
        case "lessThanEqualsInteger" :             return UPLCBuiltinTag.lessThanEqualInteger;
        case "appendByteString" :                  return UPLCBuiltinTag.appendByteString;
        case "consByteString" :                    return UPLCBuiltinTag.consByteString;
        case "sliceByteString" :                   return UPLCBuiltinTag.sliceByteString;
        case "lengthOfByteString" :                return UPLCBuiltinTag.lengthOfByteString;
        case "indexByteString" :                   return UPLCBuiltinTag.indexByteString;
        case "equalsByteString" :                  return UPLCBuiltinTag.equalsByteString;
        case "lessThanByteString" :                return UPLCBuiltinTag.lessThanByteString;
        case "lessThanEqualsByteString" :          return UPLCBuiltinTag.lessThanEqualsByteString;
        case "sha2_256" :                          return UPLCBuiltinTag.sha2_256;
        case "sha3_256" :                          return UPLCBuiltinTag.sha3_256;
        case "blake2b_256" :                       return UPLCBuiltinTag.blake2b_256;
        case "verifyEd25519Signature":             return UPLCBuiltinTag.verifyEd25519Signature;
        case "appendString" :                      return UPLCBuiltinTag.appendString;
        case "equalsString" :                      return UPLCBuiltinTag.equalsString;
        case "encodeUtf8" :                        return UPLCBuiltinTag.encodeUtf8;
        case "decodeUtf8" :                        return UPLCBuiltinTag.decodeUtf8;
        case "ifThenElse" :                        return UPLCBuiltinTag.ifThenElse;
        case "chooseUnit" :                        return UPLCBuiltinTag.chooseUnit;
        case "trace" :                             return UPLCBuiltinTag.trace;
        case "fstPair" :                           return UPLCBuiltinTag.fstPair;
        case "sndPair" :                           return UPLCBuiltinTag.sndPair;
        case "chooseList" :                        return UPLCBuiltinTag.chooseList;
        case "mkCons" :                            return UPLCBuiltinTag.mkCons;
        case "headList" :                          return UPLCBuiltinTag.headList;
        case "tailList" :                          return UPLCBuiltinTag.tailList;
        case "nullList" :                          return UPLCBuiltinTag.nullList;
        case "chooseData" :                        return UPLCBuiltinTag.chooseData;
        case "constrData" :                        return UPLCBuiltinTag.constrData;
        case "mapData" :                           return UPLCBuiltinTag.mapData;
        case "listData" :                          return UPLCBuiltinTag.listData;
        case "iData"    :                          return UPLCBuiltinTag.iData;
        case "bData"    :                          return UPLCBuiltinTag.bData;
        case "unConstrData" :                      return UPLCBuiltinTag.unConstrData;
        case "unMapData"    :                      return UPLCBuiltinTag.unMapData;
        case "unListData"   :                      return UPLCBuiltinTag.unListData;
        case "unIData"      :                      return UPLCBuiltinTag.unIData;
        case "unBData"      :                      return UPLCBuiltinTag.unBData;
        case "equalsData"   :                      return UPLCBuiltinTag.equalsData;
        case "mkPairData"   :                      return UPLCBuiltinTag.mkPairData;
        case "mkNilData"    :                      return UPLCBuiltinTag.mkNilData;
        case "mkNilPairData":                      return UPLCBuiltinTag.mkNilPairData;
        case "serialiseData":                      return UPLCBuiltinTag.serialiseData;
        case "verifyEcdsaSecp256k1Signature":      return UPLCBuiltinTag.verifyEcdsaSecp256k1Signature;
        case "verifySchnorrSecp256k1Signature":    return UPLCBuiltinTag.verifySchnorrSecp256k1Signature;
        case "bls12_381_G1_add"   :                return UPLCBuiltinTag.bls12_381_G1_add;
        case "bls12_381_G1_neg"   :                return UPLCBuiltinTag.bls12_381_G1_neg;
        case "bls12_381_G1_scalarMul":             return UPLCBuiltinTag.bls12_381_G1_scalarMul;
        case "bls12_381_G1_equal":                 return UPLCBuiltinTag.bls12_381_G1_equal;
        case "bls12_381_G1_hashToGroup":           return UPLCBuiltinTag.bls12_381_G1_hashToGroup;
        case "bls12_381_G1_compress":              return UPLCBuiltinTag.bls12_381_G1_compress;
        case "bls12_381_G1_uncompress":            return UPLCBuiltinTag.bls12_381_G1_uncompress;
        case "bls12_381_G2_add":                   return UPLCBuiltinTag.bls12_381_G2_add;
        case "bls12_381_G2_neg":                   return UPLCBuiltinTag.bls12_381_G2_neg;
        case "bls12_381_G2_scalarMul":             return UPLCBuiltinTag.bls12_381_G2_scalarMul;
        case "bls12_381_G2_equal":                 return UPLCBuiltinTag.bls12_381_G2_equal;
        case "bls12_381_G2_hashToGroup":           return UPLCBuiltinTag.bls12_381_G2_hashToGroup;
        case "bls12_381_G2_compress":              return UPLCBuiltinTag.bls12_381_G2_compress;
        case "bls12_381_G2_uncompress":            return UPLCBuiltinTag.bls12_381_G2_uncompress;
        case "bls12_381_millerLoop":               return UPLCBuiltinTag.bls12_381_millerLoop;
        case "bls12_381_mulMlResult":              return UPLCBuiltinTag.bls12_381_mulMlResult;
        case "bls12_381_finalVerify":              return UPLCBuiltinTag.bls12_381_finalVerify;
        case "keccak_256":                         return UPLCBuiltinTag.keccak_256;
        case "blake2b_224":                        return UPLCBuiltinTag.blake2b_224;
        case "integerToByteString":                return UPLCBuiltinTag.integerToByteString
        case "byteStringToInteger":                return UPLCBuiltinTag.byteStringToInteger
        case "andByteString":                      return UPLCBuiltinTag.andByteString
        case "orByteString":                       return UPLCBuiltinTag.orByteString
        case "xorByteString":                      return UPLCBuiltinTag.xorByteString
        case "complementByteString":               return UPLCBuiltinTag.complementByteString
        case "readBit":                            return UPLCBuiltinTag.readBit
        case "writeBits":                          return UPLCBuiltinTag.writeBits
        case "replicateByte":                      return UPLCBuiltinTag.replicateByte
        case "shiftByteString":                    return UPLCBuiltinTag.shiftByteString
        case "rotateByteString":                   return UPLCBuiltinTag.rotateByteString
        case "countSetBits":                       return UPLCBuiltinTag.countSetBits
        case "findFirstSetBit":                    return UPLCBuiltinTag.findFirstSetBit
        case "ripemd_160":                         return UPLCBuiltinTag.ripemd_160

        
        default:
            // tag; // check that is of type 'never'
            throw new Error("unknow builtin: " + tag)
    }
}