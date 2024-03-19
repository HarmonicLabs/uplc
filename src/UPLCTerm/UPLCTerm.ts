import { UPLCVar } from "../UPLCTerms/UPLCVar";
import { Delay } from "../UPLCTerms/Delay";
import { Lambda } from "../UPLCTerms/Lambda";
import { Application } from "../UPLCTerms/Application";
import { UPLCConst } from "../UPLCTerms/UPLCConst/UPLCConst";
import { Force } from "../UPLCTerms/Force";
import { ErrorUPLC } from "../UPLCTerms/ErrorUPLC";
import { Builtin } from "../UPLCTerms/Builtin/Builtin";
import { ConstType, constListTypeUtils, constPairTypeUtils, constTypeToStirng, ConstTyTag, constTypeEq } from "../UPLCTerms/UPLCConst/ConstType";
import { builtinTagToString, getNRequiredForces } from "../UPLCTerms/Builtin/UPLCBuiltinTag";
import { ConstValue, canConstValueBeOfConstType, eqConstValue, isConstValueInt } from "../UPLCTerms/UPLCConst/ConstValue";
import { ByteString } from "@harmoniclabs/bytestring";
import { Pair } from "@harmoniclabs/pair";
import { isData, dataToCbor } from "@harmoniclabs/plutus-data";
import { assert } from "../utils/assert";
import { Constr } from "../UPLCTerms/Constr";
import { Case } from "../UPLCTerms/Case";
import { bls12_381_G1_compress, bls12_381_G2_compress, isBlsG1, isBlsG2, isBlsResult } from "@harmoniclabs/crypto";
import { toHex } from "@harmoniclabs/uint8array-utils";

export type UPLCTerm 
    = UPLCVar
    | Delay
    | Lambda
    | Application
    | UPLCConst
    | Force
    | ErrorUPLC
    | Builtin
    | Constr
    | Case;
    
/**
 * @deprecated alias for `UPLCTerm` use that instead
 */
export type PureUPLCTerm = UPLCTerm;

/**
 * **_O(1)_**
 * @param {UPLCTerm} t ```UPLCTerm``` to check 
 * @returns {boolean} ```true``` if the argument is instance of any of the ```UPLCTerm``` constructors, ```false``` otherwise
 */
export function isUPLCTerm( t: object ): t is UPLCTerm
{
    // only strict instances
    return (
        t instanceof UPLCVar        ||
        t instanceof Delay          ||
        t instanceof Lambda         ||
        t instanceof Application    ||
        t instanceof UPLCConst      ||
        t instanceof Force          ||
        t instanceof ErrorUPLC      ||
        t instanceof Builtin        ||
        t instanceof Constr         ||
        t instanceof Case
    );
}

/**
 * **_O(n)_**
 * @param {UPLCTerm} t ```UPLCTerm``` to check 
 * @returns {boolean} ```true``` if the AST contains only plutus-core terms, ```false``` otherwise
 */
export function isPureUPLCTerm( t: UPLCTerm ): t is PureUPLCTerm
{
    if( !isUPLCTerm( t ) ) return false;

    if( t instanceof UPLCVar )      return true;
    if( t instanceof Delay )        return isPureUPLCTerm( t.delayedTerm );
    if( t instanceof Lambda )       return isPureUPLCTerm( t.body );
    if( t instanceof Application )  return ( isPureUPLCTerm( t.argTerm ) && isPureUPLCTerm( t.funcTerm ) );
    if( t instanceof UPLCConst )    return true;
    if( t instanceof Force )        return isPureUPLCTerm( t.termToForce );
    if( t instanceof ErrorUPLC )    return true;
    if( t instanceof Builtin )      return true;
    if( t instanceof Constr )       return t.terms.every( isPureUPLCTerm );
    if( t instanceof Case )         return isPureUPLCTerm( t.constrTerm ) && t.continuations.every( isPureUPLCTerm );

    return false;
}

