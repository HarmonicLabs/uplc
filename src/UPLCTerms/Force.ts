import { UPLCTerm, isUPLCTerm } from "../UPLCTerm/UPLCTerm";
import { Delay } from "./Delay";
import { UPLCVar } from "./UPLCVar";
import { Lambda } from "./Lambda";
import { Application } from "./Application";
import { UPLCConst } from "./UPLCConst/UPLCConst";
import { ErrorUPLC } from "./ErrorUPLC";
import { Builtin } from "./Builtin/Builtin";
import { BitStream } from "@harmoniclabs/bitstream";

export type ForceableTerm
    = UPLCVar
    | Delay
    | Application
    | Force;

export function isForceableTerm( term: UPLCTerm ): boolean
{
    if( !isUPLCTerm( term ) ) return false;

    if( term instanceof UPLCVar ) return true;
    if( term instanceof Delay ) return true;
    if( term instanceof Lambda ) return false;
    
    // needs evaluation
    if( term instanceof Application ) return true;
    if( term instanceof UPLCConst ) return false;

    // needs evaluation
    if( term instanceof Force ) return true;
    if( term instanceof ErrorUPLC ) return false;

    // builtins that do require forces are handled in UPLC compilation
    // applied builtins are handled in the Applicaiton case
    if( term instanceof Builtin ) return false;

    return false;
}

export class Force
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr( "0101" );
    }

    public termToForce : UPLCTerm;

    constructor( term: UPLCTerm )
    {
        //JsRuntime.assert(
        //    isForceableTerm( term ),
        //    "while constructing 'Force'; UPLCTerm is not Forceable"
        //);
        
        this.termToForce = term;
    }

    clone(): Force
    {
        return new Force( this.termToForce.clone() )
    }

}

export function isUPLCForce( any: any ): any is Force
{
    return Object.getPrototypeOf( any ) === Force.prototype;
}