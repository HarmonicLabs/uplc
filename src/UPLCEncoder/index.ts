
import { ConstType, ConstTyTag, isWellFormedConstType } from "../UPLCTerms/UPLCConst/ConstType";
import { ConstValue, isConstValue, isConstValueInt, isConstValueList } from "../UPLCTerms/UPLCConst/ConstValue";
import { getNRequiredForces, isUPLCBuiltinTag } from "../UPLCTerms/Builtin/UPLCBuiltinTag";
import { UPLCTerm, isPureUPLCTerm, PureUPLCTerm } from "../UPLCTerm/UPLCTerm";
import { UPLCProgram } from "../UPLCProgram/UPLCProgram";
import { UPLCVersion } from "../UPLCProgram/UPLCVersion";
import { Application } from "../UPLCTerms/Application";
import { Builtin } from "../UPLCTerms/Builtin/Builtin";
import { UPLCConst } from "../UPLCTerms/UPLCConst/UPLCConst";
import { Delay } from "../UPLCTerms/Delay";
import { ErrorUPLC } from "../UPLCTerms/ErrorUPLC";
import { Force } from "../UPLCTerms/Force";
import { Lambda } from "../UPLCTerms/Lambda";
import { UPLCVar } from "../UPLCTerms/UPLCVar";
import { UPLCSerializationContex } from "./UPLCSerializationContext";
import { fromHex, fromUtf8, toHex } from "@harmoniclabs/uint8array-utils";
import { BitStream } from "@harmoniclabs/bitstream";
import { ByteString } from "@harmoniclabs/bytestring";
import { CborString } from "@harmoniclabs/cbor";
import { Pair } from "@harmoniclabs/pair";
import { dataFromCbor, isData, Data, dataToCbor } from "@harmoniclabs/plutus-data";
import UPLCFlatUtils from "../utils/UPLCFlatUtils";
import { assert } from "../utils/assert";

/*
 * --------------------------- [encode vs serialize methods] ---------------------------
 *
 *  in the ```UPLCEncoder``` class are present various methods of which name starts with "encode" or "serialize"
 *  directly followed by the type of the expected argument.
 *
 *  all the "serialize" functions are **PURE**; meaning given the expected input those will return the output without executing side-effects;
 *
 *  all the "encode" methods have the side effect to update the context before and always return the equivalent of the "serialize" counterpart;
 *
 *  for this reason, when it is common the pattern
 *  ```ts
 *  encode( uplcObj: UPLC ): BitStream
 *  {
 *      const serialized = serilize( uplcObj );
 *      this._ctx.incrementLengthBy( serialized.length );
 *      return serialized;
 *  }
 *  ```
*/

function serializeUInt( uint: bigint ): BitStream
{
    return UPLCFlatUtils.encodeBigIntAsVariableLengthBitStream( BigInt( uint ) );
}

function serializeInt( int: bigint | number ): BitStream
{
    assert(
        typeof int === "number" || typeof int === "bigint",
        "'serializeInt' only works for Signed Integer; " +
        "try using int.toSigned() if you are using a derived class; inpout was: " + int
    )

    int = typeof int === "number" ? BigInt( int ) : int
    return serializeUInt(
        UPLCFlatUtils.zigzagBigint(
            int
        )
    );
}

function serializeVersion( version: UPLCVersion ): BitStream
{
    const result = serializeUInt( version.major );
    result.append( serializeUInt( version.minor ) );
    result.append( serializeUInt( version.patch ) );
    return result;
}

function serializeUPLCVar( uplcVar: UPLCVar ): BitStream
{
    const result = UPLCVar.UPLCTag;
    result.append(
        serializeUInt(
            // no idea why deBruijn indicies start form 1...s
            // can devs do something?
            uplcVar.deBruijn + BigInt( 1 )
        )
    );
    return result;
}

