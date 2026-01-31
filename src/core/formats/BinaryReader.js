/**
 * Little-endian binary reader for parsing save game files
 */
export class BinaryReader {
    /**
     * @param {ArrayBuffer} buffer - The binary data to read
     */
    constructor(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    /**
     * Read signed 8-bit integer
     * @returns {number}
     */
    readS8() {
        const value = this.view.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * Read unsigned 8-bit integer
     * @returns {number}
     */
    readU8() {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * Read signed 16-bit integer (little-endian)
     * @returns {number}
     */
    readS16() {
        const value = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    /**
     * Read unsigned 16-bit integer (little-endian)
     * @returns {number}
     */
    readU16() {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    /**
     * Read signed 32-bit integer (little-endian)
     * @returns {number}
     */
    readS32() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Read unsigned 32-bit integer (little-endian)
     * @returns {number}
     */
    readU32() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Read 32-bit float (little-endian)
     * @returns {number}
     */
    readF32() {
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Read ASCII string of specified length
     * @param {number} length - Number of bytes to read
     * @returns {string}
     */
    readString(length) {
        const bytes = new Uint8Array(this.buffer, this.offset, length);
        this.offset += length;
        return String.fromCharCode(...bytes);
    }

    /**
     * Read length-prefixed string (U8 length prefix)
     * @returns {string}
     */
    readLengthPrefixedString() {
        const length = this.readU8();
        return this.readString(length);
    }

    /**
     * Read length-prefixed string (S16 length prefix)
     * @returns {string}
     */
    readLengthPrefixedStringS16() {
        const length = this.readS16();
        if (length <= 0) return '';
        return this.readString(length);
    }

    /**
     * Seek to absolute position
     * @param {number} offset
     */
    seek(offset) {
        this.offset = offset;
    }

    /**
     * Skip bytes relative to current position
     * @param {number} bytes
     */
    skip(bytes) {
        this.offset += bytes;
    }

    /**
     * Get current position
     * @returns {number}
     */
    tell() {
        return this.offset;
    }

    /**
     * Get remaining bytes
     * @returns {number}
     */
    remaining() {
        return this.buffer.byteLength - this.offset;
    }

    /**
     * Check if at end of buffer
     * @returns {boolean}
     */
    eof() {
        return this.offset >= this.buffer.byteLength;
    }

    /**
     * Slice out a portion of the buffer
     * @param {number} length
     * @returns {ArrayBuffer}
     */
    slice(length) {
        const sliced = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return sliced;
    }
}
