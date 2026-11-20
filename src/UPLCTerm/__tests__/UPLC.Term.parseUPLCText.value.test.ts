// `(con value [...])` in the text format.
//
// What is written is a list of `( currency, [ ( token, quantity ) ] )` entries; the constant
// is the value they denote, a map of maps. The parser kept the list as written, so two
// spellings of one value were two different constants: unsorted keys stayed unsorted, a key
// given twice stayed twice, zero quantities and empty currencies stayed in; and keys of more
// than 32 bytes or quantities beyond 128 bits were accepted.
//
// The cases are the ones of the Plutus conformance suite (`builtin/constant/value`): the
// general conformance test only checks that they parse, here what they parse to is checked.

import { readFileSync, readdirSync } from "fs";
import { parseUPLCText, showUPLC } from "..";
import { UPLCConst } from "../../UPLCTerms";

const DIR = "./src/__tests__/plutus_conformance/builtin/constant/value";

const removeComments = ( src: string ): string =>
    src.split("\n").map( line => { const i = line.indexOf("--"); return i < 0 ? line : line.slice( 0, i ); } ).join("\n").trim();

const cases = readdirSync( DIR, { withFileTypes: true } ).filter( e => e.isDirectory() ).map( e => e.name ).sort();

describe("parseUPLCText: value constants", () => {

    test("the fifteen cases are there", () => {
        expect( cases.length ).toBe( 15 );
    });

    test.each( cases )( "%s", ( name ) => {
        const src = removeComments( readFileSync( `${DIR}/${name}/${name}.uplc`, "utf8" ) );
        const expected = removeComments( readFileSync( `${DIR}/${name}/${name}.uplc.expected`, "utf8" ) );
        if( expected.startsWith("parse error") )
        {
            expect( () => parseUPLCText( src ) ).toThrow();
            return;
        }
        const got = parseUPLCText( src );
        expect( got ).toBeInstanceOf( UPLCConst );
        // the expected file writes the value in order: read as is, it is the value itself
        expect( showUPLC( got ) ).toBe( showUPLC( parseUPLCText( expected ) ) );
    });

    const show = ( src: string ): string => showUPLC( parseUPLCText( `(program 1.1.0 (con value ${src}))` ) );

    test("keys in order: byte by byte, a prefix before what extends it", () => {
        expect( show( "[(#ff, [(#, 1)]), (#00ff, [(#, 1)]), (#00, [(#, 1)]), (#, [(#01, 1), (#, 1), (#0100, 1)])]" ) )
        .toBe( show( "[(#, [(#, 1), (#01, 1), (#0100, 1)]), (#00, [(#, 1)]), (#00ff, [(#, 1)]), (#ff, [(#, 1)])]" ) );
    });

    test("a key given twice is one key; quantities that cancel leave nothing", () => {
        expect( show( "[(#aa, [(#01, 5)]), (#aa, [(#01, 7), (#02, 1)])]" ) ).toBe( show( "[(#aa, [(#01, 12), (#02, 1)])]" ) );
        expect( show( "[(#aa, [(#01, 5), (#01, -5)]), (#bb, [(#, 3)])]" ) ).toBe( show( "[(#bb, [(#, 3)])]" ) );
        expect( show( "[(#aa, [(#01, 5), (#01, -5)])]" ) ).toBe( show( "[]" ) );
    });

    test("32 bytes is the longest key; 128 bits the widest quantity, sums included", () => {
        const k32 = "#" + "ab".repeat( 32 ), k33 = "#" + "ab".repeat( 33 );
        const max = ( BigInt( 1 ) << BigInt( 127 ) ) - BigInt( 1 );
        expect( () => show( `[(${k32}, [(${k32}, 1)])]` ) ).not.toThrow();
        expect( () => show( `[(${k33}, [(#, 1)])]` ) ).toThrow();
        expect( () => show( `[(#, [(${k33}, 1)])]` ) ).toThrow();
        expect( () => show( `[(#, [(#, ${max})])]` ) ).not.toThrow();
        expect( () => show( `[(#, [(#, ${max + BigInt( 1 )})])]` ) ).toThrow();
        expect( () => show( `[(#, [(#, ${-max - BigInt( 1 )})])]` ) ).not.toThrow();
        expect( () => show( `[(#, [(#, ${-max - BigInt( 2 )})])]` ) ).toThrow();
        expect( () => show( `[(#, [(#, ${max}), (#, 1)])]` ) ).toThrow();
    });
});