function serializeConstType( type: ConstType ): BitStream
{
    assert(
        isWellFormedConstType( type ),
        "cannot serialize an UPLC constant type if it is not well formed"
    );

    /**
     *
     * Source: plutus-core-specification-june2022.pdf; section D.3.3; page 31
     *
     *  We define the encoder and decoder for types by combining 𝖾 𝗍𝗒𝗉𝖾 and 𝖽 𝗍𝗒𝗉𝖾 with 𝖤
     *  and decoder for lists of four-bit integers (see Section D.2).
     * 
     * Section D.2 ( D.2.2 )
     * 
     * Suppose that we have a set 𝑋 for which we have defined an encoder 𝖤 𝑋 and a decoder 𝖣 𝑋 ; we define an
⃖⃗     * 𝑋 which encodes lists of elements of 𝑋 by emitting the encodings of the elements of the list,
     * encoder 𝖤
     * **each preceded by a 𝟷 bit, then emitting a 𝟶 bit to mark the end of the list.**
     * 
     */
    function _serializeConstTyTagToUPLCBinaryString( typeTag: ConstTyTag ): string
    {
        if( typeTag === ConstTyTag.list )
        {
            return (
                "1" + "0111" +              // cons + (7).toString(2).padStart( 4, '0' ) // type application
                "1" + "0101"                // cons + (5).toString(2).padStart( 4, '0' ) // list
                // "0"                        // nil // not needed (well formed) types do expects other tags after list
            );
        }
        else if( typeTag === ConstTyTag.pair )
        {
            return (
                "1" + "0111" + // cons + (7).toString(2).padStart( 4, '0' ) // type application
                "1" + "0111" + // cons + (7).toString(2).padStart( 4, '0' ) // type application
                "1" + "0110"   // cons + (5).toString(2).padStart( 4, '0' ) // pair
                // "0"            // nil // not needed (well formed) types do expects other tags after pairs
            );
        }
        else
        {
            return (
                "1" + typeTag.toString(2).padStart( 4, '0' )
            ); 
        }
    }

    return BitStream.fromBinStr(
        type.map( _serializeConstTyTagToUPLCBinaryString ).join('') + "0"
    );
}

/**
 * exported for testing purposes
 */
export function serializeBuiltin( bn: Builtin ): BitStream
{
    assert(
        isUPLCBuiltinTag( bn.tag ),
        "while serializing a Builtin 'bn.tag' is not a valid builtin tag: bn.tag: " + bn.tag
    );

    const result = BitStream.fromBinStr(
        "0101".repeat( getNRequiredForces( bn.tag ) ) // "force" tag repeated as necessary
    );

    result.append(
        Builtin.UPLCTag
    );
    
    result.append(
        BitStream.fromBinStr(
            bn.tag.toString(2).padStart( 7 , '0' ) // builtin tag takes 7 bits
        )
    );

    return result;
} 



// ------------------------------------------------------------------------------------------------------------------- //
// --------------------------------------------------- UPLCEncoder --------------------------------------------------- //
// ------------------------------------------------------------------------------------------------------------------- //

export class UPLCEncoder
{
    private _ctx: UPLCSerializationContex

    constructor()
    {
        this._ctx = new UPLCSerializationContex({
            currLength: 0
        });
    }

    compile( program: UPLCProgram ): BitStream
    {
        const v = program.version
        const result = this.encodeVersion( v );
        this._ctx.updateVersion( v );

        const uplc = program.body;

        if( !isPureUPLCTerm( uplc ) )
        {
            throw new Error(
                "'replaceHoisteTerm' did not return an 'UPLCTerm'"
            );
        }

        result.append(
            this.encodeTerm(
                uplc
            )
        );
        
        UPLCFlatUtils.padToByte( result );

        return result;
    }
    
    static get compile(): ( program: UPLCProgram ) => BitStream
    {
        return ( program: UPLCProgram ) => {
            return (new UPLCEncoder()).compile( program )
        };
    }

    encodeVersion( version: UPLCVersion ): BitStream
    {
        const serialized = serializeVersion( version );
        this._ctx.incrementLengthBy( serialized.length );
        return serialized;
    }

    encodeTerm( term: UPLCTerm ): BitStream
    {
        if( term instanceof UPLCVar )       return this.encodeUPLCVar( term );
        if( term instanceof Delay )         return this.encodeDelayTerm( term );
        if( term instanceof Lambda )        return this.encodeLambdaTerm( term );
        if( term instanceof Application )   return this.encodeApplicationTerm( term );
        if( term instanceof UPLCConst )     return this.encodeConstTerm( term );
        if( term instanceof Force )         return this.encodeForceTerm( term );
        if( term instanceof ErrorUPLC )     return this.encodeUPLCError( term );
        if( term instanceof Builtin )       return this.encodeBuiltin( term );

        throw new Error(
            "'UPLCEncoder.encodeTerm' did not match any 'PureUPLCTerm'"
        );
    }

    encodeUPLCVar( uplcVar: UPLCVar ): BitStream
    {
        const serialized = serializeUPLCVar( uplcVar );
        this._ctx.incrementLengthBy( serialized.length );
        return serialized;
    }

