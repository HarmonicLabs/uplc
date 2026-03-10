import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface IForce {
    tag: UPLCTermTag.Force;
    forced: UPLCTermObj;
}

export class Force
    implements IForce, IUPLCTerm
{
    // return BitStream.fromBinStr( "0101" );
    static UPLCTag: UPLCTermTag.Force = UPLCTermTag.Force;
    readonly tag: UPLCTermTag.Force = UPLCTermTag.Force;

    public forced: UPLCTerm;

    constructor( term: UPLCTerm )
    {
        //JsRuntime.assert(
        //    isForceableTerm( term ),
        //    "while constructing 'Force'; UPLCTerm is not Forceable"
        //);
        
        this.forced = term;
    }

    clone(): Force
    {
        return new Force( this.forced.clone() )
    }

}