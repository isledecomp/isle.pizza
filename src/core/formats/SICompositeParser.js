/**
 * Parses a composite SI object (scene animation) into its component parts:
 * animation tree, audio tracks, and phoneme (lip-sync) tracks.
 *
 * Mirrors Loader::ParseComposite() from
 * isle-portable/extensions/src/multiplayer/animation/loader.cpp
 */

import { SIFileType } from './SIParser.js';
import { parseAnimation } from './AnimationParser.js';
import { BinaryReader } from './BinaryReader.js';

/**
 * Parse a composite SI object into SceneAnimData.
 * @param {import('./SIParser.js').SIObject} composite - The composite SI object with children
 * @returns {SceneAnimData|null}
 */
export function parseComposite(composite) {
    const data = {
        anim: null,
        duration: 0,
        audioTracks: [],
        phonemeTracks: [],
        actionTransform: { location: [0, 0, 0], direction: [0, 0, 0], up: [0, 0, 0], valid: false },
        ptAtCamNames: [],
        hideOnStop: false,
    };

    let hasAnim = false;

    for (const child of composite.children) {
        const presenter = child.presenter || '';

        if (presenter.includes('LegoPhonemePresenter')) {
            parsePhonemeChild(child, data);
        } else if (presenter.includes('LegoAnimPresenter') || presenter.includes('LegoLoopingAnimPresenter')) {
            if (!hasAnim) {
                if (parseAnimationChild(child, data)) {
                    hasAnim = true;
                    parseExtraDirectives(child.extraString, data);

                    // Extract action transform - use child's vectors, fall back to composite
                    let source = child;
                    if (Math.abs(child.direction[0]) < 1e-7 &&
                        Math.abs(child.direction[1]) < 1e-7 &&
                        Math.abs(child.direction[2]) < 1e-7) {
                        source = composite;
                    }

                    data.actionTransform.location = [source.location[0], source.location[1], source.location[2]];
                    data.actionTransform.direction = [source.direction[0], source.direction[1], source.direction[2]];
                    data.actionTransform.up = [source.up[0], source.up[1], source.up[2]];
                    data.actionTransform.valid =
                        Math.abs(data.actionTransform.direction[0]) >= 4.768e-7 ||
                        Math.abs(data.actionTransform.direction[1]) >= 4.768e-7 ||
                        Math.abs(data.actionTransform.direction[2]) >= 4.768e-7;
                }
            }
        } else if (child.filetype === SIFileType.WAV) {
            const track = extractAudioTrack(child);
            if (track) data.audioTracks.push(track);
        }
    }

    return hasAnim ? data : null;
}

/**
 * Parse animation child: first data chunk contains LegoAnim binary.
 * Format: S32 magic (0x11) + F32 boundingRadius + F32[3] center + S32 parseScene + ...
 * The animation binary after the prefix is parseable by AnimationParser.
 *
 * Mirrors Loader::ParseAnimationChild().
 */
function parseAnimationChild(child, data) {
    if (!child.data || child.data.length === 0) return false;

    const buffer = child.data[0];
    if (buffer.byteLength < 4) return false;

    const view = new DataView(buffer);
    const magic = view.getInt32(0, true);
    if (magic !== 0x11) {
        console.warn(`[SIComposite] Unexpected animation magic: 0x${magic.toString(16)}`);
        return false;
    }

    // Parse the full animation tree using existing AnimationParser
    // The entire data[0] is the LegoAnim binary (AnimationParser expects magic 0x11 at offset 0)
    try {
        data.anim = parseAnimation(buffer);
        data.duration = data.anim.duration;
        return true;
    } catch (e) {
        console.error('[SIComposite] Failed to parse animation:', e);
        return false;
    }
}

/**
 * Parse phoneme child: FLC header + per-frame delta data.
 * data[0] = FLIC_HEADER (20 bytes minimum)
 * data[1..N] = per-frame FLC data
 *
 * Mirrors Loader::ParsePhonemeChild().
 */
