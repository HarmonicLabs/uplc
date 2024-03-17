import { indexOfNextCommaOutsideParentesis } from "../indexOfNextCommaOutsideParentesis";

describe("indexOfNextCommaOutsideParentesis", () => {

    function tst( str: string, idx?: number ): void
    {
        idx = idx ?? str.length - 1;
        test(str, () => {
            expect(
                indexOfNextCommaOutsideParentesis( str )
            ).toEqual( idx )
        })
    }

    tst("(),");
    tst("(,)", -1);
    tst("(,),");
    tst("((,),)", -1);
    tst("((,),(,))", -1);
    tst("((,),(,)),");
    tst("(,),(,),", 3);
})