/* COMMANDS USED (from the plutus directory)
cabal run uplc -- example -s false >> uplcExamples/false.uplc # then remove manually "Up to date"
cabal run uplc -- convert -i uplcExamples/false.uplc --if textual -o uplcExamples/false.flat --of flat
xxd -b uplcExamples/false.flat
*/
/*
cabal run uplc -- example -s false

(program 1.0.0 (con bool False))
*/

import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCProgram } from "..";
import { UPLCEncoder } from "../../UPLCEncoder";
import { UPLCConst } from "../../UPLCTerms/UPLCConst";


describe("false", () => {

    it("serializes as in the example", () => {

        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 1, 0, 0 ],
                UPLCConst.bool( false )
            )
        );

        const manuallyCompiled = BitStream.fromBinStr(
            [
                "00000001" + "00000000" + "00000000", // version 1.0.0
                "0100", // const tag
                    "1" + "0100" + "0", // bool type
                    "0", // False
                "00001" // padding
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