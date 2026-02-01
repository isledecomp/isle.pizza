/**
 * Serializer for modifying save game files
 * Uses a "patch in place" approach - copies the original buffer and modifies specific bytes
 */
import { SaveGameParser } from './SaveGameParser.js';
import { GameStateTypes, GameStateSizes, Actor } from '../savegame/constants.js';

/**
 * Offsets for header fields
 */
const HEADER_OFFSETS = {
    VERSION: 0,      // S32, 4 bytes
    PLAYER_ID: 4,    // S16, 2 bytes
    CURRENT_ACT: 6,  // U16, 2 bytes
    ACTOR_ID: 8      // U8, 1 byte
};

/**
 * Map mission type to state name
 */
const MISSION_STATE_MAP = {
    pizza: GameStateTypes.PIZZA_MISSION,
    carRace: GameStateTypes.CAR_RACE,
    jetskiRace: GameStateTypes.JETSKI_RACE,
    towTrack: GameStateTypes.TOW_TRACK,
    ambulance: GameStateTypes.AMBULANCE
};

/**
 * Serializer for modifying save game files
 */
export class SaveGameSerializer {
    /**
     * @param {ArrayBuffer} originalBuffer - Original file data
     */
    constructor(originalBuffer) {
        this.original = originalBuffer;
        // Parse to find state locations
        this.parser = new SaveGameParser(originalBuffer);
        this.parsed = this.parser.parse();
    }

    /**
     * Create a copy of the original buffer for modification
     * @returns {ArrayBuffer}
     */
    createCopy() {
        return this.original.slice(0);
    }

    /**
     * Update header fields (act and actor)
     * @param {Object} updates - Fields to update
     * @param {number} [updates.currentAct] - New act (0-2)
     * @param {number} [updates.actorId] - New actor ID (1-5)
     * @returns {ArrayBuffer} - Modified buffer
     */
    updateHeader(updates) {
        const copy = this.createCopy();
        const view = new DataView(copy);

        if ('currentAct' in updates && updates.currentAct !== undefined) {
            view.setUint16(HEADER_OFFSETS.CURRENT_ACT, updates.currentAct, true);
        }

        if ('actorId' in updates && updates.actorId !== undefined) {
            view.setUint8(HEADER_OFFSETS.ACTOR_ID, updates.actorId);
        }

        return copy;
    }

    /**
     * Create default state data for a mission type
     * @param {string} stateName - State name (e.g., 'CarRaceState')
     * @returns {Uint8Array} - State data with default values (all zeros)
     */
    createDefaultStateData(stateName) {
        const size = GameStateSizes[stateName];
        if (!size) {
            throw new Error(`Unknown state size for: ${stateName}`);
        }

        const data = new Uint8Array(size);

        // For race states, we need to set the actor IDs
        if (stateName === GameStateTypes.CAR_RACE || stateName === GameStateTypes.JETSKI_RACE) {
            // 5 entries of 5 bytes: id(1) + score(2) + hiScore(2)
            for (let i = 0; i < 5; i++) {
                data[i * 5] = Actor.PEPPER + i; // Set actor ID
            }
        }

        return data;
    }

    /**
     * Add a missing state to the save file
     * @param {ArrayBuffer} buffer - Current buffer
     * @param {string} stateName - State name to add
     * @returns {ArrayBuffer} - New buffer with state added
     */
    addMissingState(buffer, stateName) {
        const stateData = this.createDefaultStateData(stateName);
        const nameBytes = new TextEncoder().encode(stateName);

        // Calculate new state size: name length (2) + name + data
        const stateSize = 2 + nameBytes.length + stateData.length;

        // Insert position is where states end (before previous_area field)
        const insertOffset = this.parsed.statesEndOffset;

        // Create new buffer with space for the new state
        const newBuffer = new ArrayBuffer(buffer.byteLength + stateSize);
        const newView = new DataView(newBuffer);
        const newArray = new Uint8Array(newBuffer);
        const oldArray = new Uint8Array(buffer);

        // Copy everything up to insert point
        newArray.set(oldArray.slice(0, insertOffset));

        // Write new state at insert point
        let offset = insertOffset;

        // Write name length (S16)
        newView.setInt16(offset, nameBytes.length, true);
        offset += 2;

        // Write name
        newArray.set(nameBytes, offset);
        offset += nameBytes.length;

        // Write state data
        newArray.set(stateData, offset);
        offset += stateData.length;

        // Copy the rest of the original buffer (previous_area field)
        newArray.set(oldArray.slice(insertOffset), offset);

        // Increment state count
        const stateCountOffset = this.parsed.stateCountOffset;
        const oldCount = new DataView(buffer).getInt16(stateCountOffset, true);
        newView.setInt16(stateCountOffset, oldCount + 1, true);

        // Update parsed data to include the new state
        const dataOffset = insertOffset + 2 + nameBytes.length;
        this.parsed.stateLocations.push({
            name: stateName,
            nameOffset: insertOffset,
            dataOffset: dataOffset,
            dataSize: stateData.length
        });
        this.parsed.stateCount++;
        this.parsed.statesEndOffset = insertOffset + stateSize;

        // Update original reference for subsequent operations
        this.original = newBuffer;

        return newBuffer;
    }

