/* COMMANDS USED (from the plutus directory)
cabal run uplc -- example -s true >> uplcExamples/true.uplc # then remove manually "Up to date"
cabal run uplc -- convert -i uplcExamples/true.uplc --if textual -o uplcExamples/true.flat --of flat
xxd -b uplcExamples/true.flat
*/
/*
cabal run uplc -- example -s true

(program 1.0.0 (con bool True))
*/

import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCProgram } from "..";
import { UPLCEncoder } from "../../UPLCEncoder";
import { UPLCConst } from "../../UPLCTerms/UPLCConst";


describe("true", () => {

    it("serializes as in the example", () => {

        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 1, 0, 0 ],
                UPLCConst.bool( true )
            )
        );

        const manuallyCompiled = BitStream.fromBinStr(
            [
                "00000001" + "00000000" + "00000000", // version 1.0.0
                "0100", // const tag
                    "1" + "0100" + "0", // bool type
                    "1", // True
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