    encodeDelayTerm( delayed: Delay ): BitStream
    {
        const result = Delay.UPLCTag;
        this._ctx.incrementLengthBy( result.length );

        result.append(
            this.encodeTerm( delayed.delayedTerm )
        );

        return result;
    }

    encodeLambdaTerm( lam: Lambda ): BitStream
    {
        const result = Lambda.UPLCTag;
        this._ctx.incrementLengthBy( result.length );

        /*
        only the body of the lambda is encoded since the new variable is implicit
        this is not referencied in any current specification but it is present in the `plutus` source code:

        Here is where they called encode with the binder while encoding a Lambda Term

        https://github.com/input-output-hk/plutus/blob/c8d4364d0e639fef4d5b93f7d6c0912d992b54f9/plutus-core/untyped-plutus-core/src/UntypedPlutusCore/Core/Instance/Flat.hs#L110


        Here is where binder is defined

        https://github.com/input-output-hk/plutus/blob/c8d4364d0e639fef4d5b93f7d6c0912d992b54f9/plutus-core/plutus-core/src/PlutusCore/Core/Type.hs#L228


        And (most importantly) where flat encoding for binder is derived

        https://github.com/input-output-hk/plutus/blob/c8d4364d0e639fef4d5b93f7d6c0912d992b54f9/plutus-core/plutus-core/src/PlutusCore/Flat.hs#L354
        */
        result.append(
            this.encodeTerm(
                lam.body
            )
        );

        return result;
    }
    
    encodeApplicationTerm( app: Application ): BitStream
    {
        const result = Application.UPLCTag;
        this._ctx.incrementLengthBy( result.length );

        result.append(
            this.encodeTerm( app.funcTerm ) 
        );
    
        result.append(
            this.encodeTerm( app.argTerm )
        );
    
        return result;
    }

    encodeConstTerm( uplcConst: UPLCConst ): BitStream
    {
        const result = UPLCConst.UPLCTag
        
        result.append(
            serializeConstType(
                uplcConst.type
            )
        );

        // tag and type where both context indipendent
        this._ctx.incrementLengthBy( result.length );

        result.append(
            this.encodeConstValue(
                uplcConst.value
            )
        );

        return result;
    }

    encodeConstValue( value: ConstValue ): BitStream
    {
        assert(
            isConstValue( value ),
            "a 'ConstValue' instance was expected; got" + value
        );
    
        if( value === undefined ) return new BitStream();
        if( isConstValueInt( value ) ) 
        {
            const _i = serializeInt( value );
            // ints are always serialized in chunks of 8 bits
            // this should be irrelevant but still good to have
            this._ctx.incrementLengthBy( _i.length );
            return _i;
        }
        if( value instanceof ByteString &&
            (
                ByteString.isStrictInstance( value )
            )
        )
        {
            // padding is added based on context
            return this.encodeConstValueByteString( value )
        }
        if( typeof value === "string" )
        {
            /*
            Section D.2.6 Strings (page 28)
    
            We have defined values of the string type to be sequences of Unicode characters. As mentioned earlier
            we do not specify any particular internal representation of Unicode characters, but for serialisation we use
            the UTF-8 representation to convert between strings and bytestrings
            
            **and then use the bytestring encoder and decoder**:
            */
            return this.encodeConstValue(
                new ByteString(
                    fromUtf8( value )
                )
            );
        }
        if( typeof value === "boolean" )
        {
            const _b = BitStream.fromBinStr( value === true ? "1" : "0" );
            this._ctx.incrementLengthBy( _b.length );
            return _b;
        }
        if( isConstValueList( value ) )
        {
            const result: BitStream = new BitStream();
            
            /*
            operations on bigints (BitStream underlying type) are O(n)
            appending first to this BitStream and then to the effective result
            should give us some performace improvements
            */
            let listElem: BitStream;
    
            for( let i = 0; i < value.length; i++ )
            {
                // cons
                listElem = BitStream.fromBinStr("1");
                this._ctx.incrementLengthBy( 1 );

                // set list element
                listElem.append(
                    this.encodeConstValue(
                        value[i]
                    )
                );
                
                // append element
                // length already updated since using an "encode" function
                result.append( listElem );
            }

            // nil
            result.append(
                BitStream.fromBinStr("0")
            );
            this._ctx.incrementLengthBy( 1 );
    
            return result;
        }
        if( value instanceof Pair )
        {
            const result: BitStream = this.encodeConstValue( value.fst );
    
            result.append(
                this.encodeConstValue(
                    value.snd
                )
            );
    
            return result;
        }

        if( value instanceof CborString )
        {
            value = dataFromCbor( value );
        }
        if( isData( value ) )
        {
            return this.encodeConstValueData( value );
        }
    
        throw new Error(
            "'this.encodeConstValue' did not matched any 'ConstValue' possible type; input was: " + value
        );
    }

