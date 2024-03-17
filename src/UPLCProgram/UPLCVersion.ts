import { CanBeUInteger, forceBigUInt } from "../utils/ints"

export class UPLCVersion
{
    private _major: bigint
    private _minor: bigint
    private _patch: bigint

    get major(): bigint {return this._major};
    get minor(): bigint {return this._minor};
    get patch(): bigint {return this._patch};

    constructor( major: CanBeUInteger, minor: CanBeUInteger, patch: CanBeUInteger )
    {
        this._major = forceBigUInt( major );
        this._minor = forceBigUInt( minor );
        this._patch = forceBigUInt( patch );
    }

    isV3Friendly(): boolean
    {
        // ^1.1.0 || >= 2.*.*
        return this.major === BigInt(1) ?
            this.minor >= 1 :
            this.major >= 2;
    }

    toString(): string
    {
        return `${this.major}.${this.minor}.${this.patch}`;
    }

    static fromString( str: string ): UPLCVersion
    {
        const [ a, b, c ] = str.split(".")
        return new UPLCVersion(
            BigInt( a ),
            BigInt( b ),
            BigInt( c )
        )
    }
}

export const defaultUplcVersion = new UPLCVersion( 1, 1, 0 );