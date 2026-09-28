import { UPLCDecoder } from ".."
import { Application } from "../../UPLCTerms/Application"
import { Builtin } from "../../UPLCTerms/Builtin"
import { UPLCBuiltinTag } from "../../UPLCTerms/Builtin/UPLCBuiltinTag"
import { UPLCConst } from "../../UPLCTerms/UPLCConst"

// the compressed BLS12-381 G1 generator
const G1_GENERATOR = Buffer.from(
    "97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
    "hex"
);

// (program 1.1.0 [(builtin bls12_381_G1_uncompress) (con bytestring #<G1_GENERATOR>)])
// flat-encoded by a spec-compliant third-party encoder (aiken v1.1.21, `aiken uplc encode --hex`);
// pins the on-chain flat tag of bls12_381_G1_uncompress (59)
const AIKEN_UNCOMPRESS_FLAT = Buffer.from(
    "010100377691013097f1d3a73197d7942695638c4fa9ac0fc3688c4f97" +
    "74b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb0001",
    "hex"
);

describe("BLS12-381 builtin flat tags", () => {

    test("tags match the plutus-core DefaultFun flat encoding", () => {

        // https://github.com/IntersectMBO/plutus :: PlutusCore.Default.Builtins (instance Flat DefaultFun)
        expect( UPLCBuiltinTag.bls12_381_G1_compress    ).toEqual( 58 );
        expect( UPLCBuiltinTag.bls12_381_G1_uncompress  ).toEqual( 59 );
        expect( UPLCBuiltinTag.bls12_381_G1_hashToGroup ).toEqual( 60 );
        expect( UPLCBuiltinTag.bls12_381_G2_compress    ).toEqual( 65 );
        expect( UPLCBuiltinTag.bls12_381_G2_uncompress  ).toEqual( 66 );
        expect( UPLCBuiltinTag.bls12_381_G2_hashToGroup ).toEqual( 67 );

    });

    test("decodes third-party-encoded bls12_381_G1_uncompress", () => {

        const program = UPLCDecoder.parse( AIKEN_UNCOMPRESS_FLAT, "flat" );

        expect( program.body ).toEqual(
            new Application(
                Builtin.bls12_381_G1_uncompress,
                UPLCConst.byteString( G1_GENERATOR )
            )
        );

    });

})
