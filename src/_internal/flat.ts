import { fromHex } from "@harmoniclabs/uint8array-utils";

export class FlatDecoder {
    bytes: Uint8Array;
    index = 0;
    bitAccessor = 0b1000_0000; // Start with the highest bit in a byte

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
    }

    static fromHex(hex: string) {
        return new FlatDecoder(fromHex(hex));
    }

    popBit(): 0 | 1 {
        if (this.bitAccessor < 1) {
            this.bitAccessor = 0b1000_0000;
            this.index += 1;
        }
        if (this.index < this.bytes.length) {
            const ret = this.bytes[this.index]! & this.bitAccessor ? 1 : 0;
            this.bitAccessor >>= 1;
            return ret;
        } else {
            throw new Error("Flat Parser: popBit failed end-of-array.");
        }
    }

    popBits(n: number): number {
        if (n > 8) {
            throw new Error("Flat Parser: popBits cannot pop more than 8");
        }
        let l = 0;
        while (n > 0) {
            l = (l << 1) | this.popBit();
            n--;
        }
        return (l & 0xff);
    }

    popByte(): number {
        if (this.bitAccessor !== 0b1000_0000) {
            console.warn("Flat Parser: popnumber unaligned, trailing bits discarded.");
            this.bitAccessor = 0b1000_0000;
            this.index += 1;
        }
        if (this.index < this.bytes.length) {
            const ret = this.bytes[this.index];
            this.index += 1;
            return (ret & 0xff);
        } else {
            throw new Error("Flat Parser: popnumber failed end-of-array.");
        }
    }

    takeBytes(n: number): Uint8Array {
        if (this.index + n > this.bytes.length) {
            throw new Error("Flat Parser: takenumbers failed end-of-array.");
        }
        if (this.bitAccessor != 0b1000_0000) {
            // Throw if bad bit accessor
            throw new Error(
                "Flat Parser: takenumbers failed without resetting bit accessor.",
            );
        }
        const slice = this.bytes.slice(this.index, this.index + n);
        this.index += n;
        return slice;
    }

    skipByte(): void {
        if (this.bitAccessor < 1) {
            this.bitAccessor = 0b1000_0000;
            this.index += 1;
        }
        this.index += 1;
        this.bitAccessor = 0b1000_0000;
    }
}

export class FlatEncoder {
    private buffer: Uint8Array = new Uint8Array(256);
    private bufferLen: number = 0;

    private currentByte: number = 0;
    private bitIndex: number = 0;

    private _pushByte( byte: number ): void {
        if( this.bufferLen >= this.buffer.length ) {
            const tmp = this.buffer;
            this.buffer = new Uint8Array( this.buffer.length * 2 );
            this.buffer.set( tmp );
        }

        this.buffer[this.bufferLen] = byte;
        this.bufferLen++;
    }

    pushBit(bit: 0 | 1): void {
        this.currentByte = (this.currentByte << 1) | bit;
        this.bitIndex++;

        if (this.bitIndex >= 8) {
            this._pushByte(this.currentByte);

            this.currentByte = 0;
            this.bitIndex = 0;
        }
    }

    pushBits(value: number, numBits: number): void {
        for (let i = numBits - 1; i >= 0; i--) {
            this.pushBit(((value >> i) & 1) as 0 | 1);
        }
    }

    pushByte(byte: number): void {
        if (this.bitIndex !== 0) {
            // this.buffer.push(this.currentByte);
            this._pushByte( this.currentByte );
            throw new Error(
                "pushByte called when not byte-aligned. This may lead to unexpected results.",
            );
        }
        // this.buffer.push(byte);
        this._pushByte( byte );
        this.currentByte = 0;
        this.bitIndex = 0;
    }
    pushBytes(bytes: Uint8Array): void {
        if (this.bitIndex !== 0) {
            // this.buffer.push(this.currentByte);
            this._pushByte( this.currentByte );
            throw new Error(
                "pushBytes called when not byte-aligned. This may lead to unexpected results.",
            );
        }
        const len = bytes.length;
        const nextLen = this.bufferLen + len;
        const tmp = this.buffer;
        while( nextLen >= this.buffer.length ) {
            this.buffer = new Uint8Array( this.buffer.length * 2 );
        }
        this.buffer.set( tmp );
        this.buffer.set( bytes, this.bufferLen );
        this.bufferLen = nextLen;

        this.currentByte = 0;
        this.bitIndex = 0;
    }

    pad(): void {
        if (this.bitIndex === 0) {
            this.pushByte(1);
            return;
        }
        while (this.bitIndex < 7) {
            this.pushBit(0);
        }
        this.pushBit(1);
    }

    getBytes(): Uint8Array {
        return Uint8Array.prototype.slice.call( this.buffer, 0, this.bufferLen );
    }
}
