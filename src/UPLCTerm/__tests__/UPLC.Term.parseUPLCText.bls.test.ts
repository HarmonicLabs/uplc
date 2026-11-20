// BLS12-381 constants in the text format.
//
// A constant value reports how much of the text it read, and a list (or a pair) goes on
// from there. A G1 or G2 element reported the length of the whole rest of the text, so a
// list of them lost its second element and anything after ("missing bls g1 compressed
// elem"): the constants of `bls12_381_G1_multiScalarMul`, among others, could not be read.

import { bls12_381_G1_compress, bls12_381_G2_compress, bls12_381_G1_uncompress, bls12_381_G2_uncompress, isBlsG1, isBlsG2 } from "@harmoniclabs/crypto";
import { fromHex, toHex } from "@harmoniclabs/uint8array-utils";
import { parseConstValueOfType, parseUPLCText, showUPLC } from "..";
import { Application, UPLCConst, constT } from "../../UPLCTerms";

// multiples of the generators, compressed
const G1 = [
    "97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
    "a572cbea904d67468808c8eb50a9450c9721db309128012543902d0ac358a62ae28f75bb8f1c7c42c39a8c5529bf0f4e",
    "89ece308f9d1f0131765212deca99697b112d61f9be9a5f1f3780a51335b3ff981747a0b2ca2179b96d2c0c9024e5224",
    // the point at infinity
    "c0" + "00".repeat( 47 ),
];
const G2 = [
    "93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
    "aa4edef9c1ed7f729f520e47730a124fd70662a904ba1074728114d1031e1572c6c886f6b57ec72a6178288c47c335771638533957d540a9d2370f17cc7ed5863bc0b995b8825e0ee1ea1e1e4d00dbae81f14b0bf3611b78c952aacab827a053",
    "c0" + "00".repeat( 95 ),
];

const g1Hex = ( v: any ): string => toHex( bls12_381_G1_compress( v ) );
const g2Hex = ( v: any ): string => toHex( bls12_381_G2_compress( v ) );

