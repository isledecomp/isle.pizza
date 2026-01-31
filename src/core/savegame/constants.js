/**
 * Constants and enums from KSY save file specifications
 */

// Save game file version (must match for valid saves)
export const SAVEGAME_VERSION = 0x1000c; // 65548

// Actor enum - playable characters
export const Actor = Object.freeze({
    NONE: 0,
    PEPPER: 1,
    MAMA: 2,
    PAPA: 3,
    NICK: 4,
    LAURA: 5
});

// Actor display names
export const ActorNames = Object.freeze({
    0: 'None',
    1: 'Pepper',
    2: 'Mama',
    3: 'Papa',
    4: 'Nick',
    5: 'Laura'
});

// Act enum
export const Act = Object.freeze({
    ACT1: 0,
    ACT2: 1,
    ACT3: 2
});

// Score color enum - used for mission scores
export const ScoreColor = Object.freeze({
    GREY: 0,
    YELLOW: 1,
    BLUE: 2,
    RED: 3
});

// Score color to CSS color mapping
export const ScoreColorCSS = Object.freeze({
    0: '#808080', // grey
    1: '#FFD700', // yellow (gold)
    2: '#4169E1', // blue (royal blue)
    3: '#DC143C'  // red (crimson)
});

// Score color display names
export const ScoreColorNames = Object.freeze({
    0: 'Grey',
    1: 'Yellow',
    2: 'Blue',
    3: 'Red'
});

// Mission types that have scores
export const MissionTypes = Object.freeze({
    PIZZA: 'pizza',
    CAR_RACE: 'carRace',
    JETSKI_RACE: 'jetskiRace',
    TOW_TRACK: 'towTrack',
    AMBULANCE: 'ambulance'
});

// Mission display names
export const MissionNames = Object.freeze({
    pizza: 'Pizza Delivery',
    carRace: 'Car Race',
    jetskiRace: 'Jetski Race',
    towTrack: 'Tow Track',
    ambulance: 'Ambulance'
});

// Game state type names for polymorphic parsing
export const GameStateTypes = Object.freeze({
    PIZZERIA: 'PizzeriaState',
    PIZZA_MISSION: 'PizzaMissionState',
    TOW_TRACK: 'TowTrackMissionState',
    AMBULANCE: 'AmbulanceMissionState',
    HOSPITAL: 'HospitalState',
    GAS_STATION: 'GasStationState',
    POLICE: 'PoliceState',
    JETSKI_RACE: 'JetskiRaceState',
    CAR_RACE: 'CarRaceState',
    JETSKI_BUILD: 'LegoJetskiBuildState',
    COPTER_BUILD: 'LegoCopterBuildState',
    DUNE_CAR_BUILD: 'LegoDuneCarBuildState',
    RACE_CAR_BUILD: 'LegoRaceCarBuildState',
    ANIM: 'AnimState',
    ACT1: 'Act1State'
});

// Fixed sizes for known game state types (for skipping)
export const GameStateSizes = Object.freeze({
    'PizzeriaState': 10,
    'PizzaMissionState': 40,
    'TowTrackMissionState': 20,
    'AmbulanceMissionState': 20,
    'HospitalState': 12,
    'GasStationState': 10,
    'PoliceState': 4,
    'JetskiRaceState': 25,
    'CarRaceState': 25,
    'LegoJetskiBuildState': 4,
    'LegoCopterBuildState': 4,
    'LegoDuneCarBuildState': 4,
    'LegoRaceCarBuildState': 4
    // AnimState and Act1State are variable length
});

// Letter index utilities for username encoding/decoding
export const LetterIndex = {
    /**
     * Convert letter index to character
     * @param {number} index - Letter index from save file
     * @returns {string} - Character or empty string
     */
    toChar(index) {
        // Standard alphabet A-Z
        if (index >= 0 && index <= 25) {
            return String.fromCharCode(65 + index); // A = 65 in ASCII
        }
        // International characters (simplified)
        if (index === 29) return 'A'; // Originally international chars
        if (index === 30) return 'O';
        if (index === 31) return 'S';
        if (index === 32) return 'U';
        // Empty/unused position
        if (index === -1 || index === 0xFFFF) return '';
        return '?';
    },

    /**
     * Convert character to letter index
     * @param {string} char - Single character
     * @returns {number} - Letter index or -1 for invalid/empty
     */
    fromChar(char) {
        if (!char) return -1;
        const upper = char.toUpperCase();
        const code = upper.charCodeAt(0);
        // A-Z
        if (code >= 65 && code <= 90) {
            return code - 65;
        }
        return -1;
    },

    /**
     * Decode array of letter indices to string
     * @param {number[]} letters - Array of 7 letter indices
     * @returns {string} - Decoded player name
     */
    decode(letters) {
        return letters.map(l => this.toChar(l)).join('').trim();
    },

    /**
     * Encode string to array of 7 letter indices
     * @param {string} name - Player name (max 7 chars)
     * @returns {number[]} - Array of 7 letter indices
     */
    encode(name) {
        const letters = [];
        const upper = name.toUpperCase().slice(0, 7);
        for (let i = 0; i < 7; i++) {
            if (i < upper.length) {
                letters.push(this.fromChar(upper[i]));
            } else {
                letters.push(-1); // Empty position
            }
        }
        return letters;
    }
};

// Save file names
export const PLAYERS_FILE = 'Players.gsi';
export const HISTORY_FILE = 'History.gsi';

/**
 * Get save slot filename
 * @param {number} slot - Slot number 0-9
 * @returns {string} - Filename like "G0.GS"
 */
export function getSaveFileName(slot) {
    return `G${slot}.GS`;
}
