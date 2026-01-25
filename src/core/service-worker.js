// Service Worker registration and messaging
import { showUpdatePopup, installState, swRegistration } from '../stores.js';

let downloaderWorker = null;

export async function registerServiceWorker() {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        swRegistration.set(registration);

        // Check if there's already a waiting service worker (update ready)
        if (registration.waiting) {
            showUpdatePopup.set(true);
        }

        // Listen for new service worker updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdatePopup.set(true);
                    }
                });
            }
        });

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            checkCacheStatus();
        });

        return registration;
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
    }
}

function handleServiceWorkerMessage(event) {
    const { action, language, isInstalled, success, missingFiles } = event.data;
    const languageSelect = document.getElementById('language-select');
    if (language && languageSelect && language !== languageSelect.value) return;

    switch (action) {
        case 'cache_status':
            installState.update(state => ({
                ...state,
                installed: isInstalled,
                missingFiles: missingFiles || []
            }));
            break;
        case 'uninstall_complete':
            installState.update(state => ({
                ...state,
                installed: !success,
                installing: false
            }));
            checkCacheStatus();
            break;
        default:
            console.warn('Unknown service worker action:', action);
            break;
    }
}

export function checkCacheStatus() {
    if (!navigator.serviceWorker.controller) return;

    const languageSelect = document.getElementById('language-select');
    const hdTextures = document.getElementById('check-hd-textures');
    const hdMusic = document.getElementById('check-hd-music');
    const widescreenBgs = document.getElementById('check-widescreen-bgs');
    const badEnding = document.getElementById('check-ending');

    const siFiles = getSiFilesForCache(hdMusic, widescreenBgs, badEnding);

    navigator.serviceWorker.controller.postMessage({
        action: 'check_cache_status',
        language: languageSelect?.value || 'en',
        hdTextures: hdTextures?.checked || false,
        siFiles
    });
}

export function getSiFilesForCache(hdMusic, widescreenBgs, badEnding) {
    const siFiles = [];
    if (hdMusic?.checked) siFiles.push('/LEGO/extra/hdmusic.si');
    if (widescreenBgs?.checked) siFiles.push('/LEGO/extra/widescreen.si');
    if (badEnding?.checked) siFiles.push('/LEGO/extra/badend.si');
    return siFiles;
}

export async function startInstall(missingFiles, language) {
    await requestPersistentStorage();

    if (downloaderWorker) downloaderWorker.terminate();
    downloaderWorker = new Worker('/downloader.js');
    downloaderWorker.onmessage = handleWorkerMessage;

    installState.update(state => ({
        ...state,
        installing: true,
        progress: 0
    }));

    downloaderWorker.postMessage({
        action: 'install',
        missingFiles,
        language
    });
}

export function startUninstall(language) {
    navigator.serviceWorker.controller.postMessage({
        action: 'uninstall_language_pack',
        language
    });
}

async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
            const wasGranted = await navigator.storage.persist();
            console.log(wasGranted ? 'Persistent storage was granted.' : 'Persistent storage request was denied.');
        }
    }
}

function handleWorkerMessage(event) {
    const { action, progress, success, error } = event.data;

    switch (action) {
        case 'install_progress':
            installState.update(state => ({
                ...state,
                installing: true,
                progress
            }));
            break;
        case 'install_complete':
            installState.update(state => ({
                ...state,
                installed: success,
                installing: false
            }));
            if (downloaderWorker) downloaderWorker.terminate();
            break;
        case 'install_failed':
            alert(`Download failed: ${error}`);
            installState.update(state => ({
                ...state,
                installing: false
            }));
            if (downloaderWorker) downloaderWorker.terminate();
            break;
        default:
            console.warn('Unknown worker action:', action);
            break;
    }
}
