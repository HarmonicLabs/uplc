import { Application, Builtin, Case, Constr, Lambda, UPLCConst, UPLCDecoder, UPLCEncoder, UPLCProgram, showUPLC } from "../.."

describe("Application optimization v3", () => {

    const app2 = new Application(
        new Application(
            Builtin.addInteger,
            UPLCConst.int( 1 )
        ),
        UPLCConst.int( 2 )
    );

    const app3 = new Application(
        new Application(
            new Application(
                new Lambda( // add useless arg
                    Builtin.addInteger,
                ),
                UPLCConst.unit
            ),
            UPLCConst.int( 2 )
        ),
        UPLCConst.int( 1 )
    );

    describe("2 applications", () => {

        test("v2", () => {

            const encoded = UPLCEncoder.compile(
                new UPLCProgram(
                    [1,0,0],
                    app2
                )
            ).toBuffer().buffer;

            const decoded = UPLCDecoder.parse(
                encoded
            ).body;

            expect( decoded ).toEqual( app2 );

        });

        test("v3", () => {

            const encoded = UPLCEncoder.compile(
                new UPLCProgram(
                    [1,1,0],
                    app2
                )
            ).toBuffer().buffer;

            const decoded = UPLCDecoder.parse(
                encoded
            ).body;

            expect( decoded ).toEqual( app2 );
            
        });

    });

    describe("3 applications", () => {

        test("v2", () => {

            const encoded = UPLCEncoder.compile(
                new UPLCProgram(
                    [1,0,0],
                    app3
                )
            ).toBuffer().buffer;

            const decoded = UPLCDecoder.parse(
                encoded
            ).body;

            expect( decoded ).toEqual( app3 );

        });

        test("v3", () => {

            const encoded = UPLCEncoder.compile(
                new UPLCProgram(
                    [1,1,0],
                    app3
                ),
                { trivialOptimization: true }
            ).toBuffer().buffer;

            const decoded = UPLCDecoder.parse(
                encoded
            ).body;

            expect( decoded ).not.toEqual( app3 );
            expect( decoded ).toEqual(
                new Case(
                    new Constr(
                        0,
                        [
                            UPLCConst.unit,
                            UPLCConst.int( 2 ),
                            UPLCConst.int( 1 ),
                        ]
                    ),
                    [
                        new Lambda(
                            Builtin.addInteger
                        )
                    ]
                )
            );
        });

    });

})