describe("parseUPLCText: bls12_381 constants", () => {

    test("a single element reports the length it read", () => {
        const one = parseConstValueOfType( `  0x${G1[0]} )`, constT.bls12_381_G1_element );
        expect( isBlsG1( one.value ) ).toBe( true );
        expect( g1Hex( one.value ) ).toBe( G1[0] );
        // two spaces, "0x", 96 digits, and the space before what follows
        expect( one.offset ).toBe( 2 + 2 + 96 + 1 );

        const two = parseConstValueOfType( `0x${G2[0]}]`, constT.bls12_381_G2_element );
        expect( isBlsG2( two.value ) ).toBe( true );
        expect( g2Hex( two.value ) ).toBe( G2[0] );
        expect( two.offset ).toBe( 2 + 192 );
    });

    test("(con bls12_381_G1_element 0x..) and the G2 one, as before", () => {
        const a = parseUPLCText( `(program 1.1.0 (con bls12_381_G1_element 0x${G1[1]}))` ) as UPLCConst;
        expect( a ).toBeInstanceOf( UPLCConst );
        expect( g1Hex( a.value ) ).toBe( G1[1] );
        const b = parseUPLCText( `(program 1.1.0 (con bls12_381_G2_element 0x${G2[1]}))` ) as UPLCConst;
        expect( g2Hex( b.value ) ).toBe( G2[1] );
    });

    test("a list of G1 elements keeps every element, in order", () => {
        for( const n of [ 0, 1, 2, 4 ] )
        {
            const src = `(program 1.1.0 (con (list bls12_381_G1_element) [${G1.slice( 0, n ).map( h => "0x" + h ).join(", ")}]))`;
            const term = parseUPLCText( src ) as UPLCConst;
            expect( term ).toBeInstanceOf( UPLCConst );
            expect( ( term.value as any[] ).map( g1Hex ) ).toEqual( G1.slice( 0, n ) );
        }
    });

    test("a list of G2 elements keeps every element, in order", () => {
        for( const n of [ 0, 1, 3 ] )
        {
            const src = `(program 1.1.0 (con (list bls12_381_G2_element)\n  [ ${G2.slice( 0, n ).map( h => "0x" + h ).join("\n  , ")}\n  ]\n ))`;
            const term = parseUPLCText( src ) as UPLCConst;
            expect( ( term.value as any[] ).map( g2Hex ) ).toEqual( G2.slice( 0, n ) );
        }
    });

    test("what follows a list of elements is still read", () => {
        // the two arguments of a multi-scalar multiplication, as the conformance cases write them
        const src = `(program 1.0.0
 [(builtin bls12_381_G1_multiScalarMul)
  (con (list integer) [ -7, 78438238, 123 ])
  (con (list bls12_381_G1_element)
   [ 0x${G1[0]}
   , 0x${G1[3]}
   , 0x${G1[2]}
   ]
  )
 ]
)`;
        const term = parseUPLCText( src ) as Application;
        expect( term ).toBeInstanceOf( Application );
        const points = term.arg as UPLCConst;
        expect( ( points.value as any[] ).map( g1Hex ) ).toEqual( [ G1[0], G1[3], G1[2] ] );
        const scalars = ( term.func as Application ).arg as UPLCConst;
        expect( scalars.value ).toEqual( [ BigInt( -7 ), BigInt( 78438238 ), BigInt( 123 ) ] );
    });

    test("elements inside pairs, and lists of such pairs", () => {
        const pair = parseUPLCText( `(program 1.1.0 (con (pair bls12_381_G1_element bls12_381_G2_element) (0x${G1[1]}, 0x${G2[1]})))` ) as UPLCConst;
        expect( g1Hex( ( pair.value as any ).fst ) ).toBe( G1[1] );
        expect( g2Hex( ( pair.value as any ).snd ) ).toBe( G2[1] );

        const pairs = parseUPLCText( `(program 1.1.0 (con (list (pair integer bls12_381_G1_element)) [(1, 0x${G1[0]}), (2, 0x${G1[1]}), (3, 0x${G1[2]})]))` ) as UPLCConst;
        expect( ( pairs.value as any[] ).map( p => [ p.fst, g1Hex( p.snd ) ] ) ).toEqual( [
            [ BigInt( 1 ), G1[0] ], [ BigInt( 2 ), G1[1] ], [ BigInt( 3 ), G1[2] ],
        ] );
    });

    test("what is printed is read back the same", () => {
        const g1s = new UPLCConst( constT.listOf( constT.bls12_381_G1_element ), G1.map( h => bls12_381_G1_uncompress( fromHex( h ) ) ) as any );
        const g2s = new UPLCConst( constT.listOf( constT.bls12_381_G2_element ), G2.map( h => bls12_381_G2_uncompress( fromHex( h ) ) ) as any );
        const back1 = parseUPLCText( `(program 1.1.0 ${showUPLC( g1s )})` ) as UPLCConst;
        const back2 = parseUPLCText( `(program 1.1.0 ${showUPLC( g2s )})` ) as UPLCConst;
        expect( ( back1.value as any[] ).map( g1Hex ) ).toEqual( G1 );
        expect( ( back2.value as any[] ).map( g2Hex ) ).toEqual( G2 );
    });

    test("an element of the wrong length is refused", () => {
        expect( () => parseUPLCText( `(program 1.1.0 (con bls12_381_G1_element 0x${G1[0]}00))` ) ).toThrow();
        expect( () => parseUPLCText( `(program 1.1.0 (con bls12_381_G1_element 0x${G1[0].slice( 2 )}))` ) ).toThrow();
        expect( () => parseUPLCText( `(program 1.1.0 (con (list bls12_381_G1_element) [0x${G1[0]}, 0x${G1[1]}ab]))` ) ).toThrow();
        expect( () => parseUPLCText( `(program 1.1.0 (con (list bls12_381_G2_element) [0x${G2[0]}, 0x${G1[1]}]))` ) ).toThrow();
    });
});
