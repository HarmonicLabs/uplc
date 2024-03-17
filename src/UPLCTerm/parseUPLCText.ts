import { ByteString } from "@harmoniclabs/bytestring";
import { Application, Builtin, Case, ConstTyTag, ConstType, ConstValue, ConstValueList, Constr, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCVar, builtinTagFromString, constListTypeUtils, constPairTypeUtils, constT, constTypeEq, constTypeToStirng, eqConstValue, getNRequiredForces } from "../UPLCTerms";
import { UPLCTerm } from "./UPLCTerm";
import { Data, dataFromCbor, dataFromString } from "@harmoniclabs/plutus-data";
import { Pair } from "@harmoniclabs/pair";
import { bls12_381_G1_uncompress, bls12_381_G2_uncompress } from "@harmoniclabs/crypto";
import { fromHex } from "@harmoniclabs/uint8array-utils";
import { indexOfNextCommaOutsideParentesis } from "../utils/indexOfNextCommaOutsideParentesis";
import { indexOfNextUnmatchedParentesis } from "../utils/indexOfNextUnmatchedParentesis";
import { getTextBetweenMatchingQuotes } from "../utils/getTextBetweenMatchingQuotes";
import { indexOfMany } from "../utils/indexOfMany";
import { off } from "process";
import { UPLCVersion, defaultUplcVersion } from "../UPLCProgram";


/*
function _showUPLC( t: UPLCTerm, dbn: number ): string
{
    if( t instanceof UPLCVar )
    {
        return getVarNameForDbn( dbn - 1 - Number( t.deBruijn ) )
    }
    if( t instanceof Delay ) return `(delay ${ _showUPLC( t.delayedTerm, dbn ) })`;
    if( t instanceof Lambda ) 
    {
        return `(lam ${getVarNameForDbn( dbn )} ${ _showUPLC( t.body, dbn + 1 ) })`;
    }
    if( t instanceof Application ) return `[${ _showUPLC( t.funcTerm, dbn ) } ${ _showUPLC( t.argTerm, dbn ) }]`;
    if( t instanceof UPLCConst ) return `(con ${showConstType(t.type)} ${ showUPLCConstValue( t.value ) })`;
    if( t instanceof Force ) return `(force ${ _showUPLC( t.termToForce, dbn ) })`;
    if( t instanceof ErrorUPLC ) return "(error)";
    if( t instanceof Builtin )
    {
        const nForces = getNRequiredForces( t.tag );

        return "(force ".repeat( nForces ) +`(builtin ${builtinTagToString( t.tag )})` + ')'.repeat( nForces )
    }
    
    return "";
}
*/

type ParseUPLCTextEnv = { [x: string]: number };


