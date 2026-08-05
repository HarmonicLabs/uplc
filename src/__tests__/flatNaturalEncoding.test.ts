import { UPLCEncoder, compileUPLC } from "../UPLCEncoder/UPLCEncoder";
import { parseUPLC } from "../UPLCDecoder/UPLCDecoder";
import { UPLCProgram } from "../UPLCProgram";
import { UPLCConst } from "../UPLCTerms/UPLCConst";
import { constT } from "../UPLCTerms/UPLCConst/ConstType";
import { DataI, DataList, DataConstr } from "@harmoniclabs/plutus-data";

/**
 * FLAT NATURAL/INTEGER ENCODING — conformance and regression suite.
 *
 * History: `encodeNatural` chunks with JS bitwise operators, which are
 * 32-BIT. `encodeNaturalBig` used to delegate every natural
 * <= MAX_SAFE_INTEGER to it, so every natural in (2^31, 2^53) was silently
 * truncated to its low bits. Flat zigzag-encodes signed integers
 * (natural = 2|v| ...), so every integer CONSTANT with |v| in (2^30, 2^52)
 * came out wrong — e.g. 1e15 encoded as 1e15 mod 2^30 = 616988672. It
 * compiled clean, produced a structurally valid program, and decoded fine;
 * the only symptom was the wrong number on chain.
 *
 * `encodeNatural.window.test.ts` pins the round-trip. This file adds the
 * two checks a round-trip CANNOT make:
 *
 *   1. conformance against an independent reference model, so a bug that is
 *      symmetric across encoder and decoder (both truncating the same way)
 *      cannot hide — a round-trip would happily pass;
 *   2. agreement between the two encoder paths, which is precisely the
 *      invariant that was violated: the `number` path and the `bigint` path
 *      must emit identical bits for every value both can represent.
 */

// ── reference model ────────────────────────────────────────────────────────
// Flat encodes a natural as base-128 little-endian chunks; every chunk is a
// continuation bit (1 = more chunks follow, 0 = last) followed by 7 data
// bits. Written with bigint only, so it has no 32-bit failure mode.
function referenceNaturalBits( n: bigint ): (0|1)[]
{
    if( n < 0n ) throw new Error("natural must be non-negative");
    const chunks: number[] = [];
    do {
        chunks.push( Number( n & 0x7fn ) );
        n >>= 7n;
    } while( n > 0n );

    const bits: (0|1)[] = [];
    for( let i = 0; i < chunks.length; i++ )
    {
        bits.push( i !== chunks.length - 1 ? 1 : 0 );
        for( let b = 6; b >= 0; b-- ) bits.push( (( chunks[i] >> b ) & 1) as 0|1 );
    }
    return bits;
}

/** zigzag, as `encodeInteger` does it */
const toNatural = ( i: bigint ): bigint => i >= 0n ? i * 2n : -i * 2n - 1n;

const bitsToBytes = ( bits: (0|1)[] ): number[] => {
    const padded = bits.slice();
    // mirror FlatEncoder.pad(): fill to a byte boundary, terminating with a 1
    if( padded.length % 8 === 0 ) padded.push( 0,0,0,0,0,0,0,1 );
    else {
        while( padded.length % 8 !== 7 ) padded.push( 0 );
        padded.push( 1 );
    }
    const out: number[] = [];
    for( let i = 0; i < padded.length; i += 8 )
    {
        let byte = 0;
        for( let b = 0; b < 8; b++ ) byte = ( byte << 1 ) | padded[ i + b ];
        out.push( byte );
    }
    return out;
};

const encodeWith = ( f: ( e: UPLCEncoder ) => void ): number[] => {
    const e = new UPLCEncoder();
    f( e );
    e.pad();
    return Array.from( e.getBytes() );
};

// ── the values under test ──────────────────────────────────────────────────
/** every power-of-two boundary and its neighbours, well past the window */
const boundaries = (): bigint[] => {
    const vs = new Set<bigint>();
    for( let p = 0; p <= 70; p++ )
    {
        const v = 1n << BigInt( p );
        vs.add( v - 1n ); vs.add( v ); vs.add( v + 1n );
    }
    return [ ...vs ].filter( v => v >= 0n );
};

/** deterministic pseudo-random spread — a seeded LCG, never Math.random, so
 *  a failure is reproducible and the suite is stable across runs */
const pseudoRandom = ( count: number ): bigint[] => {
    let state = 0x2545f491n;                      // fixed seed
    const next = (): bigint => {
        state = ( state * 6364136223846793005n + 1442695040888963407n )
            & 0xffffffffffffffffn;
        return state;
    };
    const vs: bigint[] = [];
    for( let i = 0; i < count; i++ )
    {
        // spread across widths 1..64 bits so the window is densely covered
        const width = BigInt( ( i % 64 ) + 1 );
        vs.push( next() % ( 1n << width ) );
    }
    return vs;
};

