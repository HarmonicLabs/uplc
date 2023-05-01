/* COMMANDS USED (from the plutus directory)
cabal run uplc -- example -s unitval >> uplcExamples/unitval.uplc # then remove manually "Up to date"
cabal run uplc -- convert -i uplcExamples/unitval.uplc --if textual -o uplcExamples/unitval.flat --of flat
xxd -b uplcExamples/unitval.flat
*/
/*
cabal run uplc -- example -s unitval

(program 1.0.0 (con unit ()))
*/

import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCProgram } from "..";
import { UPLCEncoder } from "../../UPLCEncoder";
import { UPLCConst } from "../../UPLCTerms/UPLCConst";


describe("unitval", () => {

    it("serializes as in the example", () => {

        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 1, 0, 0 ],
                UPLCConst.unit
            )
        );

        const manuallyCompiled = BitStream.fromBinStr(
            [
                "00000001" + "00000000" + "00000000", // version 1.0.0
                "0100", // const tag
                    "1" + "0011" + "0", // unit type
                    // nothing( unit )
                "000001" // padding
            ].join('')
        );

        expect(
            plutsCompiled.toBinStr()
        ).toBe(
            manuallyCompiled.toBinStr()
        )

        expect(
            BitStream.eq(
                plutsCompiled,
                manuallyCompiled
            )
        ).toBe( true )

    });

})