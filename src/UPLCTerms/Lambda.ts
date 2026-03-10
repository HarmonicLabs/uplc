import { BitStream } from "@harmoniclabs/bitstream";
import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface ILambda {
    tag: UPLCTermTag.Lambda;
    body: UPLCTermObj;
}

export class Lambda
    implements ILambda, IUPLCTerm
{
    // return BitStream.fromBinStr("0010");
    static UPLCTag: UPLCTermTag = UPLCTermTag.Lambda;
    readonly tag: UPLCTermTag.Lambda = UPLCTermTag.Lambda;
    
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