import { UPLCVersion } from "../../UPLCProgram";

export function serializeVersion( version: UPLCVersion ): Uint8Array
{
    const {
        major,
        minor,
        patch,
    } = version;
    if(!(
        Number.isSafeInteger( major ) && (major & 0xff) === major
        && Number.isSafeInteger( minor ) && (minor & 0xff) === minor
        && Number.isSafeInteger( patch ) && (patch & 0xff) === patch
    )) throw new Error("UPLCVersion: version numbers must be unsigned integers between 0 and 255 inclusive");
  
    return new Uint8Array([
        major,
        minor,
        patch,
    ]);
}