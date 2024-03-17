import { readFileSync, readdirSync } from "fs";
import { parseUPLCText } from "../UPLCTerm/parseUPLCText"
import { showUPLC } from "../UPLCTerm/UPLCTerm";

jest.setTimeout( 5_000 );

function removeComments( src: string ): string
{
    const lines = src.split("\n");

    // map in place
    lines.forEach(( line, i ) => {
        const idx = line.indexOf("--");
        if( idx < 0 ) return;
        lines[i] = line.slice( 0, idx );
    });

    return lines.join("\n");
}

function dirEntries( path: string )
{
    return readdirSync( path, {
        encoding: "utf-8",
        recursive: false,
        withFileTypes: true
    })
}

function testDir( path: string )
{
    const dir = dirEntries( path );
    for( const entry of dir )
    {
        const nextPath = `${path}/${entry.name}`;
        if( entry.isDirectory() ) testDir( nextPath );

        //*
        if( entry.isFile() && entry.name.endsWith(".uplc") )
        {
            const expected = readFileSync( `${nextPath}.expected`, "utf8" );
            let uplcSrc = removeComments(
                readFileSync( nextPath, "utf-8" )
            );
            uplcSrc = uplcSrc.trim();

            if( expected.startsWith("parse error") )
            {
                test(nextPath, () => {
                    expect(() => {
                        parseUPLCText( uplcSrc )
                    }).toThrow()
                });
            }
            else
            {
                test(nextPath, () => {
                    expect(() => {
                        parseUPLCText( uplcSrc );
                    }).not.toThrow()
                });
            }
        }
        //*/
    }
    // console.log( path );
}

const base_path = "./src/__tests__/plutus_conformance";

// skip tests for now
// for some reason jest goes crazy whitout exiting
testDir( base_path );

test("mock", () => {})