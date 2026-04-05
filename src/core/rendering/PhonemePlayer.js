/**
 * Phoneme (lip-sync) animation player for scene playback.
 * Decodes FLC frames and swaps the head texture.
 */

import { Texture, Mesh, Program } from 'ogl';
import { FlcDecoder } from '../formats/FlcDecoder.js';
import { LAMBERT_VERTEX, LAMBERT_FRAGMENT, LIGHT_UNIFORMS } from './LambertShader.js';

export class PhonemePlayer {
    constructor() {
        this.states = [];
    }

    /**
     * @param {import('../formats/SICompositeParser.js').PhonemeTrack[]} phonemeTracks
     * @param {Map<string, Map<string, Transform>>} actorContainers
     * @param {WebGL2RenderingContext} gl
     */
    init(phonemeTracks, actorContainers, gl) {
        this.dispose();

        for (const track of phonemeTracks) {
            if (!track.roiName || track.frameData.length === 0) continue;

            const targetName = track.roiName.toLowerCase();
            const partMap = actorContainers.get(targetName);
            if (!partMap) { console.warn(`[Phoneme] Actor not found: ${targetName}`); continue; }

            const headPart = partMap.get('part_head');
            if (!headPart) { console.warn(`[Phoneme] part_head not found for ${targetName}`); continue; }

            // Find ONLY textured meshes under head part.
            // Backend (LegoLOD::UpdateTextureInfo) only updates meshes with m_textured=TRUE.
            // The head has both textured meshes (face decal) and colored meshes (head shape).
            // We must only swap the face texture, not paint over the solid-color head shape.
            const headMeshes = [];
            headPart.traverse(n => {
                if (n instanceof Mesh) {
                    const ut = n.program?.uniforms?.uUseTexture?.value;
                    const hasImg = !!n.program?.uniforms?.tMap?.value?.image;
                    if (ut > 0.5 && hasImg) headMeshes.push(n);
                }
            });
            if (headMeshes.length === 0) { console.warn(`[Phoneme] No textured mesh under part_head of ${targetName}`); continue; }

            const decoder = new FlcDecoder(track.flcHeader);

            const canvas = document.createElement('canvas');
            canvas.width = track.width;
            canvas.height = track.height;
            const ctx = canvas.getContext('2d');

            const flcTexture = new Texture(gl, {
                image: canvas,
                magFilter: gl.NEAREST,
                minFilter: gl.NEAREST,
                wrapS: gl.REPEAT,
                wrapT: gl.REPEAT,
                generateMipmaps: false,
                flipY: true,
            });

            // Create a new program for the FLC texture
            const flcProgram = new Program(gl, {
                vertex: LAMBERT_VERTEX,
                fragment: LAMBERT_FRAGMENT,
                uniforms: {
                    ...LIGHT_UNIFORMS,
                    tMap: { value: flcTexture },
                    uUseTexture: { value: 1 },
                    uColor: { value: [1, 1, 1] },
                    uOpacity: { value: 1 },
                },
                cullFace: false,
            });

            // Save original programs for ALL head meshes so we can restore them
            const origPrograms = headMeshes.map(m => m.program);

            this.states.push({
                track, decoder, headMeshes, flcTexture, flcProgram, origPrograms,
                canvas, ctx, currentFrame: -1, gl,
            });
        }
    }

    tick(elapsedMs) {
        for (const state of this.states) {
            const { track, decoder, headMeshes, flcTexture, flcProgram, canvas, ctx } = state;

            const trackElapsed = elapsedMs - track.timeOffset;
            if (trackElapsed < 0) continue;

            const speed = track.flcHeader.speed || 100;
            const targetFrame = Math.min(
                Math.floor(trackElapsed / speed),
                track.frameData.length - 1
            );

            if (targetFrame <= state.currentFrame) continue;

            for (let f = state.currentFrame + 1; f <= targetFrame; f++) {
                if (f < track.frameData.length) decoder.decodeFrame(track.frameData[f]);
            }
            state.currentFrame = targetFrame;

            const imageData = decoder.toImageData();
            ctx.putImageData(imageData, 0, 0);
            flcTexture.needsUpdate = true;

            // Swap program on ALL head meshes
            for (const m of headMeshes) m.program = flcProgram;

        }
    }

    stop() {
        for (const state of this.states) {
            for (let i = 0; i < state.headMeshes.length; i++) {
                state.headMeshes[i].program = state.origPrograms[i];
            }
            state.currentFrame = -1;
            // Reset decoder pixel buffer to prevent stale data when restarting.
            // FLC frames are deltas — frame 0 must start from a clean state.
            state.decoder.pixels.fill(0);
            state.decoder.palette.fill(0);
        }
    }

    /** Seek to a specific time by resetting and re-decoding from frame 0. */
    seek(elapsedMs) {
        this.stop();
        this.tick(elapsedMs);
    }

    dispose() {
        this.stop();
        this.states = [];
    }
}