function parsePhonemeChild(child, data) {
    if (!child.data || child.data.length < 1) return;

    const headerBuf = child.data[0];
    if (headerBuf.byteLength < 20) return;

    const hdr = new DataView(headerBuf);
    const flcHeader = {
        size: hdr.getUint32(0, true),
        type: hdr.getUint16(4, true),     // 0xaf12 for FLIC
        frames: hdr.getUint16(6, true),
        width: hdr.getUint16(8, true),
        height: hdr.getUint16(10, true),
        depth: hdr.getUint16(12, true),
        flags: hdr.getUint16(14, true),
        speed: hdr.getUint32(16, true),    // ms between frames
    };

    const frameData = [];
    for (let i = 1; i < child.data.length; i++) {
        if (child.data[i].byteLength < 20) {
            console.warn(`[SIComposite] Phoneme frame ${i - 1} too small (${child.data[i].byteLength} bytes), skipping`);
            continue;
        }
        frameData.push(child.data[i]);
    }

    // ROI name from extra field
    const roiName = child.extraString.trim();

    data.phonemeTracks.push({
        flcHeader,
        frameData,
        timeOffset: child.timeOffset,
        roiName,
        width: flcHeader.width,
        height: flcHeader.height,
    });
}

/**
 * Extract audio track: WaveFormat header + concatenated PCM data.
 * data[0] = WaveFormat (24 bytes)
 * data[1..N] = PCM audio blocks
 *
 * Mirrors SIReader::ExtractAudioTrack().
 */
function extractAudioTrack(child) {
    if (!child.data || child.data.length < 2) return null;

    const fmtBuf = child.data[0];
    if (fmtBuf.byteLength < 16) return null;

    const fmt = new DataView(fmtBuf);
    const format = {
        wFormatTag: fmt.getUint16(0, true),
        nChannels: fmt.getUint16(2, true),
        nSamplesPerSec: fmt.getUint32(4, true),
        nAvgBytesPerSec: fmt.getUint32(8, true),
        nBlockAlign: fmt.getUint16(12, true),
        wBitsPerSample: fmt.getUint16(14, true),
    };

    // Concatenate PCM blocks
    let totalPcm = 0;
    for (let i = 1; i < child.data.length; i++) {
        totalPcm += child.data[i].byteLength;
    }
    if (totalPcm === 0) return null;

    const pcmData = new Uint8Array(totalPcm);
    let offset = 0;
    for (let i = 1; i < child.data.length; i++) {
        pcmData.set(new Uint8Array(child.data[i]), offset);
        offset += child.data[i].byteLength;
    }

    return {
        pcmData: pcmData.buffer,
        format,
        volume: child.volume,
        timeOffset: child.timeOffset,
        mediaSrcPath: child.filename,
    };
}

/**
 * Parse HIDE_ON_STOP and PTATCAM directives from the extra string.
 * Mirrors Loader::ParseExtraDirectives().
 */
function parseExtraDirectives(extra, data) {
    if (!extra) return;

    if (extra.includes('HIDE_ON_STOP')) {
        data.hideOnStop = true;
    }

    const ptIdx = extra.indexOf('PTATCAM');
    if (ptIdx !== -1) {
        let pos = ptIdx + 7; // Skip 'PTATCAM'

        // Skip separator character: ':', ',', ' ', '\t', '='
        if (pos < extra.length && ':, \t='.includes(extra[pos])) {
            pos++;
        }

        // Extract value until space or end
        const endPos = extra.indexOf(' ', pos);
        const value = endPos !== -1 ? extra.substring(pos, endPos) : extra.substring(pos);

        // Split by ':' or ';'
        for (const token of value.split(/[:;]/)) {
            const trimmed = token.trim();
            if (trimmed) data.ptAtCamNames.push(trimmed);
        }
    }
}

/**
 * @typedef {Object} SceneAnimData
 * @property {Object} anim - Parsed animation tree from AnimationParser
 * @property {number} duration - Duration in ms
 * @property {AudioTrack[]} audioTracks
 * @property {PhonemeTrack[]} phonemeTracks
 * @property {{ location: number[], direction: number[], up: number[], valid: boolean }} actionTransform
 * @property {string[]} ptAtCamNames
 * @property {boolean} hideOnStop
 */

/**
 * @typedef {Object} AudioTrack
 * @property {ArrayBuffer} pcmData - Raw PCM audio data
 * @property {Object} format - WaveFormat fields
 * @property {number} volume - 0-79
 * @property {number} timeOffset - ms
 * @property {string} mediaSrcPath
 */

/**
 * @typedef {Object} PhonemeTrack
 * @property {Object} flcHeader - FLIC header fields
 * @property {ArrayBuffer[]} frameData - Per-frame FLC delta data
 * @property {number} timeOffset - ms
 * @property {string} roiName - Target actor ROI name
 * @property {number} width
 * @property {number} height
 */
