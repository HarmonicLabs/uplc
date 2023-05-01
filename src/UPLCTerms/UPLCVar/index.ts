import { BitStream } from "@harmoniclabs/bitstream";
import { CanBeUInteger, forceBigUInt } from "../../utils/ints";
import { assert } from "../../utils/assert";

export class UPLCVar
{
    static get UPLCTag(): BitStream
    {
        return BitStream.fromBinStr( "0000" );
    }

    private _deBruijn: bigint;
    get deBruijn(): bigint { return this._deBruijn; }

    constructor( deBruijn: CanBeUInteger )
    {
        this._deBruijn = forceBigUInt( deBruijn );

        assert(
            this._deBruijn >= BigInt( 0 ),
            "invalid deBruijn index; while creating 'UPLCVar' instance, deBruijn index was: "
                + this._deBruijn
        );
    }

    clone(): UPLCVar
    {
        return new UPLCVar( this.deBruijn );
    }
}