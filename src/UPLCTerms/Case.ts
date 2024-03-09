import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCTerm } from "../UPLCTerm/UPLCTerm";

export class Case
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr("1001");
    }
    
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