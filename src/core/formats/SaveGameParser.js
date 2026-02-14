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
            statesEndOffset: null,  // Where to insert new states (before previous_area)
            variables: new Map(),   // Map<string, { value, nameOffset, valueOffset, valueLength }>
            variablesEndOffset: null // Where END_OF_VARIABLES marker ends
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
     * Parse the variables section, storing name/value pairs with their offsets
     * Must be called after parseHeader()
     */
    parseVariables() {
        while (true) {
            const nameOffset = this.reader.tell();
            const nameLength = this.reader.readU8();
            const name = this.reader.readString(nameLength);

            if (name === 'END_OF_VARIABLES') {
                this.parsed.variablesEndOffset = this.reader.tell();
                break;
            }

            const valueOffset = this.reader.tell();
            const valueLength = this.reader.readU8();
            const value = this.reader.readString(valueLength);

            this.parsed.variables.set(name, {
                value,
                nameOffset,
                valueOffset,
                valueLength
            });
        }
    }

    /**
     * Parse character manager data (66 characters * 16 bytes = 1056 bytes)
     * Each character: sound(S32) + move(S32) + mood(U8)
     *   + hatPartNameIndex(U8) + hatNameIndex(U8) + infogronNameIndex(U8)
     *   + armlftNameIndex(U8) + armrtNameIndex(U8) + leglftNameIndex(U8) + legrtNameIndex(U8)
     */
    parseCharacters() {
        this.parsed.charactersOffset = this.reader.tell();
        const characters = [];

        for (let i = 0; i < 66; i++) {
            characters.push({
                sound: this.reader.readS32(),
                move: this.reader.readS32(),
                mood: this.reader.readU8(),
                hatPartNameIndex: this.reader.readU8(),
                hatNameIndex: this.reader.readU8(),
                infogronNameIndex: this.reader.readU8(),
                armlftNameIndex: this.reader.readU8(),
                armrtNameIndex: this.reader.readU8(),
                leglftNameIndex: this.reader.readU8(),
                legrtNameIndex: this.reader.readU8()
            });
        }

        this.parsed.characters = characters;
    }

    /**
     * Parse plant manager data (81 plants * 12 bytes = 972 bytes)
     * Each plant: variant(U8) + sound(U32LE) + move(U32LE) + mood(U8) + color(U8) + counter(S8)
     */
    parsePlants() {
        this.parsed.plantsOffset = this.reader.tell();
        const plants = [];

        for (let i = 0; i < 81; i++) {
            plants.push({
                variant: this.reader.readU8(),
                sound: this.reader.readU32(),
                move: this.reader.readU32(),
                mood: this.reader.readU8(),
                color: this.reader.readU8(),
                counter: this.reader.readS8()
            });
        }

        this.parsed.plants = plants;
    }

    /**
     * Parse building manager data (16 buildings * 10 bytes = 160 bytes + 1 byte variant)
     * Each building: sound(U32) + move(U32) + mood(U8) + counter(S8)
     */
    parseBuildings() {
        this.parsed.buildingsOffset = this.reader.tell();
        const buildings = [];

        for (let i = 0; i < 16; i++) {
            buildings.push({
                sound: this.reader.readU32(),
                move: this.reader.readU32(),
                mood: this.reader.readU8(),
                counter: this.reader.readS8()
            });
        }

        this.parsed.buildings = buildings;
        this.parsed.nextVariantOffset = this.reader.tell();
        this.parsed.nextVariant = this.reader.readU8();
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
            return this.parseAct1State();
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
     * Parse Act1State (variable length with conditional textures)
     * @returns {number} - Number of bytes consumed
     */
    parseAct1State() {
        const startOffset = this.reader.tell();

        // Read 7 named planes
        const planes = [];
        for (let i = 0; i < 7; i++) {
            const nameLength = this.reader.readS16();
            let name = '';
            if (nameLength > 0) {
                name = this.reader.readString(nameLength);
            }
            this.reader.skip(36); // position(12) + direction(12) + up(12)
            planes.push({ name, nameLength });
        }

        // Conditional textures based on which planes have names
        const textures = new Map();

        if (planes[3].nameLength > 0) {
            for (let i = 0; i < 3; i++) this.readAct1Texture(textures);
        }
        if (planes[4].nameLength > 0) {
            for (let i = 0; i < 2; i++) this.readAct1Texture(textures);
        }
        if (planes[5].nameLength > 0) {
            this.readAct1Texture(textures);
        }
        if (planes[6].nameLength > 0) {
            for (let i = 0; i < 3; i++) this.readAct1Texture(textures);
        }

        // Final fields
        const cptClickDialogueNextIndex = this.reader.readS16();
        const playedExitExplanation = this.reader.readU8();

        this.parsed.act1State = {
            planes,
            textures,
            startOffset,
            endOffset: this.reader.tell(),
            cptClickDialogueNextIndex,
            playedExitExplanation
        };

        return this.reader.tell() - startOffset;
    }

    /**
     * Read a single Act1 texture into the textures map
     * @param {Map} textures - Map to store texture data
     * @returns {string} - Texture name
     */
    readAct1Texture(textures) {
        const nameLength = this.reader.readS16();
        let name = '';
        if (nameLength > 0) {
            name = this.reader.readString(nameLength);
        }

        const width = this.reader.readU32();
        const height = this.reader.readU32();
        const paletteSize = this.reader.readU32();

        const palette = [];
        for (let i = 0; i < paletteSize; i++) {
            palette.push({
                r: this.reader.readU8(),
                g: this.reader.readU8(),
                b: this.reader.readU8()
            });
        }

        const pixels = new Uint8Array(this.reader.slice(width * height));

        const nameLower = name.toLowerCase();
        textures.set(nameLower, { name, width, height, paletteSize, palette, pixels });
        return nameLower;
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
     * @returns {{ header: SaveGameHeader, missions: MissionScores, stateLocations: GameStateLocation[], variables: Map }}
     */
    parse() {
        this.parseHeader();
        this.parseVariables();
        this.parseCharacters();
        this.parsePlants();
        this.parseBuildings();
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