function _isClosedTerm( maxDeBruijn: bigint, t: UPLCTerm ): boolean
{
    assert(
        isUPLCTerm( t ),
        "'isClosedTerm' functions only works on **raw** UPLCTerms"
    );

    if( t instanceof UPLCVar )
        // deBruijn variables are 0 indexed (as arrays)
        return maxDeBruijn > t.deBruijn;

    else if( t instanceof Delay )
        return _isClosedTerm( maxDeBruijn , t.delayedTerm );
    
    else if( t instanceof Lambda )
        // increment max debruijn
        return _isClosedTerm( maxDeBruijn + BigInt( 1 ), t.body );

    else if( t instanceof Application )
        return _isClosedTerm( maxDeBruijn , t.funcTerm ) && _isClosedTerm( maxDeBruijn , t.argTerm )
    
    else if( t instanceof UPLCConst )
        // `UPLCConst` has no variables in it, ence always closed
        return true;
    
    else if( t instanceof Force )
        return _isClosedTerm( maxDeBruijn, t.termToForce );

    else if( t instanceof ErrorUPLC )
        // `ErrorUPLC` has no variables in it, ence always closed
        return true;

    else if( t instanceof Builtin )
        // builtin per-se is just the function (ence a valid value),
        // arguments are passed using the `Apply` Term
        // so it is the `t instanceof Apply` case job
        // to be sure the arguments are closed
        return true;

    else if( t instanceof Constr )
        return t.terms.every( term => _isClosedTerm( maxDeBruijn, term ) );

    else if( t instanceof Case )
        return (
            _isClosedTerm( maxDeBruijn, t.constrTerm ) &&
            t.continuations.every( term => _isClosedTerm( maxDeBruijn, term ) )
        );
        
    else
        throw new Error(
            "unexpected execution flow in 'isClodeTerm'; all possibilieties should have already been handled; input term is: " + (t as any).toString()
        )

}
export function isClosedTerm( term: UPLCTerm ): boolean
{
    return _isClosedTerm( BigInt( 0 ), term );
}

export function showUPLCConstValue( v: ConstValue ): string
{
    if( v === undefined ) return "()";
    if( isConstValueInt( v ) ) return v.toString();
    if( typeof v === "string" ) return `"${v}"`;
    if( typeof v === "boolean" )  return v ? "True" : "False";
    if( v instanceof ByteString ) return "#" + v.toString();
    if( isData( v ) ) return v.toString();

    if( isBlsG1( v ) ) return `0x${toHex(bls12_381_G1_compress( v ))}`;
    if( isBlsG2( v ) ) return `0x${toHex(bls12_381_G2_compress( v ))}`;
    if( isBlsResult( v ) ) return JSON.stringify( v, ( k, v ) => typeof v === "bigint" ? v.toString() : v );

    if( Array.isArray( v ) ) return "[" + v.map( showUPLCConstValue ).join(',') + "]";
    if( v instanceof Pair ) return `(${showUPLCConstValue(v.fst)},${showUPLCConstValue(v.snd)})`;
    
    throw new Error(
        "'showUPLCConstValue' did not matched any possible constant value"
    );
}

export function showConstType( t: ConstType ): string
{
    if( t[0] === ConstTyTag.list )
    {
        return `(list ${showConstType( constListTypeUtils.getTypeArgument( t as any ) )})`;
    }
    if( t[0] === ConstTyTag.pair )
    {
        return `(pair ${
            showConstType( 
                constPairTypeUtils.getFirstTypeArgument( t as any ) 
            )
        } ${
            showConstType( 
                constPairTypeUtils.getSecondTypeArgument( t as any )
            )
        })`;
    }

    return constTypeToStirng( t );
}

const vars = "abcdefghilmopqrstuvzwxyjkABCDEFGHILJMNOPQRSTUVZWXYJK".split('');