    /**
     * Ensure a mission state exists in the buffer, adding it if missing
     * @param {ArrayBuffer} buffer - Current buffer
     * @param {string} missionType - Mission type
     * @returns {ArrayBuffer} - Buffer with state present
     */
    ensureMissionState(buffer, missionType) {
        const stateName = MISSION_STATE_MAP[missionType];
        if (!stateName) {
            throw new Error(`Unknown mission type: ${missionType}`);
        }

        const stateLocation = this.parsed.stateLocations.find(loc => loc.name === stateName);
        if (stateLocation) {
            return buffer; // State already exists
        }

        return this.addMissingState(buffer, stateName);
    }

    /**
     * Update mission scores in the save file
     * @param {string} missionType - Mission type (pizza, carRace, jetskiRace, towTrack, ambulance)
     * @param {number} actorId - Actor ID (1-5)
     * @param {'score'|'highScore'} scoreType - Which score to update
     * @param {number} value - New score color value (0-3)
     * @param {ArrayBuffer} [buffer] - Optional buffer to use (for chaining operations)
     * @returns {ArrayBuffer} - Modified buffer
     */
    updateMissionScore(missionType, actorId, scoreType, value, buffer = null) {
        const stateName = MISSION_STATE_MAP[missionType];
        if (!stateName) {
            console.error(`Unknown mission type: ${missionType}`);
            return null;
        }

        // Use provided buffer or create a copy
        let workingBuffer = buffer || this.createCopy();

        // Ensure the state exists
        workingBuffer = this.ensureMissionState(workingBuffer, missionType);

        const stateLocation = this.parsed.stateLocations.find(loc => loc.name === stateName);
        if (!stateLocation) {
            console.error(`Failed to find or create state: ${stateName}`);
            return null;
        }

        const view = new DataView(workingBuffer);

        // Calculate offset based on mission type
        let offset;

        if (missionType === 'pizza') {
            // Pizza: 5 actors * 8 bytes (unk(2) + counter(2) + score(2) + hiScore(2))
            const actorIndex = actorId - Actor.PEPPER; // 0-4
            const entryOffset = stateLocation.dataOffset + (actorIndex * 8);
            if (scoreType === 'score') {
                offset = entryOffset + 4; // Skip unk + counter
            } else {
                offset = entryOffset + 6; // Skip unk + counter + score
            }
        } else if (missionType === 'carRace' || missionType === 'jetskiRace') {
            // Race: 5 actors * 5 bytes (id(1) + lastScore(2) + highScore(2))
            const actorIndex = actorId - Actor.PEPPER;
            const entryOffset = stateLocation.dataOffset + (actorIndex * 5);
            if (scoreType === 'score') {
                offset = entryOffset + 1; // Skip id
            } else {
                offset = entryOffset + 3; // Skip id + lastScore
            }
        } else if (missionType === 'towTrack' || missionType === 'ambulance') {
            // Score mission: 5 scores then 5 high scores (all S16)
            const actorIndex = actorId - Actor.PEPPER;
            if (scoreType === 'score') {
                offset = stateLocation.dataOffset + (actorIndex * 2);
            } else {
                offset = stateLocation.dataOffset + 10 + (actorIndex * 2); // Skip 5 scores
            }
        }

        if (offset !== undefined) {
            view.setInt16(offset, value, true);
        }

        return workingBuffer;
    }

