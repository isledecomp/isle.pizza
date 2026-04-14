// Navigation utilities
import { get } from 'svelte/store';
import { currentPage, multiplayerRoom, scenePlayerEventId, scenePlayerData } from '../stores.js';
import { toUrlSafeBase64 } from './base64.js';

export function navigateTo(page) {
    if (get(currentPage) === page) return;
    currentPage.set(page);
    history.pushState({ page, fromApp: true }, '', '#' + page);
}

export function navigateToRoom(name) {
    if (get(currentPage) === 'multiplayer' && get(multiplayerRoom) === name) return;
    multiplayerRoom.set(name);
    currentPage.set('multiplayer');
    history.pushState({ page: 'multiplayer', room: name, fromApp: true }, '', '#r/' + name);
}

export function navigateToMultiplayer() {
    if (get(currentPage) === 'multiplayer' && get(multiplayerRoom) === null) return;
    multiplayerRoom.set(null);
    currentPage.set('multiplayer');
    history.pushState({ page: 'multiplayer', fromApp: true }, '', '#multiplayer');
}

export function navigateToLatestMemories() {
    if (get(currentPage) === 'latest-memories') return;
    currentPage.set('latest-memories');
    history.pushState({ page: 'latest-memories', fromApp: true }, '', '/memories');
}

export function navigateToMemory(eventId) {
    scenePlayerEventId.set(eventId);
    scenePlayerData.set(null);
    currentPage.set('scene-player');
    history.pushState({ page: 'scene-player', eventId, fromApp: true }, '', '/memory/' + eventId);
}

export function navigateToScene(animIndex, participants, language = null, timestamp = null) {
    const data = buildSceneData(animIndex, participants, language, timestamp);
    const encoded = toUrlSafeBase64(JSON.stringify(data));
    scenePlayerEventId.set(null);
    scenePlayerData.set(data);
    currentPage.set('scene-player');
    history.pushState({ page: 'scene-player', sceneData: encoded, fromApp: true }, '', '/scene/' + encoded);
}

/**
 * Build the compact short-key data object for a /scene/ URL.
 */
function buildSceneData(animIndex, participants, language, timestamp) {
    const data = { a: animIndex, p: participants.map(p => ({ n: p.displayName ?? p.n, c: p.charIndex ?? p.c })) };
    if (language && language !== 'en') data.l = language;
    if (timestamp) data.t = timestamp;
    return data;
}

/**
 * Encode scene data into a compact URL-safe base64 string for use in /scene/ URLs.
 * Uses short keys (a/p/n/c/l/t) to minimize encoded URL length.
 * @returns {string} URL-safe base64-encoded JSON string
 */
export function encodeSceneData(animIndex, participants, language = null, timestamp = null) {
    return toUrlSafeBase64(JSON.stringify(buildSceneData(animIndex, participants, language, timestamp)));
}

/**
 * Format a unix timestamp (seconds) into a localized date/time string.
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted string like "Mar 29, 2026 · 3:45 PM"
 */
export function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} \u00b7 ${time}`;
}
