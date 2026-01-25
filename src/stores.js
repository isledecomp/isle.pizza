import { writable } from 'svelte/store';

// Page navigation - initialize from URL hash to prevent flicker on reload
function getInitialPage() {
    if (typeof window === 'undefined') return 'main';
    const hash = window.location.hash;
    const pageMap = {
        '#read-me': 'read-me',
        '#configure': 'configure',
        '#free-stuff': 'free-stuff'
    };
    return pageMap[hash] || 'main';
}

export const currentPage = writable(getInitialPage());

// Debug mode
export const debugEnabled = writable(false);

// Sound state
export const soundEnabled = writable(false);

// Popup visibility
export const showUpdatePopup = writable(false);
export const showGoodbyePopup = writable(false);
export const goodbyeProgress = writable(0);

// Install state
export const installState = writable({
    installed: false,
    installing: false,
    progress: 0,
    missingFiles: []
});

// Config toast
export const configToastVisible = writable(false);

// Debug UI visible (set when game reaches intro animation)
export const debugUIVisible = writable(false);

// Game running state
export const gameRunning = writable(false);

// Service worker registration
export const swRegistration = writable(null);
