import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCTerm } from "../UPLCTerm/UPLCTerm";

export class Delay
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr( "0001" );
    }

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