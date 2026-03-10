import { IUPLCTerm } from "../../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../../UPLCTerm/UPLCTermTag";
import { CanBeUInteger, forceBigUInt } from "../../utils/ints";

export interface IUPLCVar
{
    readonly tag: UPLCTermTag.Var;
    readonly deBruijn: bigint;
}

export class UPLCVar
    implements IUPLCVar, IUPLCTerm
{
    // return BitStream.fromBinStr( "0000" );
    static readonly UPLCTag: UPLCTermTag.Var = UPLCTermTag.Var;
    readonly tag: UPLCTermTag.Var = UPLCTermTag.Var;

    readonly deBruijn: bigint;

    constructor( deBruijn: CanBeUInteger )
    {
        this.deBruijn = BigInt( deBruijn );

        if(!(
            this.deBruijn >= BigInt( 0 )
        )) throw new Error(
            "invalid deBruijn index; while creating 'UPLCVar' instance, deBruijn index was: "
            + this.deBruijn
        );
    }

    clone(): UPLCVar
    {
        return new UPLCVar( this.deBruijn );
    }
}