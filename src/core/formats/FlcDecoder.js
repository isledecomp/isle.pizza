/**
 * FLIC/FLC delta frame decoder for phoneme lip-sync animation.
 * Ported from isle-portable/LEGO1/omni/src/video/flic.cpp.
 *
 * Maintains an 8-bit indexed pixel buffer and 256-entry RGB palette.
 * Each call to decodeFrame() applies one delta frame.
 * Call toRGBA() to convert the current state to RGBA pixels for texture upload.
 */

// Chunk types
const FLI_CHUNK_COLOR256 = 4;
const FLI_CHUNK_SS2 = 7;
const FLI_CHUNK_COLOR64 = 11;
const FLI_CHUNK_LC = 12;
const FLI_CHUNK_BLACK = 13;
const FLI_CHUNK_BRUN = 15;
const FLI_CHUNK_COPY = 16;
const FLI_CHUNK_FRAME = 0xf1fa;

export class FlcDecoder {
    /**
     * @param {{ width: number, height: number, speed: number }} header - FLIC header
     */
    constructor(header) {
        this.width = header.width;
        this.height = header.height;
        this.speed = header.speed;
        this.stride = (this.width + 3) & ~3; // 4-byte aligned row stride
        this.pixels = new Uint8Array(this.stride * this.height);
        this.palette = new Uint8Array(256 * 3); // RGB triplets
        this.paletteChanged = false;
    }

    /**
     * Decode one FLC frame, updating pixels and palette.
     * @param {ArrayBuffer} frameBuffer - Raw frame data from SI phoneme chunk
     * @returns {boolean} True if palette was changed
     */
    decodeFrame(frameBuffer) {
        const view = new DataView(frameBuffer);
        if (frameBuffer.byteLength < 4) return false;

        const rectCount = view.getInt32(0, true);
        let frameStart = 4 + rectCount * 16;

        if (frameStart + 16 > frameBuffer.byteLength) return false;

        const frameType = view.getUint16(frameStart + 4, true);
        if (frameType !== FLI_CHUNK_FRAME) return false;

        const chunkCount = view.getUint16(frameStart + 6, true);
        this.paletteChanged = false;

        let offset = frameStart + 16;
        for (let i = 0; i < chunkCount && offset + 6 <= frameBuffer.byteLength; i++) {
            const chunkSize = view.getUint32(offset, true);
            const chunkType = view.getUint16(offset + 4, true);
            const dataOffset = offset + 6;
            const dataLen = chunkSize - 6;

            switch (chunkType) {
                case FLI_CHUNK_COLOR256:
                case FLI_CHUNK_COLOR64:
                    this._decodeColors(new Uint8Array(frameBuffer, dataOffset, dataLen));
                    this.paletteChanged = true;
                    break;
                case FLI_CHUNK_SS2:
                    this._decodeSS2(new Uint8Array(frameBuffer, dataOffset, dataLen));
                    break;
                case FLI_CHUNK_LC:
                    this._decodeLC(new Uint8Array(frameBuffer, dataOffset, dataLen));
                    break;
                case FLI_CHUNK_BLACK:
                    this.pixels.fill(0);
                    break;
                case FLI_CHUNK_BRUN:
                    this._decodeBrun(new Uint8Array(frameBuffer, dataOffset, dataLen));
                    break;
                case FLI_CHUNK_COPY:
                    this._decodeCopy(new Uint8Array(frameBuffer, dataOffset, dataLen));
                    break;
            }

            offset += chunkSize;
        }

        return this.paletteChanged;
    }

    /** Convert current indexed pixels to RGBA. */
    toRGBA() {
        const rgba = new Uint8Array(this.width * this.height * 4);
        const pal = this.palette;
        const pix = this.pixels;
        const w = this.width;
        const h = this.height;
        const stride = this.stride;

        for (let y = 0; y < h; y++) {
            const srcRow = stride * y;
            const dstRow = w * y * 4;
            for (let x = 0; x < w; x++) {
                const idx = pix[srcRow + x];
                const pi = idx * 3;
                const di = dstRow + x * 4;
                rgba[di] = pal[pi];
                rgba[di + 1] = pal[pi + 1];
                rgba[di + 2] = pal[pi + 2];
                rgba[di + 3] = 255;
            }
        }
        return rgba;
    }

    /** Convert to ImageData for canvas/texture upload. */
    toImageData() {
        const rgba = this.toRGBA();
        return new ImageData(new Uint8ClampedArray(rgba.buffer), this.width, this.height);
    }

    // ── Palette decoder ──

    _decodeColors(data) {
        let pos = 0;
        if (data.length < 2) return;
        const packets = data[pos] | (data[pos + 1] << 8);
        pos += 2;

        let colorIndex = 0;
        for (let p = 0; p < packets; p++) {
            if (pos + 1 >= data.length) return;
            colorIndex += data[pos++];
            let colorCount = data[pos++];
            if (colorCount === 0) colorCount = 256;

            if (pos + colorCount * 3 > data.length) return;
            for (let c = 0; c < colorCount; c++) {
                const pi = (colorIndex + c) * 3;
                this.palette[pi] = data[pos++];
                this.palette[pi + 1] = data[pos++];
                this.palette[pi + 2] = data[pos++];
            }
            colorIndex += colorCount;
        }
    }

