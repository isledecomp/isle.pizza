/**
 * Parser for LEGO Island SI (Streamed Interleaf) files.
 * Reimplements the core of libweaver's si::Interleaf in JavaScript.
 *
 * SI files use a RIFF container format with custom chunk types:
 *   RIFF OMNI → MxHd (header) → MxOf (offset table) → LIST MxSt (data)
 *
 * Each object is defined by an MxOb chunk with metadata fields, and its
 * binary data lives in interleaved MxCh chunks within the object's MxSt.
 *
 * Uses HTTP Range requests to fetch only the needed portions of the file,
 * just like libweaver's header-only + lazy loading approach.
 */

import { BinaryReader } from './BinaryReader.js';

// RIFF FourCC constants (little-endian u32)
const RIFF = 0x46464952;
const LIST = 0x5453494c;
const MxHd = 0x6448784d;
const MxOf = 0x664f784d;
const MxSt = 0x7453784d;
const MxOb = 0x624f784d;
const MxCh = 0x6843784d;
const MxDa = 0x6144784d;
const OMNI = 0x494e4d4f;
const pad_ = 0x20646170;

// MxOb::Type enum
export const SIObjectType = Object.freeze({
    Null: -1,
    Video: 0x03,
    Sound: 0x04,
    World: 0x06,
    Presenter: 0x07,
    Event: 0x08,
    Animation: 0x09,
    Bitmap: 0x0a,
    Object3D: 0x0b,
});

// MxOb::FileType FourCC values
export const SIFileType = Object.freeze({
    WAV: 0x56415720,  // 'WAV '
    STL: 0x4c545320,  // 'STL '
    FLC: 0x434c4620,  // 'FLC '
    SMK: 0x4b4d5320,  // 'SMK '
    OBJ: 0x4a424f20,  // 'OBJ '
});

// MxCh flags
const MXCH_FLAG_SPLIT = 0x10;
const MXCH_FLAG_END = 0x02;
const MXCH_HEADER_SIZE = 14; // flags(2) + objectId(4) + time(4) + dataSize(4)

/** Seek past a RIFF chunk, accounting for 2-byte padding alignment. */
function seekPastChunk(r, chunkDataStart, chunkSize) {
    r.seek(Math.min(chunkDataStart + chunkSize + (chunkSize % 2), r.buffer.byteLength));
}

/**
 * Parsed SI object with all MxOb fields.
 */
export class SIObject {
    constructor() {
        this.type = SIObjectType.Null;
        this.presenter = '';
        this.name = '';
        this.id = 0;
        this.flags = 0;
        this.duration = 0;
        this.loops = 0;
        this.location = [0, 0, 0];
        this.direction = [0, 0, 0];
        this.up = [0, 0, 0];
        this.extra = null;       // Uint8Array or null
        this.filename = '';
        this.filetype = 0;
        this.volume = 0;
        this.timeOffset = 0;     // Set from second MxCh chunk's time field
        this.children = [];      // SIObject[] for composite objects
        this.data = [];          // ArrayBuffer[] - reassembled MxCh chunk data
    }

    /** Get extra field as a string (stripping null terminators). */
    get extraString() {
        if (!this.extra || this.extra.length === 0) return '';
        let end = this.extra.length;
        while (end > 0 && this.extra[end - 1] === 0) end--;
        return new TextDecoder().decode(this.extra.subarray(0, end));
    }
}

/**
 * SI file reader with lazy object loading via HTTP Range requests.
 * Mirrors sireader.cpp + si::Interleaf from libweaver.
 *
 * Usage:
 *   const reader = new SIReader();
 *   await reader.open('/LEGO/Scripts/Isle/ISLE.SI');
 *   const obj = await reader.readObject(500);
 */
export class SIReader {
    constructor() {
        this.url = null;
        this.language = null;
        this.version = 0;
        this.bufferSize = 0;
        this.bufferCount = 0;
        this.slotOffsets = [];   // u32[] - file offsets per slot index
        this.objectCache = new Map(); // objectId → SIObject
    }

