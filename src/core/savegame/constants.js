/**
 * Constants and enums from KSY save file specifications
 */

// Re-export actor constants
export { ActorInfoInit, ActorLODs, ActorPart, ActorLODFlags, ActorPartLabels,
    CharacterType, getCharacterType, CharacterFieldOffsets, CHARACTER_RECORD_SIZE,
    hatPartNames, bodyPartNames, chestTextures, faceTextures, colorAliases
} from './actorConstants.js';

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

// LEGO brick colors (from legoroi.cpp)
export const LegoColors = Object.freeze({
    'lego black': { r: 0x21, g: 0x21, b: 0x21 },
    'lego blue': { r: 0x00, g: 0x54, b: 0x8c },
    'lego green': { r: 0x00, g: 0x78, b: 0x2d },
    'lego red': { r: 0xcb, g: 0x12, b: 0x20 },
    'lego white': { r: 0xfa, g: 0xfa, b: 0xfa },
    'lego yellow': { r: 0xff, g: 0xb9, b: 0x00 }
});

// LEGO color display names and order
export const LegoColorNames = ['lego black', 'lego blue', 'lego green', 'lego red', 'lego white', 'lego yellow'];

// Vehicle build world names in WDB
export const VehicleWorlds = Object.freeze({
    dunebuggy: 'BLDD',
    helicopter: 'BLDH',
    jetski: 'BLDJ',
    racecar: 'BLDR'
});

// Vehicle model names within each world
export const VehicleModels = Object.freeze({
    dunebuggy: 'Dunebld',
    helicopter: 'Chptrbld',
    jetski: 'Jetbld',
    racecar: 'bldrace'
});

// Vehicle display names
export const VehicleNames = Object.freeze({
    dunebuggy: 'Dune Buggy',
    helicopter: 'Helicopter',
    jetski: 'Jetski',
    racecar: 'Race Car'
});

// Act1State plane indices for each vehicle type (indices into the 7-plane array)
export const Act1PlaneIndices = Object.freeze({
    helicopter: 3,
    jetski: 4,
    dunebuggy: 5,
    racecar: 6
});

// Parts that have UV-mapped texture regions in Act1State
// textureName: name stored in Act1State, texFiles: base names of 4 default .tex files
export const TexturedParts = Object.freeze({
    chwindy1: { textureName: 'chwind.gif', texFiles: ['CHWIND1', 'CHWIND2', 'CHWIND3', 'CHWIND4'], vehicle: 'helicopter' },
    chljety1: { textureName: 'chjetl.gif', texFiles: ['CHJETL1', 'CHJETL2', 'CHJETL3', 'CHJETL4'], vehicle: 'helicopter' },
    chrjety1: { textureName: 'chjetr.gif', texFiles: ['CHJETR1', 'CHJETR2', 'CHJETR3', 'CHJETR4'], vehicle: 'helicopter' },
    jsfrnty5: { textureName: 'jsfrnt.gif', texFiles: ['jsfrnt1', 'jsfrnt2', 'jsfrnt3', 'jsfrnt4'], vehicle: 'jetski' },
    jswnshy5: { textureName: 'jswnsh.gif', texFiles: ['JSWNSH1', 'JSWNSH2', 'JSWNSH3', 'JSWNSH4'], vehicle: 'jetski' },
    dbfrfny4: { textureName: 'dbfrfn.gif', texFiles: ['Dbfrfn1', 'Dbfrfn2', 'Dbfrfn3', 'Dbfrfn4'], vehicle: 'dunebuggy' },
    rcfrnty6: { textureName: 'rcfrnt.gif', texFiles: ['rcfrnt1', 'rcfrnt2', 'rcfrnt3', 'rcfrnt4'], vehicle: 'racecar' },
    rcbacky6: { textureName: 'rcback.gif', texFiles: ['rcback1', 'rcback2', 'rcback3', 'rcback4'], vehicle: 'racecar' },
    rctailya: { textureName: 'rctail.gif', texFiles: ['rctail1', 'rctail2', 'rctail3', 'rctail4'], vehicle: 'racecar' }
});

// Texture write order per vehicle in Act1State (from isle.cpp Act1State::Serialize)
export const Act1TextureOrder = Object.freeze({
    helicopter: ['chwind.gif', 'chjetl.gif', 'chjetr.gif'],
    jetski: ['jsfrnt.gif', 'jswnsh.gif'],
    dunebuggy: ['dbfrfn.gif'],
    racecar: ['rcfrnt.gif', 'rcback.gif', 'rctail.gif']
});