export function _parseUPLCText(
    str: string,
    env: ParseUPLCTextEnv,
    dbn: number,
    version: UPLCVersion
): { term: UPLCTerm, offset: number }
{
    // clone (other branches migh modify vars dbns)
    env = { ...env };
    let offset = 0;

    const sliceTrimIncr = ( n: number = 0 ): void => {
        let tmp = str.length;
        str = str.slice( n ).trimStart();
        offset += tmp - str.length;
    }
    
    const throwIllFormed = () : never => {
        // console.error( str );
        throw new Error("ill formed uplc text");
    }

    const getNextWord = ( s: string = str ): string => {
        let fstSpaceIdx = s.search(/\s/);
        if( fstSpaceIdx < 0 ) fstSpaceIdx = str.length - 1;
        let varName = s.slice( 0, fstSpaceIdx ).trim();
        
        while( 
            varName.endsWith(")")   || 
            varName.endsWith("]")   ||
            varName.endsWith(" ")   ||
            varName.endsWith("\n")
        ){
            varName = varName.slice( 0, varName.length - 1 );
        }

        return varName;
    }

    sliceTrimIncr( 0 );


    const ch = str[0];
    // drop the opening bracket;

    if( ch === "[")
    {
        sliceTrimIncr( 1 )
        offset += getOffsetToNextClosingBracket( str, "[", "]" );

        const fn = _parseUPLCText( str, env, dbn, version );
        
        str = str.slice( fn.offset + 1 );

        const arg = _parseUPLCText( str, env, dbn, version );

        return {
            term: new Application( fn.term, arg.term ),
            offset
        }
    }

    if( ch === "(" )
    {
        sliceTrimIncr( 1 );     
        
        if( str.startsWith("error") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            return {
                term: new ErrorUPLC(),
                offset
            };
        }
        if( str.startsWith("delay") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            return {
                term: new Delay(
                    _parseUPLCText( str.slice( 5 ), env, dbn, version).term
                ),
                offset
            };
        }
        if( str.startsWith("force") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            const directChild = _parseUPLCText( str.slice( 5 ), env, dbn, version ).term;

            if(
                directChild instanceof Builtin &&
                getNRequiredForces( directChild.tag ) === 1
            ) return {
                term: directChild,
                offset
            }

            if(
                directChild instanceof Force &&
                directChild.termToForce instanceof Builtin &&
                getNRequiredForces( directChild.termToForce.tag ) === 2
            ) return {
                term: directChild.termToForce,
                offset
            };

            return {
                term: new Force( directChild ),
                offset
            };
        }
        if( str.startsWith("builtin") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            str = str.slice( 7 ).trimStart();
            return {
                term: new Builtin(
                    builtinTagFromString( getNextWord() )
                ),
                offset
            };
        }

        if( str.startsWith("lam") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            str = str.slice(3).trimStart();

            const varName = getNextWord();
            str = str.slice( varName.length ).trimStart();

            env[varName] = dbn;

            return {
                term: new Lambda(
                    _parseUPLCText( str, env, dbn + 1, version ).term
                ),
                offset
            };
        }
        
        if( str.startsWith("case") )
        {
            if( !version.isV3Friendly() )
                throw new Error("case uplc node found on program version: " + version.toString() );

            sliceTrimIncr( 4 );
            const closeIdx = indexOfNextUnmatchedParentesis( str );
            str = str.slice( 0, closeIdx ).trim();
            
            const terms: UPLCTerm[] = [];
            while( str.length > 0 )
            {
                const { term, offset } = _parseUPLCText( str, env, dbn, version );
                terms.push( term );
                str = str.slice( offset ).trim();
            }
        
            if( terms.length < 1 )
                throw new Error("ill formed uplc, missing constr term on case");
            
            return {
                term: new Case(
                    terms.shift()!,
                    terms
                ),
                offset: offset + closeIdx + 1
            };
        }

        // "constr" MUST BE before "con"
        if( str.startsWith("constr") )
        {
            if( !version.isV3Friendly() )
                throw new Error("case uplc node found on program version: " + version.toString() );

            sliceTrimIncr( 6 );
            const closeIdx = indexOfNextUnmatchedParentesis( str );
            str = str.slice( 0, closeIdx );
            const { value: idx, offset: idxOffset } = parseConstValueOfType( str, constT.int );
            str = str.slice( idxOffset );
            if( typeof idx !== "bigint" ) throw new Error("ill formed uplc; constr expects u64 index");
            const terms: UPLCTerm[] = [];
            str = str.trim();
            while( str.length > 0 )
            {
                const { term, offset } = _parseUPLCText( str, env, dbn, version );
                terms.push( term );
                str = str.slice( offset ).trim();
            }
            return {
                term: new Constr(
                    idx,
                    terms
                ),
                offset: offset + closeIdx + 1
            };
        }

        if( str.startsWith("con") )
        {
            offset += getOffsetToNextClosingBracket( str, "(", ")" );
            str = str.slice( 3 ).trimStart();

            const t = parseConstType( str );
            
            str = str.slice( t.offset ).trimStart();

            const v = parseConstValueOfType( str, t.type );
            str = str.slice( v.offset ).trimStart();

            return {
                term: new UPLCConst( t.type as any, v.value as any ),
                offset
            };
        }
    }

    // else var
    offset--;
    const varName = getNextWord();
    offset += varName.length;
    
    if( varName.startsWith("-") )
    { // out of bound var
        return {
            term: new UPLCVar( dbn + parseInt( varName.slice(1) ) - 1 ),
            offset
        }
    }
    const varDbn = env[ varName ];
    if( varDbn === undefined )
    {
        // console.log( env, `"${varName}"`, Object.keys( env )[0] === varName )
        // throwIllFormed();
        throw new Error("unbound variable found");
    }

    return {
        term: new UPLCVar( dbn - 1 - varDbn ),
        offset
    };
}

