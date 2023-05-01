# @harmoniclabs/uplc

Typescript/Javascript representation of UPLC (Untyped PLutus Core).

## Install

```bash
npm install @harmoniclabs/uplc
```

## Getting started

parse and print uplc form flat hex ([`@harmoniclabs/uint8array-utils`](https://github.com/HarmonicLabs/uint8array-utils) works in every js runtime)
```ts
import { fromHex } from "@harmoniclabs/uint8array-utils";

const serialized: Uint8Array = fromHex( "0100003233700900219b8248050005200801" );

const program = parseUPLC( serialized, "flat" );

console.log(
    prettyUPLC(
        program.body, // UPLCTerm 
        4 // indentation spaces
    )
);
/*
expected output:

[
    (lam a 
        [
            [
                (builtin addInteger) 
                (con integer 2)
            ] 
            [
                [
                    (builtin multiplyInteger) 
                    (con integer 10)
                ] 
                a
            ]
        ]
    ) 
    (con integer 4)
]
    
*/
```