const ALL_NATURALS = [ ...boundaries(), ...pseudoRandom( 256 ) ];

describe("flat naturals conform to the reference model", () => {

    test("encodeNaturalBig matches the reference for every probe value", () => {
        for( const n of ALL_NATURALS )
        {
            expect({ n, bytes: encodeWith( e => e.encodeNaturalBig( n ) ) })
                .toEqual({ n, bytes: bitsToBytes( referenceNaturalBits( n ) ) });
        }
    });

    test("encodeNatural matches the reference across the whole safe-integer range", () => {
        for( const n of ALL_NATURALS )
        {
            if( n > BigInt( Number.MAX_SAFE_INTEGER ) ) continue;
            expect({ n, bytes: encodeWith( e => e.encodeNatural( Number( n ) ) ) })
                .toEqual({ n, bytes: bitsToBytes( referenceNaturalBits( n ) ) });
        }
    });

    // THE regression: the `number` path silently disagreed with the `bigint`
    // path for every value above 2^31, and `encodeNaturalBig` routed values
    // into it. Whatever the internals become, these two must never diverge.
    test("the number and bigint paths emit identical bits", () => {
        for( const n of ALL_NATURALS )
        {
            if( n > BigInt( Number.MAX_SAFE_INTEGER ) ) continue;
            expect({ n, bytes: encodeWith( e => e.encodeNatural( Number( n ) ) ) })
                .toEqual({ n, bytes: encodeWith( e => e.encodeNaturalBig( n ) ) });
        }
    });

    test("encodeInteger zigzags then encodes the resulting natural", () => {
        for( const mag of ALL_NATURALS )
        {
            for( const i of [ mag, -mag ] )
            {
                expect({ i, bytes: encodeWith( e => e.encodeInteger( i ) ) })
                    .toEqual({ i, bytes: bitsToBytes( referenceNaturalBits( toNatural( i ) ) ) });
            }
        }
    });
});

describe("integer constants survive a full compile/parse round trip", () => {

    /** the corruption window in SOURCE terms, plus its edges */
    const windowValues: bigint[] = [
        1_000_000_000_000_000n,      // the canonical GravityDex repro
        (1n << 30n) - 1n, 1n << 30n, (1n << 30n) + 1n,
        (1n << 31n) - 1n, 1n << 31n, (1n << 31n) + 1n,
        (1n << 52n) - 1n, 1n << 52n, (1n << 52n) + 1n,
        BigInt( Number.MAX_SAFE_INTEGER ),
        BigInt( Number.MAX_SAFE_INTEGER ) + 1n,
        1n << 64n,
        1n << 100n,
    ];
    const signed = windowValues.flatMap( v => [ v, -v ] ).concat([ 0n, 1n, -1n, 127n, 128n ]);

    test("as a bare int constant", () => {
        for( const v of signed )
        {
            const back = ( parseUPLC(
                compileUPLC( new UPLCProgram( [ 1, 1, 0 ], UPLCConst.int( v ) ) )
            ).body as UPLCConst ).value;
            expect({ v, back }).toEqual({ v, back: v });
        }
    });

    // GravityDex BUG 11: int LIST literals corrupted their elements even when
    // each element was individually written as a safe product — the elements
    // go through the same natural encoder, one nesting level down.
    test("as elements of a list constant", () => {
        const prog = new UPLCProgram( [ 1, 1, 0 ],
            new UPLCConst( constT.listOf( constT.int ), signed as any ) );
        const back = ( parseUPLC( compileUPLC( prog ) ).body as UPLCConst ).value;
        expect( back ).toEqual( signed );
    });

    test("as integers nested inside data", () => {
        // `data` constants are serialised through CBOR before flat. That
        // layer used to reject every value below -(2^64) outright
        // ("encoding invalid negative integer as CBOR"), which is why this
        // needs `@harmoniclabs/cbor` >= 2.0.2 — see that package's
        // `bignum.test.ts`. The full signed range is covered here, well
        // past the 64-bit bignum boundary in both directions.
        const datum = new DataConstr( 0, [
            new DataI( 1_000_000_000_000_000n ),
            new DataList( signed.map( v => new DataI( v ) ) ),
        ]);
        const prog = new UPLCProgram( [ 1, 1, 0 ], UPLCConst.data( datum ) );
        const back = ( parseUPLC( compileUPLC( prog ) ).body as UPLCConst ).value;
        expect( back ).toEqual( datum );
    });
});
