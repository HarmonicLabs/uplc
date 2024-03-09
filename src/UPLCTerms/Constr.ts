import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCTerm } from "../UPLCTerm/UPLCTerm";

export class Constr
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr("1000");
    }
    
    public index: bigint;
    public terms: UPLCTerm[];

    constructor( index: bigint, terms: UPLCTerm[] )
    {
        this.index = index;
        this.terms = terms;
    }

    clone(): Constr
    {
        return new Constr( this.index, this.terms.map( term => term.clone() ) );
    }
}