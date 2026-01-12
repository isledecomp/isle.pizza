// Audio utilities for install-audio element
import { soundEnabled } from '../stores.js';

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
        audio.play();
        soundEnabled.set(true);
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
