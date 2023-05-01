import { BitStream } from "@harmoniclabs/bitstream"
import { ByteString } from "@harmoniclabs/bytestring"
import { UPLCProgram } from ".."
import { UPLCEncoder } from "../../UPLCEncoder"
import { Application } from "../../UPLCTerms/Application"
import { Builtin } from "../../UPLCTerms/Builtin"
import { UPLCConst } from "../../UPLCTerms/UPLCConst"

describe("bnBytestrIdx UPLCProgram", () => {

    it("serializes as in specification", () => {
        
        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 5, 0, 2 ],
                new Application(
                    new Application(
                        Builtin.indexByteString,
                        UPLCConst.byteString(
                            new ByteString(
                                "1a5f783625ee8c"
                            )
                        )
                    ),
                    UPLCConst.int( 54321 )
                )
            )
        );

        const manuallyCompiled = BitStream.fromBinStr(
                [
                    "00000101" + "00000000" + "00000010", // version 5.0.2
                    
                    "0011", // apply
                        "0011", // apply
                            "0111", // builtin
                                "0001110", // 14 -> indexByteString
                            "0100", // const
                                "1" + "0001" + "0", // bytestring
                                "001", // padding
                                "00000111", // chunk length: 7 
                                "00011010" + "01011111" + "01111000" + "00110110" + "00100101" + "11101110" + "10001100",
                                "00000000", // end chunk
                        "0100", // const
                            "1" + "0000" + "0", // integer  
                                "1" + "1100010", // integers are encoded as zigzag -> little endian
                                "1" + "1010000", 
                                "0" + "0000110", // this is 108642; decoded is 54321
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
    })
})