const hexChars = Array.from("0123456789abcdef");

function isHexChar( ch: string ): boolean
{
    return hexChars.includes( ch[0].toLowerCase() );
}

function isLowestNonNegative( a: number, b: number ):  boolean
{
    return a >= 0 && (b < 0 || a < b);
}

export function parseConstValueOfType(
    str: string,
    t: ConstType
): {
    value: ConstValue,
    offset: number
}
{
    let offset = 0;

    const sliceTrimIncr = ( n: number = 0 ): void => {
        let tmp = str.length;
        str = str.slice( n ).trimStart();
        offset += tmp - str.length;
    }

    sliceTrimIncr( 0 );
    
    if( constTypeEq( t, constT.unit ) )
    {
        sliceTrimIncr( str.indexOf("()") + 2 );
        return {
            value: undefined,
            offset
        };
    }
    if( constTypeEq( t, constT.int ) )
    {
        const closeIndex = str.indexOf(")");
        const regExpRes = str
            .slice( 0, closeIndex < 0 ? undefined : closeIndex )
            // \+?\-?           -> may or may nost start with "+" or "-"
            // (?<!\.)          -> MUST NOT have dots before
            // (?<!(#|x)\d*)    -> MUST NOT have before "#" or "x" with 0 or more digits (escluded bls elements and bytestrings)
            // \d+              -> one or more digits
            // (?!(\.|x))       -> MUST NOT have dots after or "x" (x excludes "0x" which are bls elems)
            .match(/\+?\-?(?<!\.)(?<!(#|x)\d*)\d+(?!(\.|x))/);
        if( regExpRes === null )
        throw new Error("could not find integer for constant uplc");
        
        const nStr = regExpRes[0];
        const value = BigInt( nStr );
        sliceTrimIncr( str.indexOf( nStr ) + nStr.length );
        
        return {
            value,
            offset
        };
    }
    if( constTypeEq( t, constT.str ) )
    {
        const quoteIdx = str.indexOf('"');
        if( !/^\s*$/.test( str.slice( 0, quoteIdx ) ) ) throw new Error("ill formed uplc");

        sliceTrimIncr( quoteIdx );
        const value = getTextBetweenMatchingQuotes( str );

        if( typeof value !== "string" )
        throw new Error("missing constant string value");
        
        sliceTrimIncr( value.length + 2 );
        return {
            value,
            offset
        };
    }
    if( constTypeEq( t, constT.bool ) )
    {
        const trueIdx = str.indexOf("True");
        const falseIdx = str.indexOf("False");
        if( trueIdx < 0 && falseIdx < 0 ) throw new Error("expected boolean value; found none");

        const isTrue  = isLowestNonNegative( trueIdx, falseIdx );
        
        if( isTrue )
        {
            sliceTrimIncr( trueIdx + 4 );
            return {
                value: true,
                offset
            }
        }
        else
        {
            sliceTrimIncr( falseIdx + 5 );
            return {
                value: false,
                offset
            }
        }
    }
    if( constTypeEq( t, constT.byteStr ) )
    {
        sliceTrimIncr( str.indexOf("#") + 1 );
        let i = 0;
        while( i < str.length && isHexChar( str[ i++ ] ) );
        !isHexChar( str[i-1] ) && i--;
        const hex = str.slice( 0, i );

        // we can handle it but plutus conformance doesn't allow it
        if( hex.length % 2 === 1 )
        {
            throw new Error("invalid bytestring value: received: " + hex);
        }

        sliceTrimIncr( i );
        return {
            value: new ByteString( hex ),
            offset
        };
    }
    if( constTypeEq( t, constT.data ) )
    {
        sliceTrimIncr( 0 );
        const { data, offset: dataOffset } = dataFromStringWithOffset( str );
        offset += dataOffset;
        return {
            value: data,
            offset
        };
    }
    if( constTypeEq( t, constT.bls12_381_G1_element ) )
    {
        const original = str;
        str = str.slice( 0, str.indexOf(")") + 1 ).trimStart();
        offset += (original.length - original.indexOf( str )) + 2 /*0x*/ + 96 ;

        const match = str.match(/^0x[0-9a-fA-F]{96}(?![0-9a-fA-F]+)/);// 48 bytes; 96 hex chars
        if( !match ) throw new Error("missing bls g1 compressed elem");

        const value = bls12_381_G1_uncompress(
            fromHex( match[0].slice(2) )
        );
        return { value, offset };
    }
    if( constTypeEq( t, constT.bls12_381_G2_element ) )
    {
        const original = str;
        str = str.slice( 0, str.indexOf(")") + 1 ).trimStart();
        offset += (original.length - original.indexOf( str )) + 2 /*0x*/ + 192 ;

        const match = str.match(/^0x[0-9a-fA-F]{192}(?![0-9a-fA-F]+)/);// 96 bytes; 192 hex chars
        if( !match ) throw new Error("missing bls g2 compressed elem");
        
        const value = bls12_381_G2_uncompress(
            fromHex( match[0].slice(2) )
        );
        return { value, offset };
    }
    if( constTypeEq( t, constT.bls12_381_MlResult ) )
    {
        throw new Error("bls12_381_MlResult const type not supported");
    }

    if( t[0] === ConstTyTag.pair )
    {
        sliceTrimIncr( str.indexOf("(") + 1 );
        
        const commaIdx = indexOfNextCommaOutsideParentesis( str );
        const fst = parseConstValueOfType( 
            str.slice( 0, commaIdx ), 
            constPairTypeUtils.getFirstTypeArgument( t )
        );
        sliceTrimIncr( commaIdx + 1 );
        
        const closeIdx = indexOfNextUnmatchedParentesis( str );
        const snd = parseConstValueOfType( 
            str.slice( 0, closeIdx ), 
            constPairTypeUtils.getSecondTypeArgument( t )
        );
        sliceTrimIncr( closeIdx + 1 );

        return {
            value: new Pair( fst.value, snd.value ),
            offset
        };
    }

    if( t[0] === ConstTyTag.list )
    {
        sliceTrimIncr( str.indexOf("[") + 1 );
        const elemsT = constListTypeUtils.getTypeArgument( t as any );
        const elems: ConstValue[] = [];
        while( !str.startsWith("]") )
        {
            const elem = parseConstValueOfType( str, elemsT );
            sliceTrimIncr( elem.offset );
            sliceTrimIncr( str.indexOf(",") + 1 );
            elems.push( elem.value );
        }

        return {
            value: elems as ConstValueList,
            offset
        };
    }

    throw new Error("unknown const type")
}

export function parseConstType( str: string ): { type: ConstType, offset: number }
{
    let offset = 0;

    const sliceTrimIncr= ( n: number = 0 ): void => {
        let tmp = str.length;
        str = str.slice( n ).trimStart();
        offset += tmp - str.length;
    }

    sliceTrimIncr( 0 );

    if( str.startsWith("integer") )
    {
        sliceTrimIncr( 7 );
        return {
            type: constT.int,
            offset
        };
    }
    if( str.startsWith("bytestring") )
    {
        sliceTrimIncr( 10 );
        return {
            type: constT.byteStr,
            offset
        };
    }
    if( str.startsWith("string") )
    {
        sliceTrimIncr( 6 );
        return {
            type: constT.str,
            offset
        };
    }
    if( str.startsWith("unit") )
    {
        sliceTrimIncr( 4 );
        return {
            type: constT.unit,
            offset
        };
    }
    if( str.startsWith("bool") )
    {
        if( str.startsWith("boolean") ) sliceTrimIncr( 7 );
        else sliceTrimIncr( 4 );

        return {
            type: constT.bool,
            offset
        };
    }
    if( str.startsWith("data") )
    {
        sliceTrimIncr( 4 );
        return {
            type: constT.data,
            offset
        };
    }

    if( str.startsWith("bls12_381_G1_element") )
    {
        sliceTrimIncr("bls12_381_G1_element".length);
        return {
            type: constT.bls12_381_G1_element,
            offset
        };
    }
    if( str.startsWith("bls12_381_G2_element") )
    {
        sliceTrimIncr("bls12_381_G2_element".length);
        return {
            type: constT.bls12_381_G2_element,
            offset
        };
    }
    if( str.startsWith("bls12_381_MlResult") )
    throw new Error("bls12_381_MlResult const not supported in textual UPLC");

    if( str.startsWith("(") )
    {
        sliceTrimIncr( 1 );

        const listIdx = str.indexOf("list");
        const pairIdx = str.indexOf("pair");

        if( listIdx < 0 && pairIdx < 0 )
        throw new Error(
            "invalid constant type; expected list or pair"
        );

        const isList = isLowestNonNegative( listIdx, pairIdx );
        const isPair = isLowestNonNegative( pairIdx, listIdx );

        if( isList )
        {
            sliceTrimIncr( listIdx + 4 );
    
            const elems = parseConstType( str );
            sliceTrimIncr( elems.offset );
    
            while(
                !str.startsWith(")")
            ) sliceTrimIncr( 1 );
    
            sliceTrimIncr( 1 );
    
            return {
                type: constT.listOf( elems.type ),
                offset
            }
        }
        else if( isPair )
        {
            sliceTrimIncr( pairIdx + 4 );
            
            const fst = parseConstType( str );
            sliceTrimIncr( fst.offset );
    
            while(
                str.startsWith(" ")     ||
                str.startsWith("\n")
            ) sliceTrimIncr( 1 );
    
            const snd = parseConstType( str );
            sliceTrimIncr( snd.offset );    
    
            while(
                !str.startsWith(")")
            ) sliceTrimIncr( 1 );
    
            sliceTrimIncr( 1 );
    
            return {
                type: constT.pairOf( fst.type, snd.type ),
                offset
            }
        }
        else
        {
            console.log( str, listIdx, pairIdx );     
            throw new Error(
                "invalid constant type; missing list or pair"
            );
        }
    }

    throw new Error("unknown UPLC const type; src: " + str);
}

export function parseUPLCText( str: string, version: UPLCVersion = defaultUplcVersion ): UPLCTerm
{
    str = str.trim();
    if( str.startsWith("(program") )
    {
        str = str.slice( 8, str.lastIndexOf(")") ).trim();
        const verStr = str.match(/^\d+\.\d+\.\d+(?!\.)/);
        if( !verStr ) throw new Error("uplc program without version");
        version = UPLCVersion.fromString( verStr[0] );
        str = str.slice( indexOfMany( str, "(", "[" ) );
    }
    version = version instanceof UPLCVersion ? version : defaultUplcVersion;
    return _parseUPLCText( str, {}, 0, version ).term;
}

/**
 * 
 * @param {string} str string removed of the first opening bracket
 * @example
 * ```ts
 * const str = "( hello )";
 * const expectedInput = str.slice(1); // " hello )"; 
 * const offset = getOffsetToNextClosingBracket( expectedInput ); // 8
 * ```
 * @returns 
 */
export function getOffsetToNextClosingBracket(
    str: string, 
    openCh:  "(" | "[" = "(",
    closeCh: ")" | "]" = ")"
): number
{
    let nBrackets = 1;
    let offset = 0;
    let ch = '';

    while( nBrackets > 0 )
    {
        ch = str[offset++];

        if( ch === openCh )
        {
            nBrackets++;
            continue;
        }
        if( ch === closeCh )
        {
            nBrackets--;
            continue;
        }
    }

    return offset;
}

// we have `dataFromString` from "@harmoniclabs/plutus-data"
// but no way to reliably retreive the offset
// seo
function dataFromStringWithOffset( str: string ): { data: Data, offset: number }
{
    const original = str;
    const openIdx = str.indexOf("(");
    if( openIdx < 0 ) throw new Error("missign opening wrapping parentesis for data");
    str = str.slice( openIdx + 1 );
    let offset = original.length - str.length;
    const closeIdx = indexOfNextUnmatchedParentesis( str );
    if( closeIdx < 0 ) throw new Error("missign closing wrapping parentesis for data");
    offset += closeIdx + 1;
    return {
        data: dataFromString( str.slice( 0, closeIdx ).trim() ),
        offset
    }
}