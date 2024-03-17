
export function getTextBetweenMatchingQuotes( str: string ): string | undefined
{
    for(
        let i = 0, ch = "", openIdx = -1;
        i < str.length;
        i++
    )
    {
        ch = str[i];
        if( ch === '"' )
        {
            if( openIdx < 0 ) openIdx = i;
            else return str.slice( openIdx + 1, i );
        }
        else if (ch === "\\") i++; // grab whatever is next
    }

    return undefined;
}