    /**
     * ### Section D.3.5
     * The ```data``` type
     * 
     * The 𝚍𝚊𝚝𝚊 type is encoded by converting to a bytestring using the CBOR encoding described in Note 1 of
     * Appendix B.2 and then using 𝖤 𝕌 ∗ . The decoding process is the opposite of this: a bytestring is obtained
     * using 𝖣 𝕌 ∗ and this is then decoded from CBOR to obtain a 𝚍𝚊𝚝𝚊 object.
     * 
     * ### Section B.2
     * 
     * **Note 1.** Serialising 𝚍𝚊𝚝𝚊 objects. The ```serialiseData``` function takes a 𝚍𝚊𝚝𝚊 object and converts it
     * into a CBOR (Bormann and Hoffman [2020]) object. The encoding is based on the Haskell Data type
     * described in Section A.1. A detailed description of the encoding will appear here at a later date, but for
     * the time being see the Haskell code in 
     * [plutus-core/plutus-core/src/PlutusCore/Data.hs](https://github.com/input-output-hk/plutus/blob/master/plutus-core/plutus-core/src/PlutusCore/Data.hs) 
     * ([```encodeData``` line](https://github.com/input-output-hk/plutus/blob/9ef6a65067893b4f9099215ff7947da00c5cd7ac/plutus-core/plutus-core/src/PlutusCore/Data.hs#L139))
     * in the Plutus GitHub repository IOHK [2019] for a definitive implementation.
     * 
     * from the `encodeData` source:
     * 
     * {- Note [The 64-byte limit]
     *    We impose a 64-byte *on-the-wire* limit on the leaves of a serialized 'Data'. This prevents people from inserting
     *    Mickey Mouse entire.
     *
     *    The simplest way of doing this is to check during deserialization that we never deserialize something that uses
     *    more than 64-bytes, and this is largely what we do. Then it's the user's problem to not produce something too big.
     *
     *    But this is quite inconvenient, so see Note [Evading the 64-byte limit] for how we get around this.
     * -}
     * {- Note [Evading the 64-byte limit]
     *  Implementing Note [The 64-byte limit] naively would be quite annoying:
     *  - Users would be responsible for not creating Data values with leaves that were too big.
     *  - If a script *required* such a thing (e.g. a counter that somehow got above 64 bytes), then the user is totally
     *  stuck: the script demands something they cannot represent.
     *
     *  This is unpleasant and introduces limits. Probably limits that nobody will hit, but it's nicer to just not have them.
     *  And it turns out that we can evade the problem with some clever encoding.
     *
     *  The fundamental
     *  trick is that an *indefinite-length* CBOR bytestring is just as obfuscated as a list of bytestrings,
     *  since it consists of a list of definite-length chunks, and each definite-length chunk must be *tagged* (at least with the size).
     *  So we get a sequence like:
     *
     *  <list start>
     *  <chunk length metadata>
     *  <chunk>
     *  <chunk length metadata>
     *  ...
     *  <list end>
     *
     *  The chunk length metadata has a prescribed format, such that it's difficult to manipulate it so that it
     *  matches your "desired" data.
     *  So this effectively breaks up the bytestring in much the same way as a list of <64 byte bytestrings.
     *
     *  So that solves the problem for bytestrings on the encoding side:
     *  - if they are <=64 bytes, we can just encode them as a normal bytestring
     *  - if they are >64 bytes, we encode them as indefinite-length bytestrings with 64-byte chunks
     *
     *  On the decoding side, we need to check when we decode that we never decode a definite-length
     *  bytestring of >64 bytes. That covers our two cases:
     *  - Short definite-length bytestrings are fine
     *  - Long indefinite-length bytestrings are just made of short definite-length bytestings.
     *
     *   *  Unfortunately this all means that we have to write our own encoders/decoders so we can produce
     *   *  chunks of the right size and check the sizes when we decode, but that's okay. Users need to do the same
     *   *  thing: anyone encoding `Data` with their own encoders who doesn't split up big bytestrings in this way
     *   *  will get failures when we decode them.
     *
     *  For integers, we have two cases. Small integers (<=64bits) can be encoded normally. Big integers are already
     *  encoded *with a byte string*. The spec allows this to be an indefinite-length bytestring (although cborg doesn't
     *  like it), so we can reuse our trick. Again, we need to write some manual encoders/decoders.
     *  -}
     */
    encodeConstValueData( data: Data ): BitStream
    {
        const cborBytes = dataToCbor( data ).toBuffer();

        // - if they are <=64 bytes, we can just encode them as a normal bytestring
        if( cborBytes.length <= 64 ) return this.encodeConstValueByteString( new ByteString( cborBytes ) );

        /*
        Large (>= 4 bytes) data encoding fixed in 1.1.0^

        - if they are >64 bytes, we encode them as indefinite-length bytestrings with 64-byte chunks
        */
        
        const head = cborBytes.at(0);
        if( head === undefined )
        throw new Error(
            "encoded Data was empty"
        );

        const lengthAddInfo = (head & 0b000_11111);

        let nLenBytes = 0;
        if( lengthAddInfo === 27 ) nLenBytes = 8;
        if( lengthAddInfo === 26 ) nLenBytes = 4;
        if( lengthAddInfo === 25 ) nLenBytes = 2;
        if( lengthAddInfo === 24 ) nLenBytes = 1;

        let ptr = 0;

        let largeCborData = "5f";

        while( ptr < cborBytes.length )
        {
            const chunkSize = Math.min( 64, cborBytes.length - ptr );
            const chunkEnd = ptr + chunkSize;

            let header = "";
            if( chunkSize < 24 ) header = (0b010_00000 | chunkSize).toString(16).padStart(2,"0");
            else header = "58" + chunkSize.toString(16).padStart(2,"0");

            largeCborData = largeCborData +
                header +
                toHex( cborBytes.subarray( ptr, chunkEnd ) );
            
            ptr = chunkEnd;
        }

        return this.encodeConstValueByteString( new ByteString( fromHex( largeCborData + "ff" ) ) );
    }

