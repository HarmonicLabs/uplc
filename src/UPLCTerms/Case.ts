import { BitStream } from "@harmoniclabs/bitstream";
import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface ICase {
    tag: UPLCTermTag.Case;
    constrTerm: UPLCTermObj;
    continuations: UPLCTermObj[];
}
export class Case
    implements ICase, IUPLCTerm
{
    // return BitStream.fromBinStr("1001");
    static UPLCTag: UPLCTermTag.Case = UPLCTermTag.Case;
    readonly tag: UPLCTermTag.Case = UPLCTermTag.Case;
    
    public constrTerm: UPLCTerm;
    public continuations: UPLCTerm[];

    constructor( constrTerm: UPLCTerm, continuations: UPLCTerm[] )
    {
        this.constrTerm = constrTerm;
        this.continuations = continuations;
    }

    clone(): Case
    {
        return new Case(
            this.constrTerm.clone(),
            this.continuations.map( term => term.clone() )
        );
    }
}