    /**
     * Open an SI file: fetch header (MxHd + MxOf) via Range request.
     * @param {string} url - URL to the SI file
     * @param {string|null} [language] - Language code for Accept-Language header
     */
    async open(url, language = null) {
        this.url = url;
        this.language = language;

        // Fetch first 16KB to get RIFF header + MxHd + start of MxOf.
        // MxOf for ISLE.SI (~1200 objects) is about 4808 bytes, well within 16KB.
        let headerBuf = await this._fetchRange(0, 16384);
        let r = new BinaryReader(headerBuf);

        // RIFF header
        const riffId = r.readU32();
        if (riffId !== RIFF) throw new Error(`Not a RIFF file (0x${riffId.toString(16)})`);
        r.readU32(); // riffSize
        const riffFormat = r.readU32();
        if (riffFormat !== OMNI) throw new Error(`Not an OMNI file (0x${riffFormat.toString(16)})`);

        // Scan for MxHd and MxOf
        let mxOfStart = -1;
        let mxOfSize = 0;

        while (r.remaining() > 8) {
            const chunkId = r.readU32();
            const chunkSize = r.readU32();
            const chunkDataStart = r.tell();

            if (chunkId === MxHd) {
                this.version = r.readU32();
                this.bufferSize = r.readU32();
                this.bufferCount = r.readU32();
            } else if (chunkId === MxOf) {
                mxOfStart = chunkDataStart;
                mxOfSize = chunkSize;
                // Check if MxOf fits within our initial fetch
                if (chunkDataStart + chunkSize <= headerBuf.byteLength) {
                    this._parseMxOf(r, chunkSize);
                }
                break;
            }

            r.seek(chunkDataStart + chunkSize + (chunkSize % 2));
        }

        if (mxOfStart < 0) throw new Error('MxOf chunk not found');

        // If MxOf didn't fit in the initial fetch, fetch the rest
        if (this.slotOffsets.length === 0) {
            const fullHeader = await this._fetchRange(0, mxOfStart + mxOfSize);
            r = new BinaryReader(fullHeader);
            r.seek(mxOfStart);
            this._parseMxOf(r, mxOfSize);
        }

        if (this.slotOffsets.length === 0) throw new Error('Empty MxOf offset table');
    }

    _parseMxOf(r, chunkSize) {
        const count = r.readU32();
        const entryCount = (chunkSize - 4) / 4;
        this.slotOffsets = [];
        for (let i = 0; i < entryCount; i++) {
            this.slotOffsets.push(r.readU32());
        }
    }

    get slotCount() {
        return this.slotOffsets.length;
    }

    /**
     * Read and parse a specific object by slot index (objectId).
     * Fetches the object's MxSt chunk via Range request.
     * For composite objects, also reads child MxOb definitions and MxCh data.
     * @param {number} objectId - Slot index in the offset table
     * @returns {Promise<SIObject|null>}
     */
    async readObject(objectId) {
        if (this.objectCache.has(objectId)) {
            return this.objectCache.get(objectId);
        }

        if (objectId >= this.slotOffsets.length) return null;
        const offset = this.slotOffsets[objectId];
        if (offset === 0) return null;

        // Step 1: Fetch the chunk header (8 bytes) to learn the MxSt size
        const headerBuf = await this._fetchRange(offset, 8);
        const hdr = new BinaryReader(headerBuf);
        const chunkId = hdr.readU32();
        const chunkSize = hdr.readU32();

        // Step 2: Fetch the full chunk (header + data)
        const totalSize = 8 + chunkSize + (chunkSize % 2);
        const chunkBuf = await this._fetchRange(offset, totalSize);

        // Step 3: Parse the chunk tree
        const r = new BinaryReader(chunkBuf);
        const obj = this._readChunkTree(r, 0);

        if (obj) {
            this.objectCache.set(objectId, obj);
        }
        return obj;
    }

