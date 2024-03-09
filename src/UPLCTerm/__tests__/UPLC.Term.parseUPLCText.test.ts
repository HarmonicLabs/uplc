import { ByteString } from "@harmoniclabs/bytestring";
import { UPLCTerm, getOffsetToNextClosingBracket, parseConstType, parseUPLCText, prettyUPLC, showConstType, showUPLC } from "..";
import { Application, Builtin, ConstType, ConstValueList, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCVar, constT } from "../../UPLCTerms";
import { DataB, DataConstr, DataI, dataFromCbor } from "@harmoniclabs/plutus-data";
import { Pair } from "@harmoniclabs/pair";
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

    test("real catalyst-bond", () => {

        parseUPLCText(
            "[(lam a [(lam b [(lam c [(lam d [(lam e [(lam f [(lam g [(lam h [(lam i [(lam l [(lam m [(lam o [(lam p [(lam q [[(lam r (lam s (lam t (lam u (lam v [(lam z (force [[[(force (builtin ifThenElse)) [[[a t] (lam w [(lam x [(lam y [[b [[b [[(builtin lessThanEqualInteger) [[(builtin addInteger) s] (con integer 3600000)]] [(lam j [(lam k [[[[c j] k] (lam A [(builtin unIData) [(force (builtin headList)) A]])] k]) (lam k (error))]) [(force (builtin headList)) [d [(force (builtin headList)) [d [e [d [(force (builtin headList)) w]]]]]]]]]] (delay [(force (builtin nullList)) [(force (builtin tailList)) y]])]] (delay [[(builtin equalsData) [(force (builtin headList)) [d [(force (builtin headList)) y]]]] [(force (builtin headList)) w]])]) [(builtin unListData) [f x]]]) [d [(force (builtin headList)) [d v]]]])] (lam w [(lam x [[[a u] (lam y [[b [[(lam j [[i (lam k (delay (con boolean True)))] (lam k (lam A (lam B [[b [j A]] (delay [k B])])))]) (lam j [[(builtin equalsData) [(force (builtin headList)) [d j]]] r])] x]] (delay [(lam j [[(lam k [[i (lam A (delay (con boolean False)))] (lam A (lam B (lam C [[(lam D (lam E (force [[[(force (builtin ifThenElse)) D] (delay (con boolean True))] E]))) [k B]] (delay [A C])])))]) [(builtin equalsByteString) j]] [[(lam k [[(lam A [l (lam B [(force (builtin mkCons)) [A B]])]) k] (con list( bytestring ) [])]) (builtin unBData)] [(builtin unListData) [(lam k [(force (builtin headList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) k]]]]]]]]]) [d [(force (builtin headList)) w]]]]]]) [(builtin unBData) [(force (builtin headList)) [(force (force (builtin sndPair))) [(builtin unConstrData) [(force (builtin headList)) [d r]]]]]]])])] (lam y [(lam j [(lam k [[b [[b [[b [[(builtin lessThanEqualInteger) [(lam A [(lam B [[[[c A] B] (lam C [(builtin unIData) [(force (builtin headList)) C]])] B]) (lam B (error))]) [(force (builtin headList)) [d [m [d [e j]]]]]]] [[(builtin subtractInteger) s] (con integer 1200000)]]] (delay [(force (builtin nullList)) [(force (builtin tailList)) [(force (builtin tailList)) [(builtin unListData) [(force (builtin headList)) j]]]]])]] (delay [[(builtin equalsData) [(force (builtin headList)) [d (force [[[(force (builtin ifThenElse)) k] (delay [(force (builtin headList)) [(builtin unListData) [(force (builtin headList)) j]]])] (delay [(force (builtin headList)) [(force (builtin tailList)) [(builtin unListData) [(force (builtin headList)) j]]]])])]]] [(lam A [[[[[(lam B (lam C (lam D (lam E (lam F [(lam G [[(lam H (force [[[(force (builtin ifThenElse)) [H (con integer 0)]] (delay F)] (delay (force [[[(force (builtin ifThenElse)) [H (con integer 1)]] (delay E)] (delay (force [[[(force (builtin ifThenElse)) [H (con integer 2)]] (delay D)] (delay (force [[[(force (builtin ifThenElse)) [H (con integer 3)]] (delay C)] (delay (error))]))]))]))])) [(builtin equalsInteger) [(force (force (builtin fstPair))) G]]] [(force (force (builtin sndPair))) G]]) [(builtin unConstrData) B]]))))) [m w]] A] A] (lam B [(lam C C) [(force (builtin headList)) B]])] A]) (lam A (error))]])]] (delay [(lam A [[b [[b [(force (builtin nullList)) A]] (delay [(lam B [(lam C [(lam D [(lam E [(lam F [(lam G [(lam H [(lam I [(lam L [(lam J [[(builtin equalsData) E] J]) [(force (builtin headList)) L]]) [d I]]) (force [[[(force (builtin ifThenElse)) k] (delay [(lam I [(lam L [(lam J J) [m L]]) [d I]]) [(force (builtin headList)) [(force (builtin tailList)) [(builtin unListData) [(force (builtin headList)) H]]]]])] (delay [(lam I [(lam L [(lam J J) [m L]]) [d I]]) [(force (builtin headList)) [(builtin unListData) [(force (builtin headList)) H]]]])])]) [d G]]) [(force (builtin headList)) F]]) [d v]]) [(force (builtin headList)) D]]) [d C]]) [(force (builtin headList)) B]]) [(force (builtin tailList)) [(force (builtin tailList)) x]]])]] (delay [(lam B [(lam C [(lam D [(lam E [(lam F [(lam G [(lam H [(lam I [(lam L [(lam J [(lam M (force [[[(force (builtin ifThenElse)) [M B]] (delay [J H])] (delay [[b [J B]] (delay [M H])])])) (lam M [(lam N [(lam O [(lam P [(lam Q [(lam R [(lam S [(lam T [(lam U [(lam V [(lam Z [(lam W [(lam X [(lam Y [(lam J [(lam K [(lam ba [[[(lam bb (lam bc (lam bd [(lam be [(lam bf [[b [[b [[(builtin equalsData) [(force (builtin headList)) bf]] [(force (builtin headList)) [d [m [d (force [[[(force (builtin ifThenElse)) k] (delay [(force (builtin headList)) be])] (delay [(force (builtin headList)) [(force (builtin tailList)) be]])])]]]]]] (delay [[(builtin equalsInteger) [o [(builtin unMapData) [m bf]]]] bc])]] (delay [[(builtin equalsData) [f bf]] [[(builtin constrData) (con integer 2)] [[(force (builtin mkCons)) bd] p]]])]) [d bb]]) [(builtin unListData) [(force (builtin headList)) [d [(force (builtin headList)) [d v]]]]]]))) M] ba] (con data #d87980)]) [[(builtin subtractInteger) S] K]]) [[(builtin divideInteger) J] (con integer 250)]]) [[(builtin subtractInteger) [q T]] [q Y]]]) [(builtin unMapData) [m X]]]) [d W]]) [(force (builtin headList)) Z]]) [(force (builtin tailList)) V]]) [(force (builtin tailList)) U]]) [(builtin unListData) [f [d [(force (builtin headList)) w]]]]]) [(builtin unMapData) [m [d (force [[[(force (builtin ifThenElse)) k] (delay [m [d [(force (builtin headList)) [(force (builtin tailList)) I]]]])] (delay [m [d [(force (builtin headList)) I]]])])]]]]) [q R]]) [(builtin unMapData) [m Q]]]) [d P]]) [m O]]) [d N]]) (force [[[(force (builtin ifThenElse)) k] (delay [(force (builtin headList)) I])] (delay J)])])]) (lam J [(lam M [(lam N [(lam O [(lam P [(lam Q [(lam R [(lam S [[[S J] O] [[(builtin constrData) (con integer 1)] [[(force (builtin mkCons)) R] p]]]) (lam S (lam T (lam U [(lam V [(lam Z [(lam W [(lam X [(lam Y [(lam J [(lam K [(lam ba [(lam bb [(lam bc [(lam bd [[b [[b [[(builtin equalsData) V] bc]] (delay [(lam be [[(builtin equalsInteger) [o be]] T]) [(builtin unMapData) [m bd]]])]] (delay [(lam be [[(builtin equalsData) be] [[(builtin constrData) (con integer 2)] [[(force (builtin mkCons)) U] p]]]) [f bd]])]) [d S]]) [(force (builtin headList)) bb]]) [d ba]]) [m K]]) [d J]]) (force [[[(force (builtin ifThenElse)) k] (delay [(lam J J) [(force (builtin headList)) Y]])] (delay [(lam J [(lam K K) [(force (builtin headList)) J]]) [(force (builtin tailList)) Y]])])]) [(builtin unListData) [(force (builtin headList)) X]]]) [d W]]) [(force (builtin headList)) Z]]) [d v]]) [(force (builtin headList)) [d S]]])))]) [(force (builtin headList)) Q]]) [d P]]) (force [[[(force (builtin ifThenElse)) k] (delay [(lam P [(lam Q Q) [m P]]) [d J]])] (delay [(lam P [(lam Q [(lam R [(lam S S) [m R]]) [d Q]]) [(force (builtin headList)) P]]) [(builtin unListData) [(force (builtin headList)) [d [(force (builtin headList)) w]]]]])])]) [[(builtin addInteger) N] [[(builtin divideInteger) N] (con integer 250)]]]) [[(builtin subtractInteger) [q [(builtin unMapData) [m [d (force [[[(force (builtin ifThenElse)) k] (delay [m [d [(force (builtin headList)) M]]])] (delay [m [d [(force (builtin headList)) I]]])])]]]]] [q [(builtin unMapData) [m [d [(force (builtin headList)) [(force (builtin tailList)) [(force (builtin tailList)) [(builtin unListData) [f [d [(force (builtin headList)) w]]]]]]]]]]]]]) [(force (builtin tailList)) I]])]) [(force (builtin headList)) [(force (builtin tailList)) I]]]) [(builtin unListData) [(force (builtin headList)) [d [(force (builtin headList)) w]]]]]) [(force (builtin headList)) G]]) [(force (builtin tailList)) F]]) [(builtin unListData) [f E]]]) [d D]]) [(force (builtin headList)) C]]) [d v]]) [(force (builtin headList)) x]])]) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(builtin unListData) [f j]]]]]])]) [[(builtin equalsInteger) [(builtin unIData) [(force (builtin headList)) y]]] (con integer 0)]]) [d [(force (builtin headList)) [d v]]]])]) [(builtin unListData) [f [d [(force (builtin headList)) [d v]]]]]])]] (delay (con unit ()))] (delay (error))])) [d v]]))))) (con data #d8799fd8799f581cd539e59d682e54b8aea35d0d7354d91d066b82896312d6f30656fe6cffd8799fd8799fd8799f581c1cfcd22027dc8cb8b233f6288157ab09608207057bc53fe16dd474f4ffffffff)] (con integer 1692379959969)]) (lam q [[[(lam r (lam s (lam t [[[i (lam u (delay (con integer 0)))] (lam u (lam v (lam z (force [[[(force (builtin ifThenElse)) [[(builtin equalsByteString) [(builtin unBData) [(force (force (builtin fstPair))) v]]] s]] (delay [[[i (lam w (delay (con integer 0)))] (lam w (lam x (lam y (force [[[(force (builtin ifThenElse)) [[(builtin equalsByteString) [(builtin unBData) [(force (force (builtin fstPair))) x]]] t]] (delay [(builtin unIData) [(force (force (builtin sndPair))) x]])] (delay [w y])]))))] [(builtin unMapData) [(force (force (builtin sndPair))) v]]])] (delay [u z])]))))] r]))) q] (con bytestring #)] (con bytestring #)])]) [(builtin mkNilData) (con unit ())]]) (lam o [[[(lam p (lam q (lam r [[[i (lam s (delay (con integer 0)))] (lam s (lam t (lam u (force [[[(force (builtin ifThenElse)) [[(builtin equalsByteString) [(builtin unBData) [(force (force (builtin fstPair))) t]]] q]] (delay [[[i (lam v (delay (con integer 0)))] (lam v (lam z (lam w (force [[[(force (builtin ifThenElse)) [[(builtin equalsByteString) [(builtin unBData) [(force (force (builtin fstPair))) z]]] r]] (delay [(builtin unIData) [(force (force (builtin sndPair))) z]])] (delay [v w])]))))] [(builtin unMapData) [(force (force (builtin sndPair))) t]]])] (delay [s u])]))))] p]))) o] (con bytestring #)] (con bytestring #)])]) (lam m [(force (builtin headList)) [(force (builtin tailList)) m]])]) (lam l (lam m [[i (lam o (delay m))] (lam o (lam p (lam q [[l p] [o q]])))]))]) [g (lam i (lam l (lam m (lam o [(lam p [[[h [l p]] [m p]] o]) [[i l] m]]))))]]) (lam h (lam i (lam l (force [[[(force (force (builtin chooseList))) l] h] (delay [[i [(force (builtin headList)) l]] [(force (builtin tailList)) l]])]))))]) (lam g [(lam h [g (lam i [[h h] i])]) (lam h [g (lam i [[h h] i])])])]) (lam f [(force (builtin headList)) [(force (builtin tailList)) [(force (builtin tailList)) f]]])]) (lam e [(force (builtin headList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) [(force (builtin tailList)) e]]]]]]]])]) (lam d [(force (force (builtin sndPair))) [(builtin unConstrData) d]])]) (lam c (lam d (lam e (lam f [(lam g [[(lam h (force [[[(force (builtin ifThenElse)) [h (con integer 0)]] (delay f)] (delay (force [[[(force (builtin ifThenElse)) [h (con integer 1)]] (delay e)] (delay (force [[[(force (builtin ifThenElse)) [h (con integer 2)]] (delay d)] (delay (error))]))]))])) [(builtin equalsInteger) [(force (force (builtin fstPair))) g]]] [(force (force (builtin sndPair))) g]]) [(builtin unConstrData) c]]))))]) (lam b (lam c (force [[[(force (builtin ifThenElse)) b] c] (delay (con boolean False))])))]) (lam a (lam b (lam c [(lam d [[(lam e (force [[[(force (builtin ifThenElse)) [e (con integer 0)]] (delay c)] (delay (force [[[(force (builtin ifThenElse)) [e (con integer 1)]] (delay b)] (delay (error))]))])) [(builtin equalsInteger) [(force (force (builtin fstPair))) d]]] [(force (force (builtin sndPair))) d]]) [(builtin unConstrData) a]])))]"
        );

    });

    test("lots of vars", () => {

        const source = "[(lam a [(lam b [(lam c [(lam d [(lam e [(lam f [(lam g [(lam h [(lam i [(lam l [(lam m [(lam o [(lam p [(lam q [[(lam r (lam s (lam t (lam u (lam v [(lam z (force [[[(force (builtin ifThenElse)) [a t]] b] a])) b]))))) b] b]) b]) b]) b]) b]) h]) g]) f]) e]) d]) c]) b]) a]) a]) (con integer 0)]";

        const uplc = parseUPLCText( source );

        const serialized = compileUPLC( new UPLCProgram([1,0,0], uplc )).toBuffer().buffer;

        const deserialized = UPLCDecoder.parse( serialized ).body;

        const showed = showUPLC( deserialized );

        // console.log( showed );

        expect( showed ).toEqual( source );
    })
})