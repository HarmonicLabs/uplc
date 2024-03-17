
export function indexOfNextUnmatchedParentesis( str: string ): number
{
    for(
        let i = 0, ch = "", nOpen = 0;
        i < str.length;
        i++
    )
    {
        ch = str[i];
        if( ch === "(" ) nOpen++;
        else if (ch === ")") nOpen--;

        if( nOpen < 0 ) return i;
    }

    return -1;
}