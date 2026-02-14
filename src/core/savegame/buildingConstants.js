/**
 * Building data constants ported from LEGO1 source:
 *   isle/LEGO1/lego/legoomni/src/common/legobuildingmanager.cpp
 *   isle/LEGO1/lego/legoomni/include/legobuildingmanager.h
 */

export const BUILDING_COUNT = 16;
export const BUILDING_RECORD_SIZE = 10; // sound(4) + move(4) + mood(1) + counter(1)
export const NEXT_VARIANT_SIZE = 1;

// Field byte offsets within a 10-byte building record
export const BuildingFieldOffsets = Object.freeze({
    sound: 0,    // U32 LE
    move: 4,     // U32 LE
    mood: 8,     // U8
    counter: 9   // S8
});

// LegoBuildingInfo feature flags (from legobuildingmanager.h enum)
export const BuildingFlags = Object.freeze({
    c_hasVariants: 0x01,
    c_hasSounds: 0x02,
    c_hasMoves: 0x04,
    c_hasMoods: 0x08
});

export const MAX_SOUND = 6;
export const MAX_MOVE = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 0]);
export const MAX_MOOD = 4;
export const MAX_VARIANT = 5;

export const BUILDING_SOUND_OFFSET = 60;
export const BUILDING_MOOD_SOUND_OFFSET = 66;

export const BuildingVariants = Object.freeze(['haus1', 'haus4', 'haus5', 'haus6', 'haus7']);
export const HAUS1_INDEX = 12;

// g_buildingAnimationId[16] — base animation objectId per building
export const BuildingAnimationId = Object.freeze([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0x46, 0x49, 0x4c, 0x4f, 0x52, 0x55, 0
]);

// g_buildingInfoInit[16] — default values for all 16 buildings.
// Names are the m_variant field from legobuildingmanager.cpp (entity lookup names).
export const BuildingInfoInit = Object.freeze([
    /* 0  */ { name: 'infocen',  sound: 4, move: 0, mood: 1, counter: -1, flags: 0x00 },
    /* 1  */ { name: 'policsta', sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 2  */ { name: 'Jail',     sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 3  */ { name: 'races',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 4  */ { name: 'medcntr',  sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 5  */ { name: 'gas',      sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 6  */ { name: 'beach',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 7  */ { name: 'racef',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 8  */ { name: 'racej',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 },
    /* 9  */ { name: 'Store',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3e },
    /* 10 */ { name: 'Bank',     sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3e },
    /* 11 */ { name: 'Post',     sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3e },
    /* 12 */ { name: 'haus1',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3f },
    /* 13 */ { name: 'haus2',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3e },
    /* 14 */ { name: 'haus3',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x3e },
    /* 15 */ { name: 'Pizza',    sound: 4, move: 0, mood: 1, counter: -1, flags: 0x10 }
]);

export const BuildingDisplayNames = Object.freeze([
    'Information Center', 'Police Station', 'Jail', 'Race Stands',
    'Hospital', 'Gas Station', 'Beach House', 'Race Finish',
    'Race Tracks', 'Store', 'Bank', 'Post Office',
    'House 1', 'House 2', 'House 3', 'Pizzeria'
]);
