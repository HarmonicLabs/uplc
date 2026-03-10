import { BitStream } from "@harmoniclabs/bitstream";
import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface IConstr {
    tag: UPLCTermTag.Constr;
    index: bigint;
    terms: UPLCTermObj[];
}
export class Constr
    implements IConstr, IUPLCTerm
{
    // return BitStream.fromBinStr("1000");
    static UPLCTag: UPLCTermTag.Constr = UPLCTermTag.Constr;
    readonly tag: UPLCTermTag.Constr = UPLCTermTag.Constr;
    
    public index: bigint;
    public terms: UPLCTerm[];

    constructor( index: bigint | number, terms: UPLCTerm[] )
    {
        this.index = BigInt( index );
        this.terms = terms;
    }

    clone(): Constr
    {
        return new Constr( this.index, this.terms.map( term => term.clone() ) );
    }
}