function getVarNameForDbn( dbn: number ): string
{
    if( dbn < 0 ) return `(${dbn})`;
    if( dbn < vars.length ) return vars[ dbn ];
    return vars[ Math.floor( dbn / vars.length ) ] + getVarNameForDbn( dbn - vars.length )
}

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
    if( t instanceof UPLCConst ) return `(con ${showConstType(t.type)} ${showUPLCConstValue( t.value )})`;
    if( t instanceof Force ) return `(force ${ _showUPLC( t.termToForce, dbn ) })`;
    if( t instanceof ErrorUPLC ) return "(error)";
    if( t instanceof Builtin )
    {
        const nForces = getNRequiredForces( t.tag );

        return "(force ".repeat( nForces ) +`(builtin ${builtinTagToString( t.tag )})` + ')'.repeat( nForces )
    }
    if( t instanceof Constr )
    {
        return "(constr " + t.index.toString() + " " + t.terms.map( term => _showUPLC( term, dbn ) ).join(" ") + ")";
    }
    if( t instanceof Case )
    {
        return "(case " + _showUPLC( t.constrTerm, dbn ) + " " + t.continuations.map( term => _showUPLC( term, dbn ) ).join(" ") + ")";
    }
    
    return "";
}

export function showUPLC( term: UPLCTerm ): string
{
    return _showUPLC( term, 0 );
}


export function prettyUPLC( term: UPLCTerm, _indent: number = 2 ): string
{
    if( !Number.isSafeInteger( _indent ) || _indent < 1 ) return showUPLC( term );

    const indentStr = " ".repeat(_indent)

    function getVarNameForDbn( dbn: number ): string
    {
        if( dbn < 0 ) return `(${dbn})`;
        if( dbn < vars.length ) return vars[ dbn ];
        return vars[ Math.floor( dbn / vars.length ) ] + getVarNameForDbn( dbn - vars.length )
    }

    function _prettyUPLC( t: UPLCTerm, dbn: number, depth: number): string
    {
        const indent = `\n${indentStr.repeat( depth )}`;
        if( t instanceof UPLCVar )
        {
            return indent + getVarNameForDbn( dbn - 1 - Number( t.deBruijn ) )
        }
        if( t instanceof Delay ) return `${indent}(delay ${ _prettyUPLC( t.delayedTerm, dbn, depth + 1 ) }${indent})`;
        if( t instanceof Lambda ) 
        {
            return `${indent}(lam ${getVarNameForDbn( dbn )} ${ _prettyUPLC( t.body, dbn + 1, depth + 1 ) }${indent})`;
        }
        if( t instanceof Application ) return `${indent}[${ _prettyUPLC( t.funcTerm, dbn, depth + 1 ) } ${ _prettyUPLC( t.argTerm, dbn, depth + 1 ) }${indent}]`;
        if( t instanceof UPLCConst ) return `${indent}(con ${showConstType(t.type)} ${showUPLCConstValue( t.value )})`;
        if( t instanceof Force ) return `${indent}(force ${ _prettyUPLC( t.termToForce, dbn, depth + 1 ) }${indent})`;
        if( t instanceof ErrorUPLC ) return "(error)";
        if( t instanceof Builtin )
        {
            const nForces = getNRequiredForces( t.tag );
    
            return indent + "(force ".repeat( nForces ) +`(builtin ${builtinTagToString( t.tag )})` + ')'.repeat( nForces )
        }
        if( t instanceof Constr )
        {
            const nextIndent = indent + indentStr;
            return indent + "(constr " + t.index.toString() + "\n" +
                nextIndent + "[" + t.terms.map( term => _prettyUPLC( term, dbn, depth + 2 ) ).join(",\n") + 
                nextIndent + "]\n" +
                indent + ")";
        }
        if( t instanceof Case )
        {
            const nextIndent = indent + indentStr;
            return indent + "(case\n" +
            _prettyUPLC( t.constrTerm, dbn, depth + 1 ) + "\n" +
            nextIndent + "[" +
            t.continuations.map( term => _prettyUPLC( term, dbn, depth + 2 ) ).join(",\n") +
            nextIndent + "]\n" +
            indent + ")";
        }
        
        return "";
    }

    return _prettyUPLC( term, 0, 0 );
}

/**
 * 
 * @param {number | bigint} varDeBruijn ```number | bigint```; debruijn level (at the term level) of the variable to search for
 * @param {UPLCTerm} t ```UPLCTerm``` to search in
 * @returns {boolean} ```true``` if the variable has **at least** 1 or more references; ```false``` otherwise 
 */
