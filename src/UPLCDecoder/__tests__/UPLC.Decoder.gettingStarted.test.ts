import { Application, Builtin, Lambda, UPLCConst, UPLCProgram, UPLCVar, compileUPLC, parseUPLC, prettyUPLC } from "../.."

test("getting started", () => {

    const progr = new UPLCProgram(
        [1,0,0],
        new Application(
            new Lambda(
                new Application(
                    new Application(
                        Builtin.addInteger,
                        UPLCConst.int( 2 )
                    ),
                    new Application(
                        new Application(
                            Builtin.multiplyInteger,
                            UPLCConst.int( 10 )
                        ),
                        new UPLCVar( 0 )
                    )
                )
            ),
            UPLCConst.int( 4 )
        )
    );

    const compiled = compileUPLC( progr );

    const buff = Buffer.from( compiled.toBuffer().buffer );

    const hex = buff.toString("hex");

    console.log( hex );

    const parsed = parseUPLC( buff, "flat" );

    console.log(
        prettyUPLC( parsed.body, 4 )
    );

})