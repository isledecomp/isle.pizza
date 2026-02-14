/**
 * Plant data constants ported from LEGO1 source:
 *   isle/LEGO1/lego/legoomni/src/common/legoplants.cpp
 *   isle/LEGO1/lego/legoomni/src/common/legoplantmanager.cpp
 *   isle/LEGO1/lego/legoomni/include/legoplants.h
 */

// LegoPlantInfo::Variant enum
export const PlantVariant = Object.freeze({
    FLOWER: 0,
    TREE: 1,
    BUSH: 2,
    PALM: 3
});

// LegoPlantInfo::Color enum
export const PlantColor = Object.freeze({
    WHITE: 0,
    BLACK: 1,
    YELLOW: 2,
    RED: 3,
    GREEN: 4
});

export const PlantVariantNames = Object.freeze(['Flower', 'Tree', 'Bush', 'Palm']);
export const PlantColorNames = Object.freeze(['White', 'Black', 'Yellow', 'Red', 'Green']);

// g_plantLodNames[4][5] — LOD model name indexed by [variant][color]
export const PlantLodNames = Object.freeze([
    ['flwrwht', 'flwrblk', 'flwryel', 'flwrred', 'flwrgrn'], // flower
    ['treewht', 'treeblk', 'treeyel', 'treered', 'tree'],     // tree
    ['bushwht', 'bushblk', 'bushyel', 'bushred', 'bush'],     // bush
    ['palmwht', 'palmblk', 'palmyel', 'palmred', 'palm']      // palm
]);

export const PLANT_COUNT = 81;
export const PLANT_RECORD_SIZE = 12; // variant(1) + sound(4) + move(4) + mood(1) + color(1) + counter(1)

// Field byte offsets within a 12-byte plant record
export const PlantFieldOffsets = Object.freeze({
    variant: 0,  // U8
    sound: 1,    // U32 LE
    move: 5,     // U32 LE
    mood: 9,     // U8
    color: 10,   // U8
    counter: 11  // S8
});

// Max values for cycling (exclusive upper bounds)
export const MAX_SOUND = 8;
export const MAX_MOVE = Object.freeze([3, 3, 3, 3]); // per variant
export const MAX_MOOD = 4;
export const MAX_COLOR = 5;
export const MAX_VARIANT = 4;

// g_plantSoundIdOffset — base objectId for click sounds (actual = sound + 56)
export const PLANT_SOUND_OFFSET = 56;

/**
 * g_plantInfoInit[81] — default values for all 81 plants.
 * All entries share: sound=3, move=0, mood=1, counter=-1.
 * Only variant and color differ per plant.
 */
export const PlantInfoInit = Object.freeze([
    /* 0  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 1  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 2  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 3  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 4  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 5  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 6  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 7  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 8  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 9  */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 10 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 11 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 12 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 13 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 14 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 15 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 16 */ { variant: 2, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 17 */ { variant: 2, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 18 */ { variant: 2, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 19 */ { variant: 2, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 20 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 21 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 22 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 23 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 24 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 25 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 26 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 27 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 28 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 29 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 30 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 31 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 32 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 33 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 34 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 35 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 36 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 37 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 38 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 39 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 40 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 41 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 42 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 43 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 44 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 45 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 46 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 47 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 48 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 49 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 50 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 51 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 52 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 53 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 54 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 55 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 56 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 57 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 58 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 59 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 60 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 61 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 62 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 63 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 64 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 65 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 66 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 67 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 68 */ { variant: 3, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 69 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 70 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 71 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 72 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 73 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 74 */ { variant: 1, sound: 3, move: 0, mood: 1, color: 4, counter: -1 },
    /* 75 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 76 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 77 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 },
    /* 78 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 79 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 2, counter: -1 },
    /* 80 */ { variant: 0, sound: 3, move: 0, mood: 1, color: 3, counter: -1 }
]);
