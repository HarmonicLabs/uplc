import { CanBeUInteger, forceBigUInt } from "../utils/ints"

export class UPLCVersion
{
    public major: number
    public minor: number
    public patch: number

    constructor( major: CanBeUInteger, minor: CanBeUInteger, patch: CanBeUInteger )
    {
        this.major = Number( major );
        this.minor = Number( minor );
        this.patch = Number( patch );
        if(!(
            Number.isSafeInteger( this.major ) && (this.major & 0xff) === this.major
            && Number.isSafeInteger( this.minor ) && (this.minor & 0xff) === this.minor
            && Number.isSafeInteger( this.patch ) && (this.patch & 0xff) === this.patch
        )) throw new Error("UPLCVersion: version numbers must be unsigned integers between 0 and 255 inclusive");
    }

    isV3Friendly(): boolean
    {
        // ^1.1.0 || >= 2.*.*
        return this.major === 1 ?
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