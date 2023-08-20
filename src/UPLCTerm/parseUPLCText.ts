import { ByteString } from "@harmoniclabs/bytestring";
import { Application, Builtin, ConstTyTag, ConstType, ConstValue, ConstValueList, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCVar, builtinTagFromString, constListTypeUtils, constPairTypeUtils, constT, constTypeEq, eqConstValue, getNRequiredForces } from "../UPLCTerms";
import { UPLCTerm } from "./UPLCTerm";
import { dataFromCbor } from "@harmoniclabs/plutus-data";
import { Pair } from "@harmoniclabs/pair";


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
    dbn: number
): { term: UPLCTerm, offset: number }
{
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
        let fstSpaceIdx = s.indexOf(" ");
        if( fstSpaceIdx < 0 )
        {
            fstSpaceIdx = s.indexOf("\n");
            if( fstSpaceIdx < 0 )
            {
                fstSpaceIdx = str.length - 1; 
            }
        }
        let varName = s.slice( 0, fstSpaceIdx ).trim();
        
        while( 
            varName.endsWith(")")   || 
            varName.endsWith("]")   ||
            varName.endsWith(" ")   ||
            varName.endsWith("\n")
        )
        varName = varName.slice( 0, varName.length - 1 );

        return varName;
    }

    sliceTrimIncr( 0 );

    const ch = str[0];
    // drop the opening bracket;

    if( ch === "[")
    {
        sliceTrimIncr( 1 )
        offset += getOffsetToNextClosingBracket( str, "[", "]" );

        const fn = _parseUPLCText( str, env, dbn );
        
        str = str.slice( fn.offset + 1 );

        const arg = _parseUPLCText( str, env, dbn );

        return {
            term: new Application( fn.term, arg.term ),
            offset
        }
    }

    if( ch === "(" )
    {
        sliceTrimIncr( 1 );     
        offset += getOffsetToNextClosingBracket( str, "(", ")" );

        if( str.startsWith("error") )
        {
            return {
                term: new ErrorUPLC(),
                offset
            };
        }
        if( str.startsWith("delay") )
        {
            return {
                term: new Delay(
                    _parseUPLCText( str.slice( 5 ), env, dbn ).term
                ),
                offset
            };
        }
        if( str.startsWith("force") )
        {
            const directChild = _parseUPLCText( str.slice( 5 ), env, dbn ).term;

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
            str = str.slice(3).trimStart();

            const varName = getNextWord();
            str = str.slice( varName.length ).trimStart();

            env[varName] = dbn;

            return {
                term: new Lambda(
                    _parseUPLCText( str, env, dbn + 1 ).term
                ),
                offset
            };
        }

        if( str.startsWith("con") )
        {
            str = str.slice(3).trimStart();

            const t = parseConstType( str );

            str = str.slice( t.offset ).trimStart();

            const v = parseConstValueOfType( str, t.type );

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
        console.log( env, `"${varName}"`, Object.keys( env )[0] === varName )
        throwIllFormed()
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
        const endInteger = str.indexOf(" ");
        const value = parseInt( str.slice( 0 , endInteger ) )
        sliceTrimIncr( endInteger + 1 );
        return {
            value,
            offset
        };
    }
    if( constTypeEq( t, constT.str ) )
    {
        sliceTrimIncr( str.indexOf('"') + 1 );
        const closingQuoteIdx = str.indexOf('"');
        const value = str.slice( 0, closingQuoteIdx );
        sliceTrimIncr( closingQuoteIdx + 1 );
        return {
            value,
            offset
        };
    }
    if( constTypeEq( t, constT.bool ) )
    {
        const value = str.startsWith("True") ? true : false;
        sliceTrimIncr( value ? 4 : 5 );
        return {
            value,
            offset
        };
    }
    if( constTypeEq( t, constT.byteStr ) )
    {
        sliceTrimIncr( str.indexOf("#") + 1 );
        let i = 0;
        while( isHexChar( str[ i++ ] ) );
        i--; // last char is not hex
        const hex = str.slice( 0, i );
        sliceTrimIncr( i );
        return {
            value: new ByteString( hex ),
            offset
        };
    }
    if( constTypeEq( t, constT.data ) )
    {
        sliceTrimIncr( str.indexOf("#") + 1 );
        let i = 0;
        while( isHexChar( str[ i++ ] ) );
        i--; // last char is not hex
        const hex = str.slice( 0, i );
        sliceTrimIncr( i );
        return {
            value: dataFromCbor( hex ),
            offset
        };
    }
    if( t[0] === ConstTyTag.pair )
    {
        sliceTrimIncr( str.indexOf("(") + 1 );
        const fst = parseConstValueOfType( 
            str, 
            constPairTypeUtils.getFirstTypeArgument( t )
        );
        sliceTrimIncr( fst.offset );
        sliceTrimIncr( str.indexOf(",") + 1 );
        
        const snd = parseConstValueOfType( 
            str, 
            constPairTypeUtils.getSecondTypeArgument( t )
        );

        sliceTrimIncr( snd.offset );
        sliceTrimIncr( str.indexOf(")") + 1 );

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
    if( str.startsWith("boolean") )
    {
        sliceTrimIncr( 7 );
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

    if( str.startsWith("list") )
    {
        const fstValidIndex = str.indexOf("(") + 1;
        if( fstValidIndex < 1 )
        throw new Error("invalid uplc contant type")

        sliceTrimIncr( fstValidIndex );

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

    if( str.startsWith("pair") )
    {
        const fstValidIndex = str.indexOf("(") + 1;
        if( fstValidIndex < 1 )
        throw new Error("invalid uplc contant type")

        sliceTrimIncr( fstValidIndex );
        
        const fst = parseConstType( str );
        sliceTrimIncr( fst.offset );

        while(
            str.startsWith(",")     ||
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

    throw new Error("unknown UPLC const type")
}

export function parseUPLCText( str: string ): UPLCTerm
{
    return _parseUPLCText( str, {}, 0 ).term;
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