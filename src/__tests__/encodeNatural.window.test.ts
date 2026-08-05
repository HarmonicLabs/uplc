import { UPLCProgram } from "../UPLCProgram";
import { UPLCConst } from "../UPLCTerms/UPLCConst";
import { compileUPLC } from "../UPLCEncoder/UPLCEncoder";
import { parseUPLC } from "../UPLCDecoder/UPLCDecoder";

/**
 * Flat-encoder big-natural regression (pebble/GravityDex BUG 1):
 * `encodeNatural`'s `n & 0x7f` / `n >>>= 7` are 32-BIT JS ops, and
 * `encodeNaturalBig` used to delegate every natural <= MAX_SAFE_INTEGER to
 * it — silently truncating every natural in (2^31, 2^53) to its low bits.
 * Since flat zigzag-encodes signed ints (natural = 2|v|), every integer
 * CONSTANT with |v| in (2^30, 2^52) was corrupted in the emitted program
 * (e.g. 1e15 became 1e15 mod 2^30 = 616988672).
 */
describe("flat encoder: naturals in the former 32-bit corruption window", () => {

    const cases: bigint[] = [
        // the canonical GravityDex repro
        1_000_000_000_000_000n,
        // window boundaries
        1_073_741_823n,          // 2^30 - 1 (always safe)
        1_073_741_824n,          // 2^30     (window entry)
        1_073_741_825n,
        2_147_483_648n,          // 2^31
        9_007_199_254_740_991n,  // 2^53 - 1 (MAX_SAFE_INTEGER)
        4_503_599_627_370_496n,  // 2^52
        // beyond the window (always took the bigint path)
        1_000_000_000_000_000_000n,
        // negatives zigzag into the same natural window
        -1_500_000_000n,
        -1_000_000_000_000_000n,
        // small values (fast path unchanged)
        0n, 1n, 127n, 128n, 300n,
    ];

    for( const v of cases )
    {
        test(`int constant ${v} round-trips through flat`, () => {
            const flat = compileUPLC( new UPLCProgram( [ 1, 1, 0 ], UPLCConst.int( v ) ) );
            const back = ( parseUPLC( flat ).body as UPLCConst ).value;
            expect( BigInt( back as bigint ) ).toBe( v );
        });
    }
});