export function hasAnyRefsInTerm( varDeBruijn: number | bigint, t: UPLCTerm ): boolean
{
    assert(
        isUPLCTerm( t ),
        "'getUPLCVarRefsInTerm' expects an UPLCTerms"
    );

    const dbn = BigInt( varDeBruijn );

    if( t instanceof UPLCVar )      return t.deBruijn === dbn;
    if( t instanceof Delay )        return hasAnyRefsInTerm( dbn, t.delayedTerm );
    if( t instanceof Lambda )       return hasAnyRefsInTerm( dbn + BigInt(1), t.body );
    if( t instanceof Application )  return hasAnyRefsInTerm( dbn, t.funcTerm ) || hasAnyRefsInTerm( dbn, t.argTerm );
    if( t instanceof UPLCConst )    return false;
    if( t instanceof Force )        return hasAnyRefsInTerm( dbn, t.termToForce );
    if( t instanceof ErrorUPLC )    return false;
    if( t instanceof Builtin )      return false;
    if( t instanceof Constr )       return t.terms.some( term => hasAnyRefsInTerm( dbn, term ) );
    if( t instanceof Case )         return hasAnyRefsInTerm( dbn, t.constrTerm ) || t.continuations.some( term => hasAnyRefsInTerm( dbn, term ) );

    throw new Error(
        "'hasAnyRefsInTerm' did not matched any possible 'UPLCTerm' constructor"
    );
}

/**
 * 
 * @param {number | bigint} varDeBruijn ```number | bigint```; debruijn level (at the term level) of the variable to search for
 * @param {UPLCTerm} term ```UPLCTerm``` to search in
 * @returns {boolean} ```true``` if the variable has 2 or more references; ```false``` otherwise 
 */
export function hasMultipleRefsInTerm( varDeBruijn: number | bigint, t: Readonly<UPLCTerm> ): boolean
{
    assert(
        isUPLCTerm( t ),
        "'getUPLCVarRefsInTerm' expects an UPLCTerms"
    );

    const dbn = BigInt( varDeBruijn );

    if( t instanceof UPLCVar )      return false; // single ref; case of multple refs is handled in 'Application' using 'hasAnyRefsInTerm'
    if( t instanceof Delay )        return hasMultipleRefsInTerm( dbn, t.delayedTerm );
    if( t instanceof Lambda )       return hasMultipleRefsInTerm( dbn + BigInt(1), t.body );
    if( t instanceof Application ) 
        return (
            ( hasAnyRefsInTerm( dbn, t.funcTerm ) && hasAnyRefsInTerm( dbn, t.argTerm ) )   ||  // referenced at least once in both terms
            hasMultipleRefsInTerm( dbn, t.funcTerm )                                        ||  // referenced multiple times in func 
            hasMultipleRefsInTerm( dbn, t.argTerm )                                             // referenced multiple times in arg
        );
    if( t instanceof UPLCConst )    return false;
    if( t instanceof Force )        return hasMultipleRefsInTerm( dbn, t.termToForce )
    if( t instanceof ErrorUPLC )    return false;
    if( t instanceof Builtin )      return false;

    if( t instanceof Constr ) return termArrayHasManyRefs( dbn, t.terms );
    if( t instanceof Case )
    {
        return (
            (
                hasAnyRefsInTerm( dbn, t.constrTerm ) &&
                t.continuations.some( term => hasAnyRefsInTerm( dbn, term ) )
            ) ||
            hasMultipleRefsInTerm( dbn, t.constrTerm ) ||
            termArrayHasManyRefs( dbn, t.continuations )
        );
    }

    throw new Error(
        "getUPLCVarRefsInTerm did not matched any possible 'UPLCTerm' constructor"
    );
}

function termArrayHasManyRefs( dbn: bigint, terms: UPLCTerm[] ): boolean
{
    const idx = terms.findIndex( term => hasAnyRefsInTerm( dbn, term ) );
    if( idx < 0 ) return false; // no refs at all;
    return (
        terms.slice( idx + 1 ).some( term => hasAnyRefsInTerm( dbn, term ) ) ||
        terms.some( term => hasMultipleRefsInTerm( dbn, term ) )
    );
}

/**
 * 
 * @param {number | bigint} varDeBruijn ```number | bigint```; debruijn level (at the term level) of the variable to search for
 * @param {UPLCTerm} term ```UPLCTerm``` to search in
 * @returns {number} number of references to the variable
 */
