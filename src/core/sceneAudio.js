/**
 * Multi-track audio player for scene animations.
 * Each track has a time offset and starts at the appropriate point
 * during playback, matching AudioPlayer::Tick() from
 * isle-portable/extensions/src/multiplayer/animation/audioplayer.cpp.
 */

/**
 * Build a WAV file ArrayBuffer from raw PCM data and WaveFormat fields.
 * Reuses the same pattern as assetLoader.js buildWav().
 * @param {ArrayBuffer} pcmData - Raw PCM audio data
 * @param {Object} format - WaveFormat fields
 * @returns {ArrayBuffer}
 */
function buildWavFromPCM(pcmData, format) {
    const dataSize = pcmData.byteLength;
    const wavSize = 44 + dataSize;
    const wav = new ArrayBuffer(wavSize);
    const view = new DataView(wav);
    const bytes = new Uint8Array(wav);

    // RIFF header
    bytes.set([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    view.setUint32(4, wavSize - 8, true);
    bytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

    // fmt chunk
    bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, format.wFormatTag || 1, true);
    view.setUint16(22, format.nChannels || 1, true);
    view.setUint32(24, format.nSamplesPerSec || 22050, true);
    view.setUint32(28, format.nAvgBytesPerSec || 22050, true);
    view.setUint16(32, format.nBlockAlign || 1, true);
    view.setUint16(34, format.wBitsPerSample || 8, true);

    // data chunk
    bytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    view.setUint32(40, dataSize, true);
    bytes.set(new Uint8Array(pcmData), 44);

    return wav;
}

export class SceneAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.tracks = [];     // { buffer, timeOffset, source, started }
        this.volume = 1.0;
        this._muted = false;
        this.blocked = false;
    }

    /**
     * Initialize with audio tracks from SceneAnimData.
     * @param {import('./formats/SICompositeParser.js').AudioTrack[]} audioTracks
     */
    async init(audioTracks) {
        if (audioTracks.length === 0) return;

        this.audioContext = new AudioContext();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.audioContext.destination);

        for (const track of audioTracks) {
            const wav = buildWavFromPCM(track.pcmData, track.format);
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(wav);
                // Convert SI volume (0-79) to gain (0-1)
                const gain = Math.min(track.volume / 79, 1.0);
                this.tracks.push({
                    buffer: audioBuffer,
                    timeOffset: track.timeOffset,
                    gain,
                    source: null,
                    started: false,
                });
            } catch (e) {
                console.warn('[SceneAudio] Failed to decode track:', track.mediaSrcPath, e);
            }
        }
    }

    /**
     * Called each frame with elapsed time in ms.
     * Starts tracks whose timeOffset has been reached.
     */
    tick(elapsedMs) {
        if (!this.audioContext || this.blocked) return;

        for (const track of this.tracks) {
            if (!track.started && elapsedMs >= track.timeOffset) {
                const source = this.audioContext.createBufferSource();
                source.buffer = track.buffer;

                // Per-track gain node
                const trackGain = this.audioContext.createGain();
                trackGain.gain.value = track.gain;
                source.connect(trackGain);
                trackGain.connect(this.gainNode);

                source.start();
                track.source = source;
                track.started = true;
            }
        }
    }

    pause() {
        this.audioContext?.suspend();
    }

    async resume() {
        if (!this.audioContext) return true;
        await this.audioContext.resume();
        this.blocked = this.audioContext.state !== 'running';
        return !this.blocked;
    }

    stop() {
        for (const track of this.tracks) {
            if (track.source) {
                try { track.source.stop(); } catch { /* already stopped */ }
                track.source = null;
            }
            track.started = false;
        }
    }

    /**
     * Seek to a specific time. Stops all tracks and restarts those
     * that should be mid-playback at the given time.
     * @param {number} elapsedMs - Target time in milliseconds
     */
    seek(elapsedMs) {
        if (!this.audioContext) return;
        this.stop();

        for (const track of this.tracks) {
            if (elapsedMs >= track.timeOffset) {
                const offsetSec = (elapsedMs - track.timeOffset) / 1000;
                if (offsetSec < track.buffer.duration) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = track.buffer;
                    const trackGain = this.audioContext.createGain();
                    trackGain.gain.value = track.gain;
                    source.connect(trackGain);
                    trackGain.connect(this.gainNode);
                    source.start(0, offsetSec);
                    track.source = source;
                    track.started = true;
                } else {
                    track.started = true;
                }
            }
        }
    }

    get canAutoplay() {
        return !this.audioContext || this.audioContext.state === 'running';
    }

    get muted() {
        return this._muted;
    }

    set muted(value) {
        this._muted = value;
        if (this.gainNode) {
            this.gainNode.gain.value = value ? 0 : this.volume;
        }
    }

    /** Maximum end time (ms) across all audio tracks. */
    get maxEndTime() {
        let max = 0;
        for (const track of this.tracks) {
            const endMs = track.timeOffset + track.buffer.duration * 1000;
            if (endMs > max) max = endMs;
        }
        return max;
    }

    dispose() {
        this.stop();
        this.audioContext?.close();
        this.audioContext = null;
        this.gainNode = null;
        this.tracks = [];
    }
}