    /**
     * latest specification (**_section D.2.5 Bytestrings; page 27_**)
     * specifies how bytestrings are byte-alligned before and the first byte indicates the length
     * 
     * **this function takes care of the length AND padding**
     * 
     */
    encodeConstValueByteString( bs: ByteString ): BitStream
    {
        let missingBytes = bs.toString();

        const hexChunks: string[] = [];

        while( (missingBytes.length / 2) > 0b1111_1111 )
        {
            hexChunks.push( "ff" + missingBytes.slice( 0, 255 * 2 ) );
            missingBytes = missingBytes.slice( 255 * 2 );
        }

        if( missingBytes.length !== 0 )
        {
            hexChunks.push(
                (missingBytes.length / 2).toString(16).padStart( 2, '0' ) +
                missingBytes
            );
        }
        
        // end chunk
        hexChunks.push( "00" );

        const nPadBits = 8 - (this._ctx.currLength % 8);

        // add initial padding as needed by context
        const result = BitStream.fromBinStr(
            "1".padStart( nPadBits , '0' )
        );

        // append chunks
        result.append(
            new BitStream(
                fromHex(
                    hexChunks.join('')
                ),
                0
            )
        );

        this._ctx.incrementLengthBy( result.length );

        return result; 
    }

    encodeForceTerm( force: Force ): BitStream
    {
        if( force.termToForce instanceof Delay )
        {
            // cancels direct delays
            return this.encodeTerm( force.termToForce.delayedTerm );
        }

        const result = Force.UPLCTag;
        this._ctx.incrementLengthBy( result.length );

        result.append(
            this.encodeTerm(
                force.termToForce
            )
        )

        return result;
    }

    encodeUPLCError( _term: ErrorUPLC ): BitStream
    {
        const errTag = ErrorUPLC.UPLCTag
        this._ctx.incrementLengthBy( errTag.length );
        return errTag.clone();
    }

    encodeBuiltin( bn: Builtin ): BitStream
    {
        const result = serializeBuiltin( bn );
        this._ctx.incrementLengthBy( result.length );
        return result;
    }
}

export function compileUPLC( program: UPLCProgram ): BitStream
{
    return (new UPLCEncoder()).compile( program );
}

/**
 * alias for `compileUPLC`
 */
export const encodeUPLC = compileUPLC;