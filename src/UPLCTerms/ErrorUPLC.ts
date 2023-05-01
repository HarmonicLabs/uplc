import { BitStream } from "@harmoniclabs/bitstream";

export class ErrorUPLC
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr( "0110" );
    } 

    public msg?: string;
    public addInfos?: object
    
    constructor( msg?: string, addInfos?: object )
    {
        this.msg = msg;
        this.addInfos = addInfos;
    };

    clone(): ErrorUPLC
    {
        return new ErrorUPLC(this.msg, this.addInfos);
    }
}