    /**
     * Read a chunk tree from a buffer.
     * @param {BinaryReader} r - Reader positioned at start of a RIFF chunk
     * @param {number} baseOffset - File offset that r.offset=0 corresponds to
     * @returns {SIObject|null}
     */
    _readChunkTree(r, baseOffset) {
        if (r.remaining() < 8) return null;

        const chunkId = r.readU32();
        const chunkSize = r.readU32();
        const chunkStart = r.tell();
        const chunkEnd = chunkStart + chunkSize;

        switch (chunkId) {
            case MxSt: {
                // Container: read children within bounds
                let obj = null;
                while (r.tell() < chunkEnd && r.remaining() >= 8) {
                    const child = this._readChunkTree(r, baseOffset);
                    if (child instanceof SIObject && !obj) obj = child;
                }
                seekPastChunk(r, chunkStart, chunkSize);
                return obj;
            }

            case MxOb: {
                const obj = this._parseMxOb(r, chunkEnd);

                // Check for child LIST within MxOb boundary
                while (r.tell() < chunkEnd && r.remaining() >= 8) {
                    const innerChunkId = r.readU32();
                    const innerChunkSize = r.readU32();
                    const innerStart = r.tell();

                    if (innerChunkId === LIST && r.remaining() >= 8) {
                        const listType = r.readU32();
                        if (listType === MxCh) {
                            // Child object list
                            const childCount = r.readU32();
                            for (let i = 0; i < childCount && r.tell() < innerStart + innerChunkSize; i++) {
                                const child = this._readChunkTree(r, baseOffset);
                                if (child instanceof SIObject) {
                                    obj.children.push(child);
                                }
                            }
                        }
                    }
                    seekPastChunk(r, innerStart, innerChunkSize);
                }

                seekPastChunk(r, chunkStart, chunkSize);
                return obj;
            }

            case LIST: {
                if (r.remaining() < 4) { seekPastChunk(r, chunkStart, chunkSize); return null; }
                const listType = r.readU32();

                if (listType === MxDa || listType === MxSt) {
                    // Read children within this LIST
                    let obj = null;
                    while (r.tell() < chunkEnd && r.remaining() >= 8) {
                        const child = this._readChunkTree(r, baseOffset);
                        if (child instanceof SIObject && !obj) obj = child;
                    }
                    seekPastChunk(r, chunkStart, chunkSize);
                    return obj;
                }

                seekPastChunk(r, chunkStart, chunkSize);
                return null;
            }

            case MxCh: {
                // Data chunk - handled by _collectMxChFromBuffer
                seekPastChunk(r, chunkStart, chunkSize);
                return null;
            }

            case pad_:
            default: {
                seekPastChunk(r, chunkStart, chunkSize);
                return null;
            }
        }
    }

    /**
     * Parse MxOb fields. Field order matches libweaver's ReadObject() exactly.
     */
    _parseMxOb(r, chunkEnd) {
        const obj = new SIObject();

        obj.type = r.readU16();
        obj.presenter = this._readNullString(r);
        r.skip(4); // unknown1
        obj.name = this._readNullString(r);
        obj.id = r.readU32();
        obj.flags = r.readU32();
        r.skip(4); // unknown4
        obj.duration = r.readU32();
        obj.loops = r.readU32();

        // Location, Direction, Up - 3x Vector3 (3x f64 each = 72 bytes)
        obj.location = [r.readF64(), r.readF64(), r.readF64()];
        obj.direction = [r.readF64(), r.readF64(), r.readF64()];
        obj.up = [r.readF64(), r.readF64(), r.readF64()];

        // Extra data (u16 length prefix)
        const extraSize = r.readU16();
        if (extraSize > 0) {
            obj.extra = new Uint8Array(r.slice(extraSize));
        }

        // Conditional fields: only for non-Presenter/World/Animation types
        if (obj.type !== SIObjectType.Presenter &&
            obj.type !== SIObjectType.World &&
            obj.type !== SIObjectType.Animation) {
            obj.filename = this._readNullString(r);
            r.skip(4); // unknown26
            r.skip(4); // unknown27
            r.skip(4); // unknown28
            obj.filetype = r.readU32();
            r.skip(4); // unknown29
            r.skip(4); // unknown30

            if (obj.filetype === SIFileType.WAV) {
                obj.volume = r.readU32();
            }
        }

        return obj;
    }

