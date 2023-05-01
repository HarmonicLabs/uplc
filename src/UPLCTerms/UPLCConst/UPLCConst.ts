import { BitStream } from "@harmoniclabs/bitstream";
import { ByteString } from "@harmoniclabs/bytestring";
import { Pair } from "@harmoniclabs/pair";
import { Data } from "@harmoniclabs/plutus-data";
import { ConstTyTag, ConstType, constPairTypeUtils, constT, constTypeEq, constTypeToStirng, isWellFormedConstType } from "./ConstType";
import { ConstValue, canConstValueBeOfConstType, ConstValueList } from "./ConstValue";
import { assert } from "../../utils/assert";


export class UPLCConst
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr( "0100" );
    };

    private _type: ConstType

    get type(): ConstType
    {
        // clone
        return this._type.map( tag => tag ) as ConstType;
    }

    private _value: ConstValue

    get value(): ConstValue
    {
        return this._value;
    }

    constructor( type: ConstType, value: number | bigint )
    constructor( type: ConstType, value: ByteString )
    constructor( type: ConstType, value: string )
    constructor( type: ConstType, value?: undefined )
    constructor( type: ConstType, value: boolean )
    constructor( type: ConstType, value: ConstValueList )
    constructor( type: ConstType, value: Pair< ConstValue, ConstValue > )
    constructor( type: ConstType, value: Data )
    constructor(
        typeTag: ConstType,
        value: ConstValue
    )
    {
        assert(
            isWellFormedConstType( typeTag ),
            "trying to construct an UPLC constant with an invalid type; input type: " + constTypeToStirng( typeTag )
        );

        assert(
            canConstValueBeOfConstType( value, typeTag ),
            `trying to construct an UPLC constant with an invalid value for type "${constTypeToStirng( typeTag )}";
             input value was: ${value}`
        )

        if( constTypeEq( typeTag, constT.int ) )
        value = BigInt( value as any );


        if( constTypeEq( typeTag, constT.listOf( constT.int ) ) )
        value = ( value as number[] ).map( n => BigInt( n ) );

        if(
            typeTag[0] === ConstTyTag.pair
        )
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
        
        this._type = typeTag;
        this._value = value;
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

    static byteString( bs: ByteString ): UPLCConst
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
            return new UPLCConst( constT.pairOf( typeArgFirst, typeArgSecond ), new Pair( first, second ) );
        };
    }

    static data( data: Data ): UPLCConst
    {
        return new UPLCConst( constT.data, data );
    }
}