export function getUPLCVarRefsInTerm( term: UPLCTerm, varDeBruijn: number | bigint = 0 ): number
{
    return _getUPLCVarRefsInTerm( BigInt( varDeBruijn ), term, 0 );
}
function _getUPLCVarRefsInTerm( dbn: bigint, t: UPLCTerm, countedUntilNow: number ): number
{
    assert(
        isUPLCTerm( t ),
        "'getUPLCVarRefsInTerm' expects an UPLCTerms"
    );

    if( t instanceof UPLCVar )      return countedUntilNow + (t.deBruijn === dbn ? 1 : 0);
    if( t instanceof Delay )        return _getUPLCVarRefsInTerm( dbn, t.delayedTerm, countedUntilNow );
    if( t instanceof Lambda )       return _getUPLCVarRefsInTerm( dbn + BigInt( 1 ) , t.body, countedUntilNow );
    if( t instanceof Application )  return _getUPLCVarRefsInTerm( dbn , t.funcTerm, countedUntilNow ) + _getUPLCVarRefsInTerm( dbn , t.argTerm, countedUntilNow );
    if( t instanceof UPLCConst )    return countedUntilNow;
    if( t instanceof Force )        return _getUPLCVarRefsInTerm( dbn, t.termToForce, countedUntilNow );
    if( t instanceof ErrorUPLC )    return countedUntilNow;
    if( t instanceof Builtin )      return countedUntilNow;
    if( t instanceof Constr )       return t.terms.reduce(( tot, term ) => _getUPLCVarRefsInTerm( dbn, term, tot ), countedUntilNow );
    if( t instanceof Case )
    return t.continuations.reduce(
        ( tot, term ) => _getUPLCVarRefsInTerm( dbn, term, tot ),
        _getUPLCVarRefsInTerm( dbn, t.constrTerm, countedUntilNow )
    );

    throw new Error(
        "getUPLCVarRefsInTerm did not matched any possible 'UPLCTerm' constructor"
    );
}


// type UPLCTerm = UPLCVar | Delay | Lambda | Application | UPLCConst | Force | ErrorUPLC | Builtin | Constr | Case;
export function eqUPLCTerm( a: UPLCTerm, b: UPLCTerm ): boolean
{
    if( a instanceof ErrorUPLC ) return b instanceof ErrorUPLC;

    if( a instanceof UPLCVar && b instanceof UPLCVar) return a.deBruijn === b.deBruijn;
    if( a instanceof Delay && b instanceof Delay ) return eqUPLCTerm( a.delayedTerm, b.delayedTerm )
    if( a instanceof Lambda && b instanceof Lambda) return eqUPLCTerm( a.body, b.body );
    if( a instanceof Application && b instanceof Application )
    return (
        eqUPLCTerm( a.argTerm, b.argTerm ) &&
        eqUPLCTerm( a.funcTerm, b.funcTerm )
    );
    if( a instanceof UPLCConst && b instanceof UPLCConst )
    return (
        constTypeEq( a.type, b.type ) &&
        canConstValueBeOfConstType( a.value, a.type ) &&
        canConstValueBeOfConstType( b.value, b.type ) &&
        (() => {
            try {
                return eqConstValue( a.value, b.value );
            } catch (e) {
                if( e instanceof RangeError ) return false;

                throw e;
            }
        })()
    );
    if( a instanceof Force && b instanceof Force ) return eqUPLCTerm( a.termToForce, b.termToForce );
    if( a instanceof Builtin && b instanceof Builtin ) return a.tag === b.tag;
    
    if( a instanceof Constr && b instanceof Constr )
    return (
        a.index === b.index &&
        a.terms.length === b.terms.length &&
        a.terms.every((t,i) => eqUPLCTerm( t, b.terms[i] ))
    );

    if( a instanceof Case && b instanceof Case )
    return (
        eqUPLCTerm( a.constrTerm, b.constrTerm ) &&
        a.continuations.length === b.continuations.length &&
        a.continuations.every((t,i) => eqUPLCTerm( t, b.continuations[i] ))
    );
    
    return false;
}