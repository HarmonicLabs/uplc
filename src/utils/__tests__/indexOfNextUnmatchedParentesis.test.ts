import { indexOfNextUnmatchedParentesis } from "../indexOfNextUnmatchedParentesis";

describe("indexOfNextUnmatchedParentesis", () => {

    function tst( str: string, idx?: number ): void
    {
        idx = idx ?? str.length - 1;
        test(str, () => {
            expect(
                indexOfNextUnmatchedParentesis( str )
            ).toEqual( idx )
        })
    }

    tst("()", -1);
    tst("(,)", -1);
    tst("(,),", -1);
    tst("((,),)", -1);
    tst("((,),(,))", -1);
    tst("((,),(,)),", -1);
    tst("(,),(,),", -1);
    
    tst("())");
    tst("())");
    tst("(())", -1);
    tst("()())()", 4);
    tst("()())())", 4);
    tst("()()())", 6);
    tst("(()())((()))())");
})