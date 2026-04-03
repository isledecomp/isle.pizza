// Cloud sync for save files and config
import { authSession, authReady } from './auth.js';
import { API_URL } from './config.js';
import { readBinaryFile, writeBinaryFile, writeTextFile, getFileHandle, getOpfsRoot, CONFIG_FILE } from './opfs.js';
import { PLAYERS_FILE, HISTORY_FILE, getSaveFileName } from './savegame/constants.js';
import { clearPlayersCache } from './savegame/index.js';
import { configVersion, savesVersion } from '../stores.js';

// All save files we sync
const SAVE_FILES = [
    ...Array.from({ length: 9 }, (_, i) => getSaveFileName(i)),
    PLAYERS_FILE,
    HISTORY_FILE,
];

let currentSession = null;
let opfsAvailable = false;

// --- Sync state (localStorage) ---

const SYNC_STATE_KEY = 'isle-cloud-sync';

function loadSyncState() {
    try {
        const raw = localStorage.getItem(SYNC_STATE_KEY);
        if (raw) {
            const state = JSON.parse(raw);
            return { synced: state.synced || {}, dirty: new Set(state.dirty || []) };
        }
    } catch {}
    return { synced: {}, dirty: new Set() };
}

function saveSyncState(state) {
    try {
        localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({
            synced: state.synced,
            dirty: [...state.dirty],
        }));
    } catch {}
}

let syncState = loadSyncState();

function markDirty(filename) {
    syncState.dirty.add(filename);
    saveSyncState(syncState);
}

function markClean(filename, hash) {
    syncState.dirty.delete(filename);
    syncState.synced[filename] = hash;
    saveSyncState(syncState);
}

function trackWrite(filename) {
    markDirty(filename);
    if (currentSession) {
        pendingFiles.add(filename);
        scheduleSaveUpload();
    }
}

// --- Hashing ---

async function hashBuffer(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

// --- Init ---

export async function initCloudSync() {
    opfsAvailable = !!(await getOpfsRoot());
    if (!opfsAvailable) return;

    currentSession = await authReady;
    if (currentSession) {
        await syncOnLogin();
    }

    authSession.subscribe(session => {
        if (session === undefined) return;
        const wasLoggedIn = !!currentSession;
        const nowLoggedIn = !!session;
        currentSession = session;
        if (wasLoggedIn === nowLoggedIn) return;
        if (nowLoggedIn) {
            syncOnLogin();
        } else {
            // On logout, cancel pending uploads and clear sync state
            if (uploadTimer) clearTimeout(uploadTimer);
            uploadTimer = null;
            pendingFiles.clear();
            syncState = { synced: {}, dirty: new Set() };
            saveSyncState(syncState);
        }
    });

    window.addEventListener('opfs-save-slot-written', (e) => {
        trackWrite(getSaveFileName(e.detail.slot));
        trackWrite(HISTORY_FILE);
    });

    window.addEventListener('opfs-save-state-changed', () => {
        for (const f of SAVE_FILES) trackWrite(f);
    });

    window.addEventListener('opfs-save-file-written', (e) => {
        trackWrite(e.detail.filename);
    });

    // Listen for config writes
    window.addEventListener('opfs-config-written', (e) => {
        if (currentSession) {
            uploadConfig(e.detail.iniText);
        }
    });
}

async function syncOnLogin() {
    await syncSaves().catch(e => console.warn('[CloudSync] Save sync failed:', e));
    await syncConfig().catch(e => console.warn('[CloudSync] Config sync failed:', e));
}

// --- Helpers ---

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- Save sync (bidirectional, hash-based) ---

async function syncSaves() {
    const files = [];

    for (const filename of SAVE_FILES) {
        const data = await readBinaryFile(filename);
        const localHash = data ? await hashBuffer(data) : null;
        const syncedHash = syncState.synced[filename] || null;
        const isDirty = localHash !== null && (localHash !== syncedHash || syncState.dirty.has(filename));

        files.push({
            filename,
            data: isDirty ? arrayBufferToBase64(data) : null,
            hash: localHash,
        });
    }

    const res = await fetch(`${API_URL}/api/cloud/saves/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files }),
    });

    if (!res.ok) return;

    const { files: responseFiles } = await res.json();
    if (!Array.isArray(responseFiles)) return;

    let wroteAnyFile = false;

    for (const serverFile of responseFiles) {
        if (serverFile.data) {
            // Server sent data — write to OPFS
            try {
                const buffer = base64ToArrayBuffer(serverFile.data);
                await writeBinaryFile(serverFile.filename, buffer, true);
                if (serverFile.filename === PLAYERS_FILE) clearPlayersCache();
                markClean(serverFile.filename, serverFile.hash);
                wroteAnyFile = true;
            } catch (e) {
                console.warn('[CloudSync] Failed to write save file:', serverFile.filename, e);
            }
        } else if (serverFile.hash) {
            // Server accepted our data or confirmed same content
            markClean(serverFile.filename, serverFile.hash);
        }
    }

    if (wroteAnyFile) {
        savesVersion.update(n => n + 1);
    }
}

// --- Debounced incremental upload ---

const pendingFiles = new Set();
let uploadTimer = null;
const UPLOAD_DEBOUNCE_MS = 3000;

function scheduleSaveUpload() {
    if (uploadTimer) clearTimeout(uploadTimer);
    uploadTimer = setTimeout(flushSaveUpload, UPLOAD_DEBOUNCE_MS);
}

async function flushSaveUpload() {
    if (uploadTimer) clearTimeout(uploadTimer);
    uploadTimer = null;
    if (!currentSession) {
        pendingFiles.clear();
        return;
    }
    const filenames = [...pendingFiles];
    pendingFiles.clear();
    if (filenames.length === 0) return;

    const saves = [];
    for (const filename of filenames) {
        const data = await readBinaryFile(filename);
        if (data) {
            saves.push({ filename, data: arrayBufferToBase64(data) });
        }
    }

    if (saves.length === 0) return;

    try {
        const res = await fetch(`${API_URL}/api/cloud/saves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ saves }),
        });
        if (res.ok) {
            const { hashes } = await res.json();
            if (Array.isArray(hashes)) {
                for (const { filename, hash } of hashes) {
                    markClean(filename, hash);
                }
            }
        } else if (res.status !== 401) {
            for (const fn of filenames) pendingFiles.add(fn);
            scheduleSaveUpload();
        }
    } catch (e) {
        console.warn('[CloudSync] Save upload failed:', e);
        for (const fn of filenames) pendingFiles.add(fn);
        scheduleSaveUpload();
    }
}

// --- Config sync ---

async function syncConfig() {
    // Read local config
    let localConfig = null;
    try {
        const handle = await getFileHandle(CONFIG_FILE, false);
        if (handle) {
            const file = await handle.getFile();
            localConfig = await file.text();
        }
    } catch {}

    const res = await fetch(`${API_URL}/api/cloud/config/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config: localConfig || '' }),
    });

    if (!res.ok) return;

    const { config: serverConfig } = await res.json();
    if (!serverConfig) return;

    // Server returned config — write to OPFS (cloud overrides local)
    await writeTextFile(CONFIG_FILE, serverConfig, true);
    configVersion.update(n => n + 1);
}

function uploadConfig(iniText) {
    fetch(`${API_URL}/api/cloud/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config: iniText }),
    }).catch(e => console.warn('[CloudSync] Config upload failed:', e));
}
