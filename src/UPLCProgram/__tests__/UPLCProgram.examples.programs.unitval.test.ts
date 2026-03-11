/* COMMANDS USED (from the plutus directory)
cabal run uplc -- example -s unitval >> uplcExamples/unitval.uplc # then remove manually "Up to date"
cabal run uplc -- convert -i uplcExamples/unitval.uplc --if textual -o uplcExamples/unitval.flat --of flat
xxd -b uplcExamples/unitval.flat
*/
/*
cabal run uplc -- example -s unitval

(program 1.0.0 (con unit ()))
*/

import { UPLCProgram } from "..";
import { UPLCEncoder } from "../../UPLCEncoder";
import { UPLCConst } from "../../UPLCTerms/UPLCConst";

function fromBinStr( binStr: string ): Uint8Array
{
    const bytes = new Uint8Array( binStr.length / 8 );
    for( let i = 0; i < bytes.length; i++ )
        bytes[i] = parseInt( binStr.slice( i * 8, i * 8 + 8 ), 2 );
    return bytes;
}

describe("unitval", () => {

    it("serializes as in the example", () => {

        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 1, 0, 0 ],
                UPLCConst.unit
            )
        );

        const manuallyCompiled = fromBinStr(
            [
                "00000001" + "00000000" + "00000000", // version 1.0.0
                "0100", // const tag
                    "1" + "0011" + "0", // unit type
                    // nothing( unit )
                "000001" // padding
            ].join('')
        );

        expect( plutsCompiled ).toEqual( manuallyCompiled )

    });

})
