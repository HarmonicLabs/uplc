import { IUPLCTerm, UPLCTerm, UPLCTermObj } from "../UPLCTerm/UPLCTerm";
import { UPLCTermTag } from "../UPLCTerm/UPLCTermTag";

export interface IApplication {
    tag: UPLCTermTag.Application;
    func: UPLCTermObj;
    arg: UPLCTermObj;
}

export class Application
    implements IApplication, IUPLCTerm
{
    // return BitStream.fromBinStr( "0011" );
    static UPLCTag: UPLCTermTag.Application = UPLCTermTag.Application;
    readonly tag: UPLCTermTag.Application = UPLCTermTag.Application;

    public func: UPLCTerm
    public arg : UPLCTerm;
    
    constructor(
        func: UPLCTerm,
        arg: UPLCTerm
    )
    {
        this.func = func;
        this.arg = arg;
    }

    clone(): Application
    {
        return new Application(
            this.func.clone(),
            this.arg.clone()
        );
    }
}