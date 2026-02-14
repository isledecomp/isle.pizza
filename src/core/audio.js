// Audio utilities
import { soundEnabled } from '../stores.js';
import { fetchSoundAsWav } from './assetLoader.js';

export function getInstallAudio() {
    return document.getElementById('install-audio');
}

export function pauseInstallAudio() {
    const audio = getInstallAudio();
    if (audio) {
        audio.pause();
        soundEnabled.set(false);
    }
}

export function playInstallAudio() {
    const audio = getInstallAudio();
    if (audio) {
        audio.currentTime = 0;
        audio.load();
        audio.play()
            .then(() => {
                soundEnabled.set(true);
            })
            .catch(() => {
                soundEnabled.set(false);
            });
    }
}

export function toggleInstallAudio() {
    const audio = getInstallAudio();
    if (!audio) return;

    if (audio.paused) {
        playInstallAudio();
    } else {
        pauseInstallAudio();
    }
}

/**
 * Create a reusable sound player for game asset sounds.
 * Uses Web Audio API with caching and configurable volume.
 * @param {number} volume - Gain value (0-1), default 0.3
 * @returns {{ play: (name: string) => Promise<void>, dispose: () => void }}
 */
export function createSoundPlayer(volume = 0.3) {
    let audioContext = null;
    let gainNode = null;
    const cache = new Map();

    async function play(name) {
        try {
            if (!audioContext) {
                audioContext = new AudioContext();
                gainNode = audioContext.createGain();
                gainNode.gain.value = volume;
                gainNode.connect(audioContext.destination);
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            let audioBuffer = cache.get(name);
            if (!audioBuffer) {
                const wav = await fetchSoundAsWav(name);
                if (!wav) return;
                audioBuffer = await audioContext.decodeAudioData(wav);
                cache.set(name, audioBuffer);
            }

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start();
        } catch (e) {
            console.error(`Failed to play sound ${name}:`, e);
        }
    }

    function dispose() {
        audioContext?.close();
        audioContext = null;
        gainNode = null;
        cache.clear();
    }

    return { play, dispose };
}
