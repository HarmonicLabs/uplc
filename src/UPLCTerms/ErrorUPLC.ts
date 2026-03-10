import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";
import { IUPLCTerm } from "../UPLCTerm/UPLCTerm";

export interface IErrorUPLC
{
    tag: UPLCTermTag.Error;
    msg?: string;
    addInfos?: object;
}

export class ErrorUPLC
    implements IErrorUPLC, IUPLCTerm
{
    // return BitStream.fromBinStr( "0110" );
    static UPLCTag: UPLCTermTag.Error = UPLCTermTag.Error;
    readonly tag: UPLCTermTag.Error = UPLCTermTag.Error;

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