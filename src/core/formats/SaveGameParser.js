/**
 * Parser for G0-G9.GS save game files
 */
import { BinaryReader } from './BinaryReader.js';
import { SAVEGAME_VERSION, GameStateTypes, GameStateSizes, Actor } from '../savegame/constants.js';

/**
 * @typedef {Object} SaveGameHeader
 * @property {number} version - File version (must be 0x1000c)
 * @property {number} playerId - Player profile ID
 * @property {number} currentAct - Current act (0-2)
 * @property {number} actorId - Current character (1-5)
 */

/**
 * @typedef {Object} MissionScores
 * @property {Object|null} pizza - Pizza delivery mission scores
 * @property {Object|null} carRace - Car race mission scores
 * @property {Object|null} jetskiRace - Jetski race mission scores
 * @property {Object|null} towTrack - Tow track mission scores
 * @property {Object|null} ambulance - Ambulance mission scores
 */

/**
 * @typedef {Object} GameStateLocation
 * @property {string} name - State name
 * @property {number} nameOffset - Offset of name length field
 * @property {number} dataOffset - Offset of state data
 * @property {number} dataSize - Size of state data
 */

/**
 * Parser for G0-G9.GS save game files
 */
export class SaveGameParser {
    /**
     * @param {ArrayBuffer} buffer - Raw file contents
     */
    constructor(buffer) {
        this.buffer = buffer;
        this.reader = new BinaryReader(buffer);
        this.parsed = {
            header: null,
            missions: null,
            stateLocations: [],
            stateCountOffset: null,
            stateCount: 0,
            statesEndOffset: null  // Where to insert new states (before previous_area)
        };
    }

    /**
     * Parse the save file header (9 bytes)
     * @returns {SaveGameHeader}
     */
    parseHeader() {
        this.reader.seek(0);

        const version = this.reader.readS32();
        if (version !== SAVEGAME_VERSION) {
            throw new Error(`Invalid save file version: 0x${version.toString(16)} (expected 0x${SAVEGAME_VERSION.toString(16)})`);
        }

        const playerId = this.reader.readS16();
        const currentAct = this.reader.readU16();
        const actorId = this.reader.readU8();

        this.parsed.header = { version, playerId, currentAct, actorId };
        return this.parsed.header;
    }

    /**
     * Skip over the variables section
     * Must be called after parseHeader()
     */
    skipVariables() {
        while (true) {
            const nameLength = this.reader.readU8();
            const name = this.reader.readString(nameLength);

            if (name === 'END_OF_VARIABLES') {
                break;
            }

            const valueLength = this.reader.readU8();
            this.reader.skip(valueLength);
        }
    }

    /**
     * Skip character manager data (66 characters * 16 bytes = 1056 bytes)
     */
    skipCharacters() {
        this.reader.skip(66 * 16);
    }

    /**
     * Skip plant manager data (81 plants * 12 bytes = 972 bytes)
     */
    skipPlants() {
        this.reader.skip(81 * 12);
    }

    /**
     * Skip building manager data (16 buildings * 10 bytes = 160 bytes + 1 byte variant)
     */
    skipBuildings() {
        this.reader.skip(16 * 10 + 1);
    }

    /**
     * Parse game states to extract mission scores
     * Records state locations for later patching
     * @returns {MissionScores}
     */
    parseGameStates() {
        this.parsed.stateCountOffset = this.reader.tell();
        const stateCount = this.reader.readS16();
        this.parsed.stateCount = stateCount;
        const missions = {
            pizza: null,
            carRace: null,
            jetskiRace: null,
            towTrack: null,
            ambulance: null
        };

        for (let i = 0; i < stateCount; i++) {
            const nameOffset = this.reader.tell();
            const nameLength = this.reader.readS16();
            const name = this.reader.readString(nameLength);
            const dataOffset = this.reader.tell();

            // Record location for all states
            let dataSize = 0;

            switch (name) {
                case GameStateTypes.PIZZA_MISSION:
                    missions.pizza = this.parsePizzaMissionState();
                    dataSize = 40;
                    break;

                case GameStateTypes.CAR_RACE:
                    missions.carRace = this.parseRaceState();
                    dataSize = 25;
                    break;

                case GameStateTypes.JETSKI_RACE:
                    missions.jetskiRace = this.parseRaceState();
                    dataSize = 25;
                    break;

                case GameStateTypes.TOW_TRACK:
                    missions.towTrack = this.parseScoreMissionState();
                    dataSize = 20;
                    break;

                case GameStateTypes.AMBULANCE:
                    missions.ambulance = this.parseScoreMissionState();
                    dataSize = 20;
                    break;

                default:
                    // Skip other state types
                    dataSize = this.skipGameStateData(name);
                    break;
            }

            this.parsed.stateLocations.push({
                name,
                nameOffset,
                dataOffset,
                dataSize
            });
        }

        // Record where states end (before previous_area field)
        this.parsed.statesEndOffset = this.reader.tell();

        this.parsed.missions = missions;
        return missions;
    }

    /**
     * Parse pizza mission state (40 bytes - 5 actors * 8 bytes each)
     * Each entry: unk(2) + counter(2) + score(2) + hiScore(2)
     * @returns {Object}
     */
    parsePizzaMissionState() {
        const result = {
            scores: {},
            highScores: {}
        };

        for (let actor = Actor.PEPPER; actor <= Actor.LAURA; actor++) {
            this.reader.skip(2); // unk0x06
            this.reader.skip(2); // counter
            result.scores[actor] = this.reader.readS16();
            result.highScores[actor] = this.reader.readS16();
        }

        return result;
    }

