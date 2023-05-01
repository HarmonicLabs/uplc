import { BitStream } from "@harmoniclabs/bitstream"
import { UPLCProgram } from ".."
import { UPLCEncoder } from "../../UPLCEncoder"
import { UPLCConst } from "../../UPLCTerms/UPLCConst"

describe("con11 UPLCProgram", () => {

    it("serializes as in specification", () => {
        
        // https://hydra.iohk.io/build/5988492/download/1/plutus-core-specification.pdf#Example
        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 11, 22, 33 ],
                UPLCConst.int( 11 )
            )
        );

        const manuallyCompiled = BitStream.fromBinStr(
                [
                    "0" + "0001011",    // last list elem + 11.toString(2)
                    "0" + "0010110",    // last list elem + 22.toString(2)
                    "0" + "0100001",    // last list elem + 33.toString(2)
                    "0100",             // term tag: constant
                                        // constant type tags encoded as list of tags
                    "1" + "0000" + "0", // list cons + tag 0 for integer type + list nil
                                        // integer as list of 7 bits
                    "0" + "0010110",    // nil constructor + zigzag(11).toString(2)
                    "000001"            // padding
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
    })
})