// Vehicle part color definitions - 43 parts total (from legogamestate.cpp)
export const VehiclePartColors = Object.freeze({
    dunebuggy: [
        { part: 'dbbkfny0', variable: 'c_dbbkfny0', label: 'Back Fender', defaultColor: 'lego red' },
        { part: 'dbbkxlY0', variable: 'c_dbbkxly0', label: 'Back Axle', defaultColor: 'lego white' },
        { part: 'dbfbrdY0', variable: 'c_dbfbrdy0', label: 'Body', defaultColor: 'lego red' },
        { part: 'dbflagY0', variable: 'c_dbflagy0', label: 'Flag', defaultColor: 'lego yellow' },
        { part: 'dbfrfny4', variable: 'c_dbfrfny4', label: 'Front Fender', defaultColor: 'lego red' },
        { part: 'dbfrxlY0', variable: 'c_dbfrxly0', label: 'Front Axle', defaultColor: 'lego white' },
        { part: 'dbhndln0', variable: 'c_dbhndly0', label: 'Handlebar', defaultColor: 'lego white' },
        { part: 'dbltbrY0', variable: 'c_dbltbry0', label: 'Rear Lights', defaultColor: 'lego white' }
    ],
    helicopter: [
        { part: 'chbasey0', variable: 'c_chbasey0', label: 'Base', defaultColor: 'lego black' },
        { part: 'chbacky0', variable: 'c_chbacky0', label: 'Back', defaultColor: 'lego black' },
        { part: 'chdishy0', variable: 'c_chdishy0', label: 'Dish', defaultColor: 'lego white' },
        { part: 'chhorny0', variable: 'c_chhorny0', label: 'Horn', defaultColor: 'lego black' },
        { part: 'chljety1', variable: 'c_chljety1', label: 'Left Jet', defaultColor: 'lego black' },
        { part: 'chrjety1', variable: 'c_chrjety1', label: 'Right Jet', defaultColor: 'lego black' },
        { part: 'chmidly0', variable: 'c_chmidly0', label: 'Middle', defaultColor: 'lego black' },
        { part: 'chmotry0', variable: 'c_chmotry0', label: 'Motor', defaultColor: 'lego blue' },
        { part: 'chsidly0', variable: 'c_chsidly0', label: 'Left Side', defaultColor: 'lego black' },
        { part: 'chsidry0', variable: 'c_chsidry0', label: 'Right Side', defaultColor: 'lego black' },
        { part: 'chstuty0', variable: 'c_chstuty0', label: 'Skids', defaultColor: 'lego black' },
        { part: 'chtaily0', variable: 'c_chtaily0', label: 'Tail', defaultColor: 'lego black' },
        { part: 'chwindy1', variable: 'c_chwindy1', label: 'Windshield', defaultColor: 'lego black' },
        { part: 'chblady0', variable: 'c_chblady0', label: 'Blades', defaultColor: 'lego black' },
        { part: 'chseaty0', variable: 'c_chseaty0', label: 'Seat', defaultColor: 'lego white' }
    ],
    jetski: [
        { part: 'jsdashy0', variable: 'c_jsdashy0', label: 'Dashboard', defaultColor: 'lego white' },
        { part: 'jsexhy0', variable: 'c_jsexhy0', label: 'Exhaust', defaultColor: 'lego black' },
        { part: 'jsfrnty5', variable: 'c_jsfrnty5', label: 'Front', defaultColor: 'lego black' },
        { part: 'jshndln0', variable: 'c_jshndly0', label: 'Handlebar', defaultColor: 'lego red' },
        { part: 'jslsidy0', variable: 'c_jslsidy0', label: 'Left Side', defaultColor: 'lego black' },
        { part: 'jsrsidy0', variable: 'c_jsrsidy0', label: 'Right Side', defaultColor: 'lego black' },
        { part: 'jsskiby0', variable: 'c_jsskiby0', label: 'Ski Body', defaultColor: 'lego red' },
        { part: 'jswnshy5', variable: 'c_jswnshy5', label: 'Windshield', defaultColor: 'lego white' },
        { part: 'jsbasey0', variable: 'c_jsbasey0', label: 'Base', defaultColor: 'lego white' }
    ],
    racecar: [
        { part: 'rcbacky6', variable: 'c_rcbacky6', label: 'Back', defaultColor: 'lego green' },
        { part: 'rcedgey0', variable: 'c_rcedgey0', label: 'Edge', defaultColor: 'lego green' },
        { part: 'rcfrmey0', variable: 'c_rcfrmey0', label: 'Frame', defaultColor: 'lego red' },
        { part: 'rcfrnty6', variable: 'c_rcfrnty6', label: 'Front', defaultColor: 'lego green' },
        { part: 'rcmotry0', variable: 'c_rcmotry0', label: 'Motor', defaultColor: 'lego white' },
        { part: 'rcsidey0', variable: 'c_rcsidey0', label: 'Side', defaultColor: 'lego green' },
        { part: 'rcstery0', variable: 'c_rcstery0', label: 'Steering Wheel', defaultColor: 'lego white' },
        { part: 'rcstrpy0', variable: 'c_rcstrpy0', label: 'Stripe', defaultColor: 'lego yellow' },
        { part: 'rctailya', variable: 'c_rctailya', label: 'Tail', defaultColor: 'lego white' },
        { part: 'rcwhl1y0', variable: 'c_rcwhl1y0', label: 'Wheels 1', defaultColor: 'lego white' },
        { part: 'rcwhl2y0', variable: 'c_rcwhl2y0', label: 'Wheels 2', defaultColor: 'lego white' }
    ]
});
