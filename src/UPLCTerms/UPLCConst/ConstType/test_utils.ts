import { ConstType, constT, ConstTyTag } from ".";

const types: ConstType[] = [
    constT.int,
    constT.byteStr,
    constT.str,
    constT.bool,
    constT.unit,
    constT.data,
    constT.bls12_381_G1_element,
    constT.bls12_381_G2_element,
    constT.bls12_381_MlResult,
    // need to be last two
    [ ConstTyTag.list ],
    [ ConstTyTag.pair ],
];

export function makeRandomWellFormed(): ConstType
{
    let i = Math.round(
        Math.random() * (types.length - 1)
    );

    if( i === types.length - 1 )
    {
        return constT.pairOf(
            makeRandomWellFormed(),
            makeRandomWellFormed()
        )
    }
    else if( i === types.length - 2 )
    {
        return constT.listOf(
            makeRandomWellFormed()
        )
    }

    return types[i];
}