    /**
     * After reading MxOb tree structure, collect MxCh data for all objects.
     * Scans the same buffer that was fetched for readObject().
     * @param {SIObject} rootObj - The root composite object
     * @param {ArrayBuffer} buffer - The fetched chunk data
     */
    _collectMxChFromBuffer(rootObj, buffer) {
        const targetIds = new Set();
        const objectsById = new Map();

        const registerObj = (obj) => {
            targetIds.add(obj.id);
            objectsById.set(obj.id, obj);
            for (const child of obj.children) registerObj(child);
        };
        registerObj(rootObj);

        // Phase 1: Collect MxCh entries per object, keyed by time to deduplicate.
        // The SI streaming system can have multiple chunks with the same time for the
        // same object (from buffer re-interleaving). The last one wins.
        const entriesByObj = new Map(); // objectId → Map<time, {data, flags, dataSize, fileOrder}>
        const buf = new Uint8Array(buffer);
        const view = new DataView(buffer);
        const mxChSig = [0x4d, 0x78, 0x43, 0x68]; // 'MxCh'
        let fileOrder = 0;

        let pos = 0;
        while (pos <= buf.length - MXCH_HEADER_SIZE - 8) {
            if (buf[pos] !== mxChSig[0] || buf[pos + 1] !== mxChSig[1] ||
                buf[pos + 2] !== mxChSig[2] || buf[pos + 3] !== mxChSig[3]) {
                pos++;
                continue;
            }

            const chunkSize = view.getUint32(pos + 4, true);
            if (chunkSize < MXCH_HEADER_SIZE || pos + 8 + chunkSize > buf.length) {
                pos += 4;
                continue;
            }

            const flags = view.getUint16(pos + 8, true);
            const objectId = view.getUint32(pos + 10, true);
            const time = view.getUint32(pos + 14, true);
            const dataSize = view.getUint32(pos + 18, true);

            if (targetIds.has(objectId) && !(flags & MXCH_FLAG_END)) {
                const payloadSize = chunkSize - MXCH_HEADER_SIZE;
                const dataStart = pos + 8 + MXCH_HEADER_SIZE;

                if (payloadSize > 0 && dataStart + payloadSize <= buf.length) {
                    const chunkData = buffer.slice(dataStart, dataStart + payloadSize);
                    if (!entriesByObj.has(objectId)) entriesByObj.set(objectId, new Map());
                    const objEntries = entriesByObj.get(objectId);

                    if (flags & MXCH_FLAG_SPLIT) {
                        // Split chunks: append to existing entry with same time
                        const existing = objEntries.get(time);
                        if (existing && existing.flags & MXCH_FLAG_SPLIT) {
                            const combined = new Uint8Array(existing.data.byteLength + chunkData.byteLength);
                            combined.set(new Uint8Array(existing.data), 0);
                            combined.set(new Uint8Array(chunkData), existing.data.byteLength);
                            existing.data = combined.buffer;
                        } else {
                            objEntries.set(time, { data: chunkData, flags, dataSize, fileOrder: fileOrder++ });
                        }
                    } else {
                        // Non-split: last chunk with this time wins (overwrite)
                        objEntries.set(time, { data: chunkData, flags, dataSize, fileOrder: fileOrder++ });
                    }
                }
            }

            pos += 8 + chunkSize + (chunkSize % 2);
        }

        // Phase 2: Sort deduplicated entries by time and assemble into obj.data.
        // The header chunk (time=0xFFFFFFFF) must be first (data[0]), followed by
        // frame/data chunks sorted by ascending time.
        for (const [objectId, timeMap] of entriesByObj) {
            const obj = objectsById.get(objectId);
            const sorted = [...timeMap.entries()].sort((a, b) => {
                // 0xFFFFFFFF (header) sorts first; everything else by time ascending
                const aIsHeader = a[0] === 0xFFFFFFFF;
                const bIsHeader = b[0] === 0xFFFFFFFF;
                if (aIsHeader) return -1;
                if (bIsHeader) return 1;
                return a[0] - b[0];
            });

            for (const [time, entry] of sorted) {
                obj.data.push(entry.data);
                if (obj.data.length === 2) obj.timeOffset = time;
            }
        }
    }

