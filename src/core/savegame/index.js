/**
 * Save Game Editor - Public API
 *
 * High-level functions for managing LEGO Island save files
 */

// Re-export core utilities
export { BinaryReader } from './BinaryReader.js';
export { BinaryWriter } from './BinaryWriter.js';
export { SaveGameParser, parseSaveGame } from './SaveGameParser.js';
export { SaveGameSerializer, createSerializer } from './SaveGameSerializer.js';
export { PlayersParser, parsePlayers } from './PlayersParser.js';
export { PlayersSerializer, createPlayersSerializer } from './PlayersSerializer.js';
export * from './constants.js';

// Import dependencies
import { readBinaryFile, writeBinaryFile, fileExists, listFiles } from '../opfs.js';
import { parseSaveGame } from './SaveGameParser.js';
import { parsePlayers } from './PlayersParser.js';
import { createSerializer } from './SaveGameSerializer.js';
import { createPlayersSerializer } from './PlayersSerializer.js';
import { getSaveFileName, PLAYERS_FILE, Actor, ActorNames } from './constants.js';

/**
 * @typedef {Object} SaveSlot
 * @property {number} slotNumber - Slot number (0-9)
 * @property {boolean} exists - Whether the save file exists
 * @property {string} fileName - Save file name
 * @property {Object|null} header - Parsed header data
 * @property {Object|null} missions - Mission scores
 * @property {string|null} playerName - Player name from Players.gsi
 * @property {ArrayBuffer|null} buffer - Raw file buffer (for editing)
 */

/**
 * Cache for player names (avoids re-parsing Players.gsi)
 */
let playersCache = null;

/**
 * Load and cache player names from Players.gsi
 * @returns {Promise<{ count: number, players: Array<{ letters: number[], name: string }> }|null>}
 */
async function loadPlayers() {
    if (playersCache) return playersCache;

    const buffer = await readBinaryFile(PLAYERS_FILE);
    if (!buffer) return null;

    playersCache = parsePlayers(buffer);
    return playersCache;
}

/**
 * Clear the players cache (call when Players.gsi changes)
 */
export function clearPlayersCache() {
    playersCache = null;
}

/**
 * Get player name by index
 * @param {number} index - Player index in Players.gsi
 * @returns {Promise<string|null>}
 */
async function getPlayerName(index) {
    const players = await loadPlayers();
    if (!players || index < 0 || index >= players.players.length) {
        return null;
    }
    return players.players[index].name;
}

/**
 * List all save slots (0-9) with basic info
 * @returns {Promise<SaveSlot[]>}
 */
