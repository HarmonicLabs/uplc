import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCTerm } from "../UPLCTerm/UPLCTerm";

export class Lambda
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr("0010");
    }
    
    public body : UPLCTerm;

    constructor( body: UPLCTerm )
    {
        this.body = body
    }

    clone(): Lambda
    {
        return new Lambda( this.body.clone() );
    }
}