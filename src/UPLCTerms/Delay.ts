import { BitStream } from "@harmoniclabs/bitstream";
import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface IDelay
{
    readonly tag: UPLCTermTag.Delay;
    readonly delayedTerm: UPLCTermObj;
}

export class Delay
    implements IDelay, IUPLCTerm
{
    // return BitStream.fromBinStr( "0001" );
    static UPLCTag: UPLCTermTag = UPLCTermTag.Delay;
    readonly tag: UPLCTermTag.Delay = UPLCTermTag.Delay;

    public delayedTerm: UPLCTerm;

    constructor( toDelay: UPLCTerm )
    {
        this.delayedTerm = toDelay;
    }

    clone(): Delay
    {
        return new Delay( this.delayedTerm.clone() )
    }
}