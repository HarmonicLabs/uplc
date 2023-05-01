import { UPLCTerm } from "../UPLCTerm";
import { CanBeUInteger } from "../utils/ints";
import { UPLCVersion } from "./UPLCVersion";


export class UPLCProgram
{
    private _version: UPLCVersion
    get version(): UPLCVersion { return this._version };

    private _body: UPLCTerm
    get body(): UPLCTerm { return this._body };

    constructor(
        version: UPLCVersion | [ CanBeUInteger, CanBeUInteger, CanBeUInteger ],
        body: UPLCTerm
    )
    {
        if( Array.isArray( version ) )
        {
            this._version = new UPLCVersion( ...version );
        }
        else
        {
            this._version = version;
        }

        this._body = body;
    }

}