import { BitStream } from "@harmoniclabs/bitstream";
import { UPLCVersion } from "../UPLCProgram/UPLCVersion";

export interface RawUPLCSerializationContex
{
    currLength: number,
    version : {
        major: bigint,
        minor: bigint,
        patch: bigint
    }
}

function isV3Friendly( ctx: RawUPLCSerializationContex ): boolean
{
    // ^1.1.0 || >= 2.*.*
    return ctx.version.major === BigInt(1) ?
        ctx.version.minor >= 1 :
        ctx.version.major >  1;
}

export class UPLCSerializationContex
{
    private _rawCtx: RawUPLCSerializationContex;
    private _is_v3_friendly: boolean
    get is_v3_friendly(): boolean
    {
        return this._is_v3_friendly;
    }

    constructor( rawCtx: Partial<RawUPLCSerializationContex> )
    {
        this._rawCtx = {
            currLength : 0,
            version : {
                major: BigInt( 1 ),
                minor: BigInt( 1 ),
                patch: BigInt( 0 )
            },
            ...rawCtx
        };
        this._is_v3_friendly = isV3Friendly( this._rawCtx );
    }

    get currLength(): number
    {
        return this._rawCtx.currLength;
    }

    get version(): UPLCVersion
    {
        return new UPLCVersion(
            this._rawCtx.version.major,
            this._rawCtx.version.minor,
            this._rawCtx.version.patch,
        );
    }

    updateVersion( uplcVersion: UPLCVersion )
    {
        this._rawCtx.version = {
            major: uplcVersion.major,
            minor: uplcVersion.minor,
            patch: uplcVersion.patch,
        };
        this._is_v3_friendly = isV3Friendly( this._rawCtx );
    }

    incrementLengthBy( n: number ): void
    {
        this._rawCtx.currLength = this._rawCtx.currLength + n; 
    }
}