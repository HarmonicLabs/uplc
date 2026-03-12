import { fromAscii } from "@harmoniclabs/uint8array-utils";
import { UPLCTerm, getOffsetToNextClosingBracket, parseConstType, parseUPLCText, prettyUPLC, showConstType, showUPLC } from "..";
import { Application, Builtin, ConstType, ConstValueList, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCVar, constT } from "../../UPLCTerms";
import { DataB, DataConstr, DataI, DataList, DataMap, DataPair, Data, dataFromCbor } from "@harmoniclabs/plutus-data";
import { compileUPLC } from "../../UPLCEncoder";
import { UPLCProgram } from "../../UPLCProgram";
import { UPLCDecoder } from "../../UPLCDecoder";


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
            const result = parseUPLCText( str );
            test( str, () => {
                expect( result ).toEqual( con )
            });
        }

        const dBs = dataFromCbor("40");
        const dConstr = new DataConstr( 2, [ new DataI( 32 ), new DataB("00000000") ] );
        const conPairDI = UPLCConst.pairOf( constT.data, constT.int )( dConstr, 32 );

        tst( UPLCConst.int( 42 ) );
        tst( UPLCConst.int( -42 ) );
        tst( UPLCConst.str( "hello" ) );
        tst( UPLCConst.byteString( fromAscii("hello") ) );
        tst( UPLCConst.data( dBs ) );
        tst( UPLCConst.data( dConstr ) );
        tst( UPLCConst.listOf( constT.data )([ dBs, dConstr ]) );
        tst( conPairDI );
        tst(
            UPLCConst.listOf( constT.pairOf( constT.data, constT.data ) )([
                { fst: dConstr, snd: dBs },
                { fst: dBs, snd: dBs },
                { fst: dConstr, snd: dConstr },
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

    describe("multi-argument application", () => {

        test("[f a b] desugars to [[f a] b]", () => {
            const result = parseUPLCText("[(lam x (lam y x)) (con integer 42) (con bool False)]");
            expect( result ).toEqual(
                new Application(
                    new Application(
                        new Lambda( new Lambda( new UPLCVar(1) ) ),
                        UPLCConst.int( 42 )
                    ),
                    UPLCConst.bool( false )
                )
            );
        });

        test("[f a b c] desugars to [[[f a] b] c]", () => {
            const result = parseUPLCText(
                "[(lam f (lam x (lam y [f x y]))) (lam a (lam b a)) (con bool False) (con bool True)]"
            );
            // outermost should be Application( Application( Application( f, a ), b ), c )
            expect( result.tag ).toBe( 3 ); // Application
            expect( (result as Application).func.tag ).toBe( 3 ); // Application
            expect( ((result as Application).func as Application).func.tag ).toBe( 3 ); // Application
        });

    });

    describe("string escape sequences", () => {

        test("decimal, hex, octal escapes", () => {
            const result = parseUPLCText(
                String.raw`(con string "\t\"\83\x75\x63\o143e\x73s\o041\o042\n")`
            );
            expect( (result as UPLCConst).value ).toBe( '\t"Success!"\n' );
        });

        test("unicode decimal escapes", () => {
            const result = parseUPLCText(
                String.raw`(con string "x \8712 \8477")`
            );
            // \8712 = ∈, \8477 = ℝ
            expect( (result as UPLCConst).value ).toBe( "x \u2208 \u211D" );
        });

    });

    describe("con data with comma-first formatting", () => {

        test("Map with comma-first style parses correctly", () => {
            const result = parseUPLCText(`(con data (Map
       [ (B #0123, I 12345)
       , (I 789453, B #456789)
       , (List [I -12364689486], Constr 7 []) ]))`);

            expect( (result as UPLCConst).value ).toEqual(
                new DataMap([
                    new DataPair( new DataB("0123"), new DataI(12345) ),
                    new DataPair( new DataI(789453), new DataB("456789") ),
                    new DataPair( new DataList([ new DataI(-12364689486) ]), new DataConstr(7n,[]) )
                ] as DataPair<Data,Data>[])
            );
        });

    });

    test("lots of vars", () => {

        const source = "[(lam a [(lam b [(lam c [(lam d [(lam e [(lam f [(lam g [(lam h [(lam i [(lam l [(lam m [(lam o [(lam p [(lam q [[(lam r (lam s (lam t (lam u (lam v [(lam z (force [[[(force (builtin ifThenElse)) [a t]] b] a])) b]))))) b] b]) b]) b]) b]) b]) h]) g]) f]) e]) d]) c]) b]) a]) a]) (con integer 0)]";

        const uplc = parseUPLCText( source );

        const serialized = compileUPLC( new UPLCProgram([1,0,0], uplc ));

        const deserialized = UPLCDecoder.parse( serialized ).body;

        const showed = showUPLC( deserialized );

        // console.log( showed );

        expect( showed ).toEqual( source );
    })
})