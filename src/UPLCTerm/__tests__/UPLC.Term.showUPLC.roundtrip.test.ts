// The text of a term reads back as the same term.
//
// Three things stood in the way:
//
//  - the alphabet binders are named from had `J` twice, so the binders at depth 35 and at
//    depth 50 had the same name, and a variable under both that meant the outer one was read
//    back as the inner one. A script of fifty nested binders (any real validator) printed and
//    parsed again was another program, which could fail where the first passed;
//  - a data constant was written without its parentheses and the type of booleans as
//    `boolean`: this package's parser reads both, the Plutus tools read neither;
//  - a map inside a data constant was written `(key,key)` (in `@harmoniclabs/plutus-data`).

import { DataB, DataConstr, DataI, DataList, DataMap, DataPair } from "@harmoniclabs/plutus-data";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { parseUPLCText, prettyUPLC, showUPLC } from "..";
import { compileUPLC } from "../../UPLCEncoder/UPLCEncoder";
import { UPLCProgram } from "../../UPLCProgram/UPLCProgram";
import { Application, Builtin, Lambda, UPLCConst, UPLCVar, constT } from "../../UPLCTerms";
import { UPLCBuiltinTag } from "../../UPLCTerms/Builtin/UPLCBuiltinTag";
import type { UPLCTerm } from "../UPLCTerm";

const flat = ( t: UPLCTerm ): string => toHex( compileUPLC( new UPLCProgram( [ 1, 1, 0 ] as any, t ) ) as any );
const readBack = ( t: UPLCTerm ): UPLCTerm => parseUPLCText( `(program 1.1.0 ${showUPLC( t )})` );

// A map inside a data constant is written by `@harmoniclabs/plutus-data`, which printed
// `(key,key)` for every pair before its own fix. The cases about maps hold only on a
// build of it that has the fix, and are skipped on one that has not.
const mapsAreWrittenRight = new DataMap( [ new DataPair( new DataI( 1 ), new DataI( 2 ) ) ] ).toString() === "Map [(I 1,I 2)]";
const withMaps = mapsAreWrittenRight ? test : test.skip;

/** `depth` nested binders around a body that uses the binders at the given depths */
function nested( depth: number, uses: number[] ): UPLCTerm
{
    let body: UPLCTerm = new UPLCConst( constT.int, BigInt( 0 ) );
    for( const level of uses )
        body = new Application( new Application( new Builtin( UPLCBuiltinTag.addInteger ), new UPLCVar( depth - 1 - level ) ), body );
    for( let i = 0; i < depth; i++ ) body = new Lambda( body );
    return body;
}

describe( "showUPLC: the text reads back as the term", () => {

    test( "every depth has a name of its own", () => {
        const text = showUPLC( nested( 3000, [] ) );
        const names = [ ...text.matchAll( /\(lam ([^ ]+) /g ) ].map( m => m[1] );
        expect( names.length ).toBe( 3000 );
        expect( new Set( names ).size ).toBe( 3000 );
        expect( names.every( n => /^[a-zA-Z]+$/.test( n ) ) ).toBe( true );
        // the first ones are the single letters they always were
        expect( names.slice( 0, 5 ) ).toEqual( [ "a", "b", "c", "d", "e" ] );
    } );

    test( "a variable under sixty binders is the one it was", () => {
        // depths 35 and 50 were both `J`
        for( const uses of [ [ 35 ], [ 50 ], [ 35, 50 ], [ 0, 3, 35, 50, 51, 59 ] ] )
        {
            const term = nested( 60, uses );
            expect( flat( readBack( term ) ) ).toBe( flat( term ) );
        }
        const deep = nested( 200, [ 0, 49, 50, 51, 52, 101, 150, 199 ] );
        expect( flat( readBack( deep ) ) ).toBe( flat( deep ) );
        expect( flat( parseUPLCText( `(program 1.1.0 ${prettyUPLC( deep )})` ) ) ).toBe( flat( deep ) );
    } );

    test( "constants are written as the Plutus tools write them", () => {
        expect( showUPLC( new UPLCConst( constT.bool, true ) ) ).toBe( "(con bool True)" );
        expect( showUPLC( new UPLCConst( constT.data, new DataConstr( 1, [] ) ) ) ).toBe( "(con data (Constr 1 []))" );
        // inside a list a data value stands bare
        expect( showUPLC( new UPLCConst( constT.listOf( constT.data ), [ new DataI( 1 ), new DataB( "ff" ) ] as any ) ) ).toBe( "(con (list data) [I 1,B #ff])" );
        expect( showUPLC( new UPLCConst( constT.listOf( constT.bool ), [ true, false ] as any ) ) ).toBe( "(con (list bool) [True,False])" );
    } );

    withMaps( "a map in a data constant is written (key,value)", () => {
        const map = new DataMap( [ new DataPair( new DataB( "" ), new DataMap( [ new DataPair( new DataB( "" ), new DataI( 2_000_000 ) ) ] ) ) ] );
        expect( showUPLC( new UPLCConst( constT.data, map ) ) ).toBe( "(con data (Map [(B #,Map [(B #,I 2000000)])]))" );
    } );

    withMaps( "a data constant with maps and lists reads back as itself", () => {
        const ctx = new DataConstr( 0, [
            new DataList( [ new DataI( -5 ), new DataB( "caffee" ) ] ),
            new DataMap( [
                new DataPair( new DataB( "" ), new DataMap( [ new DataPair( new DataB( "" ), new DataI( 1_500_000 ) ) ] ) ),
                new DataPair( new DataConstr( 1, [ new DataB( "00ff" ) ] ), new DataList( [] ) ),
            ] ),
        ] );
        const term = new Application( new Builtin( UPLCBuiltinTag.unConstrData ), new UPLCConst( constT.data, ctx ) );
        expect( flat( readBack( term ) ) ).toBe( flat( term ) );
        expect( flat( parseUPLCText( `(program 1.1.0 ${prettyUPLC( term )})` ) ) ).toBe( flat( term ) );
    } );
} );
