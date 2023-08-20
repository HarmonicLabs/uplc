import { ByteString } from "@harmoniclabs/bytestring";
import { UPLCTerm, getOffsetToNextClosingBracket, parseConstType, parseUPLCText, prettyUPLC, showConstType, showUPLC } from "..";
import { Application, Builtin, ConstType, ConstValueList, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCVar, constT } from "../../UPLCTerms";
import { DataB, DataConstr, DataI, dataFromCbor } from "@harmoniclabs/plutus-data";
import { Pair } from "@harmoniclabs/pair";


describe("parseUPLCText", () => {

    describe("getOffsetToNextClosingBracket", () => {

        test("\" hello )\" -> 8", () => {
            
            expect(
                getOffsetToNextClosingBracket(" hello )")
            ).toEqual( 8 );

        });

    });

    describe("parseConstType", () => {

        function tst( t: ConstType )
        {
            const str = showConstType( t );
            test(str, () => {
                expect(
                    parseConstType( str )
                ).toEqual({
                    type: t,
                    offset: str.length
                })
            })
        }
        
        tst( constT.int );
        tst( constT.bool );
        tst( constT.byteStr );
        tst( constT.data );
        tst( constT.str );
        tst( constT.unit );
        tst( constT.listOf( constT.int ) );
        tst( constT.pairOf( constT.int, constT.int ) );
        // value constant type
        tst(
            constT.listOf(
                constT.pairOf( 
                    constT.byteStr, 
                    constT.listOf(
                        constT.pairOf(
                            constT.byteStr,
                            constT.int
                        )
                    )
                )
            )
        );
        tst(
            constT.listOf(
                constT.pairOf(
                    constT.data,
                    constT.data
                )
            )
        );
    });

    describe("parseConst", () => {

        function tst( con: UPLCConst ): void
        {
            const str = showUPLC( con );
            test( str, () => {
                expect(
                    parseUPLCText( str )
                ).toEqual( con )
            });
        }

        const dBs = dataFromCbor("40");
        const dConstr = new DataConstr( 2, [ new DataI( 32 ), new DataB("00000000") ] );
        const conPairDI = UPLCConst.pairOf( constT.data, constT.int )( dConstr, 32 );

        tst( UPLCConst.int( 42 ) );
        tst( UPLCConst.int( -42 ) );
        tst( UPLCConst.str( "hello" ) );
        tst( UPLCConst.byteString( ByteString.fromAscii("hello") ) );
        tst( UPLCConst.data( dBs ) );
        tst( UPLCConst.data( dConstr ) );
        tst( UPLCConst.listOf( constT.data )([ dBs, dConstr ]) );
        tst( conPairDI );
        tst(
            UPLCConst.listOf( constT.pairOf( constT.data, constT.data ) )([
                new Pair( dConstr, dBs ),
                new Pair( dBs, dBs ),
                new Pair( dConstr, dConstr ),
            ] as ConstValueList)
        )
    })

    test("README test", () => {

        const uplc_source = `
[
    (lam a 
        [
            [
                (builtin addInteger) 
                (con integer 2)
            ] 
            [
                [
                    (builtin multiplyInteger) 
                    (con integer 10)
                ] 
                a
            ]
        ]
    ) 
    (con integer 4)
]`;

        const uplc = parseUPLCText( uplc_source );

        expect( prettyUPLC( uplc, 4 ) ).toEqual( uplc_source )
    })
    
    const errAppl = new Application( new ErrorUPLC(), new ErrorUPLC() );

    test("[(error) (error)]", () => {

        expect(
            parseUPLCText("[(error) (error)]")
        ).toEqual( errAppl );

        expect(
            parseUPLCText(`[
                (error)
                (error)
            ]`)
        ).toEqual( errAppl );
        
    });

    const lettedErr = new Application( new Lambda( new UPLCVar(0) ), new ErrorUPLC() );
    const delErr = new Delay( new ErrorUPLC() );
    const outOfBound = new Lambda( new UPLCVar(1) );
    const forceVar = new Force( new UPLCVar(0) );

    const addInt = Builtin.addInteger;
    const implicitForce = Builtin.headList;
    const implicitForce2 = Builtin.fstPair;

    describe("clone :: parseUPLCText( showUPLC( uplc ) ) === uplc", () => {

        function testClone( uplc: UPLCTerm, only: boolean = false )
        {
            const tst = only ? test.only : test;
            const showed = showUPLC( uplc );
            tst("clone :: " + showed, () => {

                expect(
                    parseUPLCText( showed )
                ).toEqual( uplc );

            })
        };

        testClone( errAppl );
        testClone( lettedErr );
        testClone( delErr );
        testClone( outOfBound );
        testClone( forceVar );
        testClone( addInt );
        testClone( implicitForce );
        testClone( implicitForce2 );
    });

    describe("clone :: parseUPLCText( prettyUPLC( uplc ) ) === uplc", () => {

        function testClone( uplc: UPLCTerm )
        {
            test("clone pretty :: " + showUPLC( uplc ), () => {

                expect(
                    parseUPLCText( prettyUPLC( uplc ) )
                ).toEqual( uplc );

            })
        };

        testClone( errAppl );
        testClone( lettedErr );
        testClone( delErr );
        testClone( outOfBound );
        testClone( forceVar );
        testClone( addInt );
        testClone( implicitForce );
        testClone( implicitForce2 );

    });
})