export async function listSaveSlots() {
    const slots = [];

    // First load players to resolve names
    await loadPlayers();

    for (let i = 0; i < 10; i++) {
        const fileName = getSaveFileName(i);
        const exists = await fileExists(fileName);

        const slot = {
            slotNumber: i,
            exists,
            fileName,
            header: null,
            missions: null,
            playerName: null,
            buffer: null
        };

        if (exists) {
            try {
                const buffer = await readBinaryFile(fileName);
                if (buffer) {
                    const parsed = parseSaveGame(buffer);
                    slot.header = parsed.header;
                    slot.missions = parsed.missions;
                    slot.buffer = buffer;

                    // Try to get player name
                    // The playerId in the save file corresponds to an index in Players.gsi
                    // Actually, we need to match by looking at order - player names are stored
                    // in order of most recently played, so we just use the index
                    if (playersCache && playersCache.players.length > 0) {
                        // Find player by matching the slot with Players.gsi order
                        // For now, just use the first player if available
                        // In reality, we'd need to match by player_id
                        const playerIndex = i < playersCache.players.length ? i : 0;
                        if (playersCache.players[playerIndex]) {
                            slot.playerName = playersCache.players[playerIndex].name;
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to parse save slot ${i}:`, e);
            }
        }

        slots.push(slot);
    }

    return slots;
}

/**
 * Load a specific save slot with full details
 * @param {number} slotNumber - Slot number (0-9)
 * @returns {Promise<SaveSlot|null>}
 */
export async function loadSaveSlot(slotNumber) {
    if (slotNumber < 0 || slotNumber > 9) {
        throw new Error('Invalid slot number');
    }

    const fileName = getSaveFileName(slotNumber);
    const buffer = await readBinaryFile(fileName);

    if (!buffer) {
        return null;
    }

    const parsed = parseSaveGame(buffer);
    const players = await loadPlayers();

    let playerName = null;
    if (players && players.players.length > 0) {
        // Use slot index as a simple mapping
        const playerIndex = slotNumber < players.players.length ? slotNumber : 0;
        if (players.players[playerIndex]) {
            playerName = players.players[playerIndex].name;
        }
    }

    return {
        slotNumber,
        exists: true,
        fileName,
        header: parsed.header,
        missions: parsed.missions,
        playerName,
        buffer
    };
}

/**
 * Save changes to a save slot
 * @param {number} slotNumber - Slot number (0-9)
 * @param {ArrayBuffer} buffer - Modified buffer to save
 * @param {boolean} [silent=false] - If true, don't show toast
 * @returns {Promise<boolean>}
 */
export async function saveSaveSlot(slotNumber, buffer, silent = false) {
    if (slotNumber < 0 || slotNumber > 9) {
        throw new Error('Invalid slot number');
    }

    const fileName = getSaveFileName(slotNumber);
    return await writeBinaryFile(fileName, buffer, silent, 'Save updated');
}

/**
 * Update a save slot with specific changes
 * @param {number} slotNumber - Slot number (0-9)
 * @param {Object} updates - Updates to apply
 * @param {Object} [updates.header] - Header updates (currentAct, actorId)
 * @param {Object} [updates.missionScore] - Single mission score update
 * @returns {Promise<SaveSlot|null>} - Updated slot data
 */
export async function updateSaveSlot(slotNumber, updates) {
    const slot = await loadSaveSlot(slotNumber);
    if (!slot || !slot.buffer) {
        console.error('Failed to load save slot');
        return null;
    }

    const serializer = createSerializer(slot.buffer);
    let newBuffer = slot.buffer;
    let modified = false;

    // Apply header updates
    if (updates.header) {
        newBuffer = serializer.updateHeader(updates.header);
        modified = true;
    }

    // Apply mission score update
    if (updates.missionScore) {
        const { missionType, actorId, scoreType, value } = updates.missionScore;
        // Create new serializer with current buffer state
        const scoreSerializer = createSerializer(newBuffer);
        // updateMissionScore will add missing states automatically
        const result = scoreSerializer.updateMissionScore(missionType, actorId, scoreType, value);
        if (result) {
            newBuffer = result;
            modified = true;
        }
    }

    // Only save if something was actually modified
    if (!modified) {
        return slot;
    }

    // Save the modified buffer
    const success = await saveSaveSlot(slotNumber, newBuffer);
    if (!success) {
        console.error('Failed to save slot');
        return null;
    }

    // Re-load and return updated slot
    return await loadSaveSlot(slotNumber);
}

/**
 * Get all existing save slots (convenience function)
 * @returns {Promise<SaveSlot[]>}
 */
export async function getExistingSaveSlots() {
    const allSlots = await listSaveSlots();
    return allSlots.filter(slot => slot.exists);
}

/**
 * Update a player's name in Players.gsi
 * @param {number} playerIndex - Index in Players.gsi (0-8)
 * @param {string} newName - New name (max 7 chars, A-Z only)
 * @returns {Promise<boolean>} - True if successful
 */
export async function updatePlayerName(playerIndex, newName) {
    // Load current players data
    const players = await loadPlayers();
    if (!players) {
        console.error('Failed to load Players.gsi');
        return false;
    }

    if (playerIndex < 0 || playerIndex >= players.players.length) {
        console.error('Invalid player index');
        return false;
    }

    // Create serializer and update name
    const serializer = createPlayersSerializer(players);
    serializer.updateName(playerIndex, newName);

    // Serialize and save
    const buffer = serializer.serialize();
    const success = await writeBinaryFile(PLAYERS_FILE, buffer, false, 'Save updated');

    if (success) {
        // Clear cache so next load gets fresh data
        clearPlayersCache();
    }

    return success;
}