    // ── Pixel decoders ──

    /** BRUN: Byte run-length compression (first frame). Rows bottom-to-top. */
    _decodeBrun(data) {
        let pos = 0;
        const w = this.width, h = this.height, stride = this.stride, pix = this.pixels;

        for (let row = h - 1; row >= 0; row--) {
            const rowOffset = stride * row;
            let col = 0;
            pos++; // skip packet count byte

            while (col < w) {
                let count = data[pos++];
                if (count > 127) count -= 256;

                if (count >= 0) {
                    const pixel = data[pos++];
                    for (let i = 0; i < count && col < w; i++, col++) {
                        pix[rowOffset + col] = pixel;
                    }
                } else {
                    count = -count;
                    for (let i = 0; i < count && col < w; i++, col++) {
                        pix[rowOffset + col] = data[pos++];
                    }
                }
            }
        }
    }

    /** LC: Line compression (byte-oriented delta). */
    _decodeLC(data) {
        let pos = 0;
        const h = this.height, stride = this.stride, pix = this.pixels, w = this.width;

        if (data.length < 4) return;
        const skipLines = data[pos] | (data[pos + 1] << 8);
        pos += 2;
        const lineCount = data[pos] | (data[pos + 1] << 8);
        pos += 2;

        let row = h - skipLines - 1;

        for (let line = 0; line < lineCount; line++) {
            const packets = data[pos++];
            let col = 0;
            const rowOffset = stride * row;

            for (let p = 0; p < packets; p++) {
                col += data[pos++];

                let type = data[pos++];
                if (type > 127) type -= 256;

                if (type < 0) {
                    const count = -type;
                    const pixel = data[pos++];
                    for (let i = 0; i < count && col < w; i++, col++) {
                        pix[rowOffset + col] = pixel;
                    }
                } else {
                    for (let i = 0; i < type && col < w; i++, col++) {
                        pix[rowOffset + col] = data[pos++];
                    }
                }
            }
            row--;
        }
    }

    /**
     * SS2: Word-oriented delta compression.
     * 1:1 translation of DecodeSS2 in flic.cpp:357-453.
     */
    _decodeSS2(data) {
        let pos = 0;
        const h = this.height, w = this.width, stride = this.stride;
        const pix = this.pixels, xmax = w - 1;

        if (data.length < 2) return;
        let lines = data[pos] | (data[pos + 1] << 8);
        pos += 2;
        let row = h - 1;

        let state = 0, token = 0, column = 0;

        for (;;) {
            switch (state) {
            case 1: // skip_lines
                row += token;
                // fall through to start_packet
            case 0: // start_packet
                token = this._readS16LE(data, pos); pos += 2;
                if (token >= 0) { state = 2; continue; }
                if ((token & 0xFFFF) & 0x4000) { state = 1; continue; }

                // Last byte
                if (row >= 0 && row < h) pix[stride * row + xmax] = token & 0xff;
                token = this._readS16LE(data, pos); pos += 2;

                if (!token) {
                    row--;
                    if (--lines > 0) { state = 0; continue; }
                    return;
                }
                // fall through to column_loop

            case 2: // column_loop
                column = 0;
                // fall through to column_loop_inner

            case 3: { // column_loop_inner
                column += data[pos++];
                let type = data[pos++];
                if (type > 127) type -= 256;
                type += type;

                if (type >= 0) {
                    // Literal copy
                    const end = Math.min(column + type, w);
                    for (let i = column; i < end; i++) {
                        pix[stride * row + i] = data[pos + (i - column)];
                    }
                    column += type;
                    pos += type;

                    if (--token !== 0) { state = 3; continue; }
                    row--;
                    if (--lines > 0) { state = 0; continue; }
                    return;
                }

                // Word run
                type = -type;
                const lo = data[pos++];
                const hi = data[pos++];
                const end = Math.min(column + type, w);
                for (let i = column; i < end; i++) {
                    pix[stride * row + i] = ((i - column) & 1) ? hi : lo;
                }
                column += type;

                if (--token !== 0) { state = 3; continue; }
                row--;
                if (--lines > 0) { state = 0; continue; }
                return;
            }
            }
        }
    }

    /** Read little-endian signed 16-bit value. */
    _readS16LE(data, pos) {
        const v = data[pos] | (data[pos + 1] << 8);
        return v > 32767 ? v - 65536 : v;
    }

    /** COPY: Uncompressed frame data. Rows bottom-to-top. */
    _decodeCopy(data) {
        let pos = 0;
        const w = this.width, h = this.height, stride = this.stride, pix = this.pixels;

        for (let row = h - 1; row >= 0; row--) {
            const rowOffset = stride * row;
            for (let x = 0; x < w; x++) {
                pix[rowOffset + x] = data[pos++];
            }
        }
    }
}