    /**
     * Read object and collect its data in a single operation.
     * This is the main entry point for scene loading.
     * @param {number} objectId - Slot index
     * @returns {Promise<SIObject|null>}
     */
    async readObjectWithData(objectId) {
        if (this.objectCache.has(objectId)) {
            return this.objectCache.get(objectId);
        }

        if (objectId >= this.slotOffsets.length) return null;
        const offset = this.slotOffsets[objectId];
        if (offset === 0) return null;

        // Fetch the chunk header to learn total size
        const headerBuf = await this._fetchRange(offset, 8);
        const hdr = new BinaryReader(headerBuf);
        const chunkId = hdr.readU32();
        const chunkSize = hdr.readU32();

        // Fetch the full MxSt chunk (contains MxOb definitions AND MxCh data)
        const totalSize = 8 + chunkSize + (chunkSize % 2);
        const chunkBuf = await this._fetchRange(offset, totalSize);

        // Parse the object tree
        const r = new BinaryReader(chunkBuf);
        const obj = this._readChunkTree(r, offset);

        if (obj) {
            // Collect MxCh data from the same buffer
            this._collectMxChFromBuffer(obj, chunkBuf);
            this.objectCache.set(objectId, obj);
        }

        return obj;
    }

    /**
     * Fetch a byte range from the SI file.
     * @param {number} start - Start byte offset
     * @param {number} length - Number of bytes to fetch
     * @returns {Promise<ArrayBuffer>}
     */
    async _fetchRange(start, length) {
        const end = start + length - 1;
        const headers = { 'Range': `bytes=${start}-${end}` };
        if (this.language) {
            headers['Accept-Language'] = this.language;
        }
        const response = await fetch(this.url, { headers });

        if (response.status === 206) {
            // Partial content - expected
            return response.arrayBuffer();
        } else if (response.ok) {
            // Server doesn't support Range (returned full file).
            // Slice the portion we need.
            const fullBuffer = await response.arrayBuffer();
            return fullBuffer.slice(start, start + length);
        } else {
            throw new Error(`Range request failed: ${response.status} ${response.statusText}`);
        }
    }

    /** Read null-terminated ASCII string. */
    _readNullString(r) {
        const bytes = [];
        while (r.remaining() > 0) {
            const b = r.readU8();
            if (b === 0) break;
            bytes.push(b);
        }
        return String.fromCharCode(...bytes);
    }

}

// ── Per-world SI file URL mapping ──

const SI_PATHS = Object.freeze({
    0: '/LEGO/Scripts/Isle/ISLE.SI',
    1: '/LEGO/Scripts/Act2/ACT2MAIN.SI',
    2: '/LEGO/Scripts/Act3/ACT3.SI',
});

/** Singleton cache: worldSlot → Promise<SIReader>. */
const siReaderCache = new Map();

/**
 * Get or create an SIReader for the given world slot.
 * The reader is opened once (header-only) and cached.
 * @param {number} worldSlot - 0=ACT1, 1=ACT2, 2=ACT3
 * @param {string|null} [language] - Language code for Accept-Language header
 * @returns {Promise<SIReader>}
 */
export async function getSIReader(worldSlot, language = null) {
    const cacheKey = language ? `${worldSlot}:${language}` : worldSlot;
    if (siReaderCache.has(cacheKey)) {
        return siReaderCache.get(cacheKey);
    }

    const url = SI_PATHS[worldSlot];
    if (!url) throw new Error(`Unknown world slot: ${worldSlot}`);

    const reader = new SIReader();
    const promise = reader.open(url, language).then(() => {
        siReaderCache.set(cacheKey, reader);
        return reader;
    });
    siReaderCache.set(cacheKey, promise);

    return promise;
}

/**
 * Derive worldSlot from an animIndex.
 * animIndex = (worldSlot << 14) | localIndex
 */
export function decodeAnimIndex(animIndex) {
    const worldSlot = animIndex >> 14;
    const localIndex = animIndex & 0x3fff;
    return { worldSlot, localIndex };
}
