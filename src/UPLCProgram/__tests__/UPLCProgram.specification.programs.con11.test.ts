import { UPLCProgram } from ".."
import { UPLCEncoder } from "../../UPLCEncoder"
import { UPLCConst } from "../../UPLCTerms/UPLCConst"

function fromBinStr( binStr: string ): Uint8Array
{
    const bytes = new Uint8Array( binStr.length / 8 );
    for( let i = 0; i < bytes.length; i++ )
        bytes[i] = parseInt( binStr.slice( i * 8, i * 8 + 8 ), 2 );
    return bytes;
}

describe("con11 UPLCProgram", () => {

    it("serializes as in specification", () => {

        // https://hydra.iohk.io/build/5988492/download/1/plutus-core-specification.pdf#Example
        const plutsCompiled = UPLCEncoder.compile(
            new UPLCProgram(
                [ 11, 22, 33 ],
                UPLCConst.int( 11 )
            )
        );

        const manuallyCompiled = fromBinStr(
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

        expect( plutsCompiled ).toEqual( manuallyCompiled )
    })
})