    /**
     * Parse score mission state (tow track, ambulance - 20 bytes)
     * 5 scores followed by 5 high scores, all S16
     * @returns {Object}
     */
    parseScoreMissionState() {
        const result = {
            scores: {},
            highScores: {}
        };

        // Read 5 scores
        for (let actor = Actor.PEPPER; actor <= Actor.LAURA; actor++) {
            result.scores[actor] = this.reader.readS16();
        }

        // Read 5 high scores
        for (let actor = Actor.PEPPER; actor <= Actor.LAURA; actor++) {
            result.highScores[actor] = this.reader.readS16();
        }

        return result;
    }

    /**
     * Parse race state (jetski, car - 25 bytes)
     * 5 entries of 5 bytes each: id(1) + lastScore(2) + highScore(2)
     * @returns {Object}
     */
    parseRaceState() {
        const result = {
            scores: {},
            highScores: {}
        };

        for (let i = 0; i < 5; i++) {
            const actorId = this.reader.readU8();
            const score = this.reader.readS16();
            const highScore = this.reader.readS16();

            result.scores[actorId] = score;
            result.highScores[actorId] = highScore;
        }

        return result;
    }

    /**
     * Skip game state data based on state name
     * @param {string} name - State name
     * @returns {number} - Number of bytes skipped
     */
    skipGameStateData(name) {
        // Check fixed-size states first
        const fixedSize = GameStateSizes[name];
        if (fixedSize) {
            this.reader.skip(fixedSize);
            return fixedSize;
        }

        // Variable-length states
        if (name === 'AnimState') {
            return this.skipAnimState();
        }

        if (name === 'Act1State') {
            return this.skipAct1State();
        }

        // Unknown state - this shouldn't happen with valid save files
        console.warn(`Unknown game state type: ${name}`);
        return 0;
    }

    /**
     * Skip AnimState (variable length)
     * @returns {number} - Number of bytes skipped
     */
    skipAnimState() {
        const startOffset = this.reader.tell();

        this.reader.skip(4); // extra_character_id
        const animCount = this.reader.readU32();
        this.reader.skip(animCount * 2); // anim_indices (U16 each)
        const locationFlagsCount = this.reader.readU32();
        this.reader.skip(locationFlagsCount); // location_flags (U8 each)

        return this.reader.tell() - startOffset;
    }

    /**
     * Skip Act1State (variable length with conditional textures)
     * @returns {number} - Number of bytes skipped
     */
    skipAct1State() {
        const startOffset = this.reader.tell();

        // Read 7 named planes
        const planeNameLengths = [];
        for (let i = 0; i < 7; i++) {
            const nameLength = this.reader.readS16();
            planeNameLengths.push(nameLength);
            if (nameLength > 0) {
                this.reader.skip(nameLength); // name
            }
            this.reader.skip(36); // position(12) + direction(12) + up(12)
        }

        // Conditional textures based on which planes have names
        const helicopterHasName = planeNameLengths[3] > 0;
        const jetskiHasName = planeNameLengths[4] > 0;
        const dunebuggyHasName = planeNameLengths[5] > 0;
        const racecarHasName = planeNameLengths[6] > 0;

        if (helicopterHasName) {
            for (let i = 0; i < 3; i++) {
                this.skipAct1Texture();
            }
        }

        if (jetskiHasName) {
            for (let i = 0; i < 2; i++) {
                this.skipAct1Texture();
            }
        }

        if (dunebuggyHasName) {
            this.skipAct1Texture();
        }

        if (racecarHasName) {
            for (let i = 0; i < 3; i++) {
                this.skipAct1Texture();
            }
        }

        // Final fields
        this.reader.skip(2); // cpt_click_dialogue_next_index (S16)
        this.reader.skip(1); // played_exit_explanation (U8)

        return this.reader.tell() - startOffset;
    }

    /**
     * Skip a single Act1 texture
     */
    skipAct1Texture() {
        const nameLength = this.reader.readS16();
        if (nameLength > 0) {
            this.reader.skip(nameLength); // name
        }
        const width = this.reader.readU32();
        const height = this.reader.readU32();
        const paletteCount = this.reader.readU32();
        this.reader.skip(paletteCount * 3); // palette (RGB triplets)
        this.reader.skip(width * height); // bitmap data
    }

    /**
     * Get location of a specific game state
     * @param {string} stateName - State name to find
     * @returns {GameStateLocation|null}
     */
    getStateLocation(stateName) {
        return this.parsed.stateLocations.find(loc => loc.name === stateName) || null;
    }

    /**
     * Full parse for the save editor (header + missions)
     * @returns {{ header: SaveGameHeader, missions: MissionScores, stateLocations: GameStateLocation[] }}
     */
    parse() {
        this.parseHeader();
        this.skipVariables();
        this.skipCharacters();
        this.skipPlants();
        this.skipBuildings();
        this.parseGameStates();

        return this.parsed;
    }
}

/**
 * Parse a save game buffer
 * @param {ArrayBuffer} buffer - Raw file contents
 * @returns {{ header: SaveGameHeader, missions: MissionScores, stateLocations: GameStateLocation[] }}
 */
export function parseSaveGame(buffer) {
    const parser = new SaveGameParser(buffer);
    return parser.parse();
}