    /**
     * Apply multiple updates at once
     * @param {Object} updates - Updates to apply
     * @param {Object} [updates.header] - Header updates
     * @param {Array} [updates.missions] - Mission score updates
     * @returns {ArrayBuffer} - Modified buffer
     */
    applyUpdates(updates) {
        let buffer = this.original;

        // Apply header updates first
        if (updates.header) {
            const view = new DataView(buffer = buffer.slice(0));

            if ('currentAct' in updates.header) {
                view.setUint16(HEADER_OFFSETS.CURRENT_ACT, updates.header.currentAct, true);
            }
            if ('actorId' in updates.header) {
                view.setUint8(HEADER_OFFSETS.ACTOR_ID, updates.header.actorId);
            }
        }

        // Apply mission updates
        if (updates.missions && updates.missions.length > 0) {
            for (const mission of updates.missions) {
                buffer = this.updateMissionScore(
                    mission.missionType,
                    mission.actorId,
                    mission.scoreType,
                    mission.value,
                    buffer
                );
            }
        }

        return buffer;
    }

    /**
     * Update a variable value in the save file
     * @param {string} name - Variable name
     * @param {string} newValue - New value string
     * @param {ArrayBuffer} [buffer] - Optional buffer to use (for chaining operations)
     * @returns {ArrayBuffer|null} - Modified buffer or null on error
     */
    updateVariable(name, newValue, buffer = null) {
        const varInfo = this.parsed.variables.get(name);
        if (!varInfo) {
            console.error(`Variable not found: ${name}`);
            return null;
        }

        const workingBuffer = buffer || this.createCopy();
        const array = new Uint8Array(workingBuffer);
        const encoder = new TextEncoder();

        const oldLength = varInfo.valueLength;
        const newLength = newValue.length;

        if (oldLength === newLength) {
            // In-place update - same length, just replace bytes
            const valueBytes = encoder.encode(newValue);
            array.set(valueBytes, varInfo.valueOffset + 1); // +1 for length byte
            return workingBuffer;
        } else {
            // Different length - need to rebuild buffer
            const oldArray = new Uint8Array(workingBuffer);
            const sizeDiff = newLength - oldLength;
            const newBuffer = new ArrayBuffer(workingBuffer.byteLength + sizeDiff);
            const newArray = new Uint8Array(newBuffer);

            // Copy everything up to the value (including the length byte position)
            const valueDataStart = varInfo.valueOffset + 1; // After length byte
            newArray.set(oldArray.slice(0, varInfo.valueOffset));

            // Write new length byte
            newArray[varInfo.valueOffset] = newLength;

            // Write new value
            const valueBytes = encoder.encode(newValue);
            newArray.set(valueBytes, valueDataStart);

            // Copy everything after the old value
            const afterOldValue = valueDataStart + oldLength;
            newArray.set(oldArray.slice(afterOldValue), valueDataStart + newLength);

            return newBuffer;
        }
    }

    /**
     * Get the byte offset for a mission score
     * @param {string} missionType
     * @param {number} actorId
     * @param {'score'|'highScore'} scoreType
     * @returns {number|null}
     */
    getMissionScoreOffset(missionType, actorId, scoreType) {
        const stateName = MISSION_STATE_MAP[missionType];
        if (!stateName) return null;

        const stateLocation = this.parsed.stateLocations.find(loc => loc.name === stateName);
        if (!stateLocation) return null;

        const actorIndex = actorId - Actor.PEPPER;

        if (missionType === 'pizza') {
            const entryOffset = stateLocation.dataOffset + (actorIndex * 8);
            return scoreType === 'score' ? entryOffset + 4 : entryOffset + 6;
        } else if (missionType === 'carRace' || missionType === 'jetskiRace') {
            const entryOffset = stateLocation.dataOffset + (actorIndex * 5);
            return scoreType === 'score' ? entryOffset + 1 : entryOffset + 3;
        } else if (missionType === 'towTrack' || missionType === 'ambulance') {
            if (scoreType === 'score') {
                return stateLocation.dataOffset + (actorIndex * 2);
            } else {
                return stateLocation.dataOffset + 10 + (actorIndex * 2);
            }
        }

        return null;
    }
}

/**
 * Create a serializer for a save game buffer
 * @param {ArrayBuffer} buffer
 * @returns {SaveGameSerializer}
 */
export function createSerializer(buffer) {
    return new SaveGameSerializer(buffer);
}
