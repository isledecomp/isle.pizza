import { writable } from 'svelte/store';
import { validateRoomName } from './core/room-names.js';
import { fromUrlSafeBase64 } from './core/base64.js';

const PAGE_MAP = {
    '#read-me': 'read-me',
    '#configure': 'configure',
    '#free-stuff': 'free-stuff',
    '#save-editor': 'save-editor',
    '#multiplayer': 'multiplayer',
    '#memories': 'memories'
};

// Parse a hash string into { page, room, invalidRoom }
function parseHash(hash) {
    if (hash.startsWith('#r/')) {
        const room = hash.slice(3);
        if (validateRoomName(room)) {
            return { page: 'multiplayer', room };
        }
        return { page: 'multiplayer', room: null, invalidRoom: true };
    }
    return { page: PAGE_MAP[hash] || 'main', room: null };
}

// Match a pathname against /memory/:id or /scene/:encoded path routes.
// Returns { eventId } or { sceneData } on match, null otherwise.
export function matchPathRoute(path) {
    if (path === '/memories') return { latestMemories: true };
    const memoryMatch = path.match(/^\/memory\/([A-Za-z0-9_-]+)$/);
    if (memoryMatch) return { eventId: memoryMatch[1] };
    const sceneMatch = path.match(/^\/scene\/([A-Za-z0-9_-]+)$/);
    if (sceneMatch) return { sceneData: sceneMatch[1] };
    return null;
}

// Parse the full URL (pathname + hash) into route state
export function parseRoute() {
    if (typeof window === 'undefined') return { page: 'main', room: null };
    const match = matchPathRoute(window.location.pathname);
    if (match) {
        if (match.latestMemories) return { page: 'latest-memories', room: null };
        return { page: 'scene-player', room: null, ...match };
    }
    return parseHash(window.location.hash);
}

// Page navigation - initialize from URL to prevent flicker on reload
function getInitialState() {
    if (typeof window === 'undefined') return { page: 'main', room: null };
    return parseRoute();
}

const initial = getInitialState();

export const currentPage = writable(initial.page);
export const multiplayerRoom = writable(initial.room);
// Set on startup if the initial URL had an invalid room
export const initialInvalidRoom = initial.invalidRoom || false;

// Initialize scene player stores from URL if applicable
const _initialEventId = initial.eventId || null;
const _initialSceneData = initial.sceneData || null;

export function tryDecodeSceneData(encoded) {
    if (!encoded) return null;
    try { return JSON.parse(fromUrlSafeBase64(encoded)); } catch { return null; }
}

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
export const configToastMessage = writable('Settings saved');

// Debug UI visible (set when game reaches intro animation)
export const debugUIVisible = writable(false);

// Game running state
export const gameRunning = writable(false);

// Multiplayer player count (push-based from C++ via CustomEvent)
export const multiplayerPlayerCount = writable(null);

// Third-person camera state (push-based from C++ via CustomEvent)
export const thirdPersonEnabled = writable(true);

// Name bubbles visibility (push-based from C++ via CustomEvent)
export const showNameBubbles = writable(true);

// Allow customization setting (push-based from C++ via CustomEvent)
export const allowCustomize = writable(true);

// Connection status (push-based from C++ via CustomEvent)
// Values: null (no session), 'connected', 'reconnecting', 'failed'
export const connectionStatus = writable(null);

// Service worker registration
export const swRegistration = writable(null);

// OPFS availability
export const opfsDisabled = writable(false);

// Bumped when cloud sync writes config/saves from the server
export const configVersion = writable(0);
export const savesVersion = writable(0);

// Animation state pushed from C++ backend (reactive, always current)
// { location, state, currentAnimIndex, animations[] }
export const animationState = writable(null);

// Set of animIndex values the player has completed at least once (from IndexedDB)
export const memoryUnlocks = writable(new Set());

// All completion records from IndexedDB (null = not loaded yet)
export const memoryCompletions = writable(null);

// Scene player state (set when navigating to /memory/ or /scene/ URLs)
// Initialize from URL so they're available before onMount runs
export const scenePlayerEventId = writable(_initialEventId);
export const scenePlayerData = writable(tryDecodeSceneData(_initialSceneData));

// Crash state — set when game aborts/crashes
export const gameCrashed = writable(null);

// Save editor state
export const saveEditorState = writable({
    slots: [],           // Array of SaveSlot objects
    selectedSlot: null,  // Currently selected slot number
    loading: true,
    error: null
});
