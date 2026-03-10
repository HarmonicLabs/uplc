import { Data } from "@harmoniclabs/plutus-data";
import { ConstTyTag, ConstType, constPairTypeUtils, constT, constTypeEq, constTypeToStirng, isWellFormedConstType } from "./ConstType";
import { ConstValue, canConstValueBeOfConstType, ConstValueList, Pair } from "./ConstValue";
import { BlsG1, BlsG2, BlsResult } from "@harmoniclabs/crypto";
import { UPLCTermTag } from "../../UPLCTerm/UPLCTermTag";
import { IUPLCTerm } from "../../UPLCTerm/UPLCTerm";

export interface IUPLCConst {
    tag: UPLCTermTag.Const;
    type: ConstType;
    value: ConstValue;
}

export class UPLCConst
    implements IUPLCConst, IUPLCTerm
{
    // return BitStream.fromBinStr( "0100" );
    static UPLCTag: UPLCTermTag.Const = UPLCTermTag.Const;
    readonly tag: UPLCTermTag.Const = UPLCTermTag.Const;

    public type: ConstType

    public value: ConstValue

    constructor( type: ConstType, value: number | bigint )
    constructor( type: ConstType, value: Uint8Array )
    constructor( type: ConstType, value: string )
    constructor( type: ConstType, value?: undefined )
    constructor( type: ConstType, value: boolean )
    constructor( type: ConstType, value: ConstValueList )
    constructor( type: ConstType, value: Pair< ConstValue, ConstValue > )
    constructor( type: ConstType, value: Data )
    constructor( type: ConstType, value: BlsG1 )
    constructor( type: ConstType, value: BlsG2 )
    constructor( type: ConstType, value: BlsResult )
    constructor(
        typeTag: ConstType,
        value: ConstValue
    )
    {
        if(!(
            isWellFormedConstType( typeTag )
        )) throw new Error(
            "trying to construct an UPLC constant with an invalid type; input type: " + constTypeToStirng( typeTag )
        );

        if(!(
            canConstValueBeOfConstType( value, typeTag )
        )) throw new Error(
            `trying to construct an UPLC constant with an invalid value for type "${constTypeToStirng( typeTag )}";
             input value was: ${value}`
        )

        if( constTypeEq( typeTag, constT.int ) )
        value = BigInt( value as any );

        if( constTypeEq( typeTag, constT.listOf( constT.int ) ) )
        value = ( value as number[] ).map( n => BigInt( n ) );

        if( typeTag[0] === ConstTyTag.pair )
        {
            if(
                constTypeEq(
                    constPairTypeUtils.getFirstTypeArgument( typeTag ),
                    constT.int
                )
            )
            (value as Pair<any,any>).fst = BigInt( (value as Pair<any,any>).fst );

            if(
                constTypeEq(
                    constPairTypeUtils.getSecondTypeArgument( typeTag ),
                    constT.int
                )
            )
            (value as Pair<any,any>).snd = BigInt( (value as Pair<any,any>).snd );
        }
        
        this.type = typeTag;
        this.value = value;
    }

    clone(): UPLCConst
    {
        return new UPLCConst(
            this.type,
            this.value as any
        );
    }

    static int( int: number | bigint ): UPLCConst
    {
        int = BigInt( int );

        return new UPLCConst( constT.int , int );
    }

    static byteString( bs: Uint8Array ): UPLCConst
    {
        return new UPLCConst( constT.byteStr, bs );
    }

    static str( str: string ): UPLCConst
    {
        return new UPLCConst( constT.str, str );
    }

    static get unit(): UPLCConst
    {
        return new UPLCConst( constT.unit, undefined );
    }

    static bool( bool: boolean ): UPLCConst
    {
        return new UPLCConst( constT.bool, bool );
    }

    static listOf( typeArg: ConstType ): ( ( values: ConstValueList ) => UPLCConst )
    {
        return function ( values: ConstValueList ): UPLCConst
        {
            return new UPLCConst( constT.listOf( typeArg ), values );
        };
    }

    static pairOf( typeArgFirst: ConstType, typeArgSecond: ConstType ): ( ( first: ConstValue, second: ConstValue ) => UPLCConst )
    {
        return function ( first: ConstValue, second: ConstValue ): UPLCConst
        {
            return new UPLCConst( constT.pairOf( typeArgFirst, typeArgSecond ), {fst: first, snd: second} );
        };
    }

    static data( data: Data ): UPLCConst
    {
        return new UPLCConst( constT.data, data );
    }

    static bls12_381_G1_element( g1: BlsG1 ): UPLCConst
    {
        return new UPLCConst( constT.bls12_381_G1_element, g1 );
    }

    static bls12_381_G2_element( g2: BlsG2 ): UPLCConst
    {
        return new UPLCConst( constT.bls12_381_G2_element, g2 );
    }

    static bls12_381_MlResult( mlResult: BlsResult ): UPLCConst
    {
        return new UPLCConst( constT.bls12_381_MlResult, mlResult );
    }
}