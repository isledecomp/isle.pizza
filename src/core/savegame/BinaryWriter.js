/**
 * Little-endian binary writer for serializing save game files
 */
export class BinaryWriter {
    /**
     * @param {number} initialSize - Initial buffer size (will grow as needed)
     */
    constructor(initialSize = 1024) {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
        this.offset = 0;
    }

    /**
     * Ensure buffer has capacity for additional bytes
     * @param {number} additionalBytes
     */
    ensureCapacity(additionalBytes) {
        const required = this.offset + additionalBytes;
        if (required > this.buffer.byteLength) {
            const newSize = Math.max(required, this.buffer.byteLength * 2);
            const newBuffer = new ArrayBuffer(newSize);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }

    /**
     * Write signed 8-bit integer
     * @param {number} value
     */
    writeS8(value) {
        this.ensureCapacity(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    /**
     * Write unsigned 8-bit integer
     * @param {number} value
     */
    writeU8(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    /**
     * Write signed 16-bit integer (little-endian)
     * @param {number} value
     */
    writeS16(value) {
        this.ensureCapacity(2);
        this.view.setInt16(this.offset, value, true);
        this.offset += 2;
    }

    /**
     * Write unsigned 16-bit integer (little-endian)
     * @param {number} value
     */
    writeU16(value) {
        this.ensureCapacity(2);
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }

    /**
     * Write signed 32-bit integer (little-endian)
     * @param {number} value
     */
    writeS32(value) {
        this.ensureCapacity(4);
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
    }

    /**
     * Write unsigned 32-bit integer (little-endian)
     * @param {number} value
     */
    writeU32(value) {
        this.ensureCapacity(4);
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }

    /**
     * Write 32-bit float (little-endian)
     * @param {number} value
     */
    writeF32(value) {
        this.ensureCapacity(4);
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
    }

    /**
     * Write ASCII string (no length prefix)
     * @param {string} str
     */
    writeString(str) {
        this.ensureCapacity(str.length);
        for (let i = 0; i < str.length; i++) {
            this.view.setUint8(this.offset + i, str.charCodeAt(i));
        }
        this.offset += str.length;
    }

    /**
     * Write length-prefixed string (U8 length prefix)
     * @param {string} str
     */
    writeLengthPrefixedString(str) {
        this.writeU8(str.length);
        this.writeString(str);
    }

    /**
     * Write length-prefixed string (S16 length prefix)
     * @param {string} str
     */
    writeLengthPrefixedStringS16(str) {
        this.writeS16(str.length);
        this.writeString(str);
    }

    /**
     * Write raw bytes
     * @param {Uint8Array|ArrayBuffer} data
     */
    writeBytes(data) {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        this.ensureCapacity(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
    }

    /**
     * Seek to absolute position
     * @param {number} offset
     */
    seek(offset) {
        this.ensureCapacity(offset - this.offset);
        this.offset = offset;
    }

    /**
     * Get current position
     * @returns {number}
     */
    tell() {
        return this.offset;
    }

    /**
     * Get the final buffer (trimmed to actual size)
     * @returns {ArrayBuffer}
     */
    toArrayBuffer() {
        return this.buffer.slice(0, this.offset);
    }

    /**
     * Get the final buffer as Uint8Array
     * @returns {Uint8Array}
     */
    toUint8Array() {
        return new Uint8Array(this.buffer, 0, this.offset);
    }
}
