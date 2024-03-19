
export function indexOfNextCommaOutsideParentesis( str: string ): number
{
    for(
        let i = 0, ch = "", nOpen = 0, nBrackets = 0;
        i < str.length;
        i++
    )
    {
        ch = str[i];
        if( ch === "(" ) nOpen++;
        else if (ch === ")") nOpen--;
        else if (ch === "[") nBrackets++;
        else if (ch === "]") nBrackets--;
        else if(
            ch === "," && 
            nOpen <= 0 &&
            nBrackets <= 0
        ) return i;
    }

    return -1;
}