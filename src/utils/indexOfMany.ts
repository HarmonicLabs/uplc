export function indexOfMany( str: string, ...search: string[] ): number
{
    const idxs = search.map( toSearch => str.indexOf( toSearch ) ).filter( idx => idx >= 0 );
    return idxs.length === 0 ? -1 : Math.min( ...idxs );
}