/**
 * Tests for wireToConstType / constTypeToWire round-trip behaviour with
 * nested applied types (pair-of-pair, list-of-pair, pair-of-list, etc.).
 *
 * Both functions are module-private so we exercise them indirectly through
 * the full encode → decode pipeline.
 */

import { compileUPLC } from "../../UPLCEncoder";
import { UPLCDecoder } from "..";
import { UPLCProgram } from "../../UPLCProgram";
import { UPLCConst } from "../../UPLCTerms/UPLCConst";
import { constT, constTypeEq, ConstType } from "../../UPLCTerms";
import { UPLCTermTag } from "../../UPLCTerm/UPLCTermTag";
import { UPLCTerm } from "../../UPLCTerm";

function roundTripType(con: UPLCConst): ConstType {
    const encoded = compileUPLC(new UPLCProgram([1, 0, 0], con));
    const decoded = UPLCDecoder.parse(encoded, "flat");
    if (decoded.body.tag !== UPLCTermTag.Const) {
        throw new Error("expected a Const term after decoding");
    }
    return (decoded.body as UPLCConst).type;
}

function roundTripValue(con: UPLCConst): UPLCTerm {
    const encoded = compileUPLC(new UPLCProgram([1, 0, 0], con));
    const decoded = UPLCDecoder.parse(encoded, "flat");
    return decoded.body;
}

describe("wireToConstType / constTypeToWire – nested applied types", () => {

    describe("pair with a pair as second argument", () => {

        it("pair( bytes, pair( bytes, int ) )", () => {
            const type = constT.pairOf(constT.byteStr, constT.pairOf(constT.byteStr, constT.int));
            const con = UPLCConst.pairOf(
                constT.byteStr,
                constT.pairOf(constT.byteStr, constT.int)
            )(
                new Uint8Array([0xde, 0xad]),
                { fst: new Uint8Array([0xbe, 0xef]), snd: BigInt(42) }
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

        it("pair( int, pair( bool, bytes ) )", () => {
            const type = constT.pairOf(constT.int, constT.pairOf(constT.bool, constT.byteStr));
            const con = UPLCConst.pairOf(
                constT.int,
                constT.pairOf(constT.bool, constT.byteStr)
            )(
                BigInt(7),
                { fst: true, snd: new Uint8Array([0xff]) }
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

    describe("pair with a pair as first argument", () => {

        it("pair( pair( int, bool ), bytes )", () => {
            const type = constT.pairOf(constT.pairOf(constT.int, constT.bool), constT.byteStr);
            const con = UPLCConst.pairOf(
                constT.pairOf(constT.int, constT.bool),
                constT.byteStr
            )(
                { fst: BigInt(1), snd: false },
                new Uint8Array([0xca, 0xfe])
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

    describe("deeply nested pairs", () => {

        it("pair( pair( int, bool ), pair( bytes, int ) )", () => {
            const type = constT.pairOf(
                constT.pairOf(constT.int, constT.bool),
                constT.pairOf(constT.byteStr, constT.int)
            );
            const con = UPLCConst.pairOf(
                constT.pairOf(constT.int, constT.bool),
                constT.pairOf(constT.byteStr, constT.int)
            )(
                { fst: BigInt(3), snd: true },
                { fst: new Uint8Array([0x01]), snd: BigInt(99) }
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

    describe("list with a pair element type", () => {

        it("list( pair( bytes, int ) )", () => {
            const type = constT.listOf(constT.pairOf(constT.byteStr, constT.int));
            const con = UPLCConst.listOf(constT.pairOf(constT.byteStr, constT.int))(
                [
                    { fst: new Uint8Array([0x01]), snd: BigInt(10) },
                    { fst: new Uint8Array([0x02]), snd: BigInt(20) },
                ]
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

        it("list( pair( int, bool ) )", () => {
            const type = constT.listOf(constT.pairOf(constT.int, constT.bool));
            const con = UPLCConst.listOf(constT.pairOf(constT.int, constT.bool))(
                [
                    { fst: BigInt(0), snd: false },
                    { fst: BigInt(1), snd: true },
                ]
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

    describe("pair with a list argument", () => {

        it("pair( bytes, list( int ) )", () => {
            const type = constT.pairOf(constT.byteStr, constT.listOf(constT.int));
            const con = UPLCConst.pairOf(
                constT.byteStr,
                constT.listOf(constT.int)
            )(
                new Uint8Array([0xab]),
                [BigInt(1), BigInt(2), BigInt(3)]
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

        it("pair( list( bytes ), int )", () => {
            const type = constT.pairOf(constT.listOf(constT.byteStr), constT.int);
            const con = UPLCConst.pairOf(
                constT.listOf(constT.byteStr),
                constT.int
            )(
                [new Uint8Array([0x01, 0x02]), new Uint8Array([0x03])],
                BigInt(5)
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

    describe("nested lists", () => {

        it("list( list( int ) )", () => {
            const type = constT.listOf(constT.listOf(constT.int));
            const con = UPLCConst.listOf(constT.listOf(constT.int))(
                [
                    [BigInt(1), BigInt(2)],
                    [BigInt(3)],
                ]
            );
            expect(constTypeEq(roundTripType(con), type)).toBe(true);
            expect( roundTripValue(con) ).toEqual( con );
        });

    });

});
