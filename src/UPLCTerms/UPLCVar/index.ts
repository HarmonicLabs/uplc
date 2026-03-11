import type { IUPLCTerm } from "../../UPLCTerm/UPLCTerm";
import type { CanBeUInteger } from "../../utils/ints";
import { UPLCTermTag } from "../../UPLCTerm/UPLCTermTag";

export interface IUPLCVar
{
    readonly tag: UPLCTermTag.Var;
    readonly deBruijn: number; // should be enough for any reasonable program
}

export class UPLCVar
    implements IUPLCVar, IUPLCTerm
{
    // return BitStream.fromBinStr( "0000" );
    static readonly UPLCTag: UPLCTermTag.Var = UPLCTermTag.Var;
    readonly tag: UPLCTermTag.Var = UPLCTermTag.Var;

    readonly deBruijn: number;

    constructor( deBruijn: CanBeUInteger )
    {
        this.deBruijn = Number( deBruijn );

        if(!(
            Number.isSafeInteger( this.deBruijn )
            && this.deBruijn >= 0
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