/**
 * Actor data constants ported from LEGO1 source:
 *   isle/LEGO1/lego/legoomni/src/common/legoactors.cpp
 *   isle/LEGO1/lego/legoomni/include/legoactors.h
 */

// LegoActorLOD flags
export const ActorLODFlags = Object.freeze({
    USE_TEXTURE: 0x01,
    USE_COLOR: 0x02
});

// LegoActorLODs enum — indices into ActorLODs[]
export const ActorLODIndex = Object.freeze({
    TOP: 0,
    BODY: 1,
    INFOHAT: 2,
    INFOGRON: 3,
    HEAD: 4,
    ARMLFT: 5,
    ARMRT: 6,
    CLAWLFT: 7,
    CLAWRT: 8,
    LEGLFT: 9,
    LEGRT: 10
});

// LegoActorParts enum — indices into the 10-part array on each actor
export const ActorPart = Object.freeze({
    BODY: 0,
    INFOHAT: 1,
    INFOGRON: 2,
    HEAD: 3,
    ARMLFT: 4,
    ARMRT: 5,
    CLAWLFT: 6,
    CLAWRT: 7,
    LEGLFT: 8,
    LEGRT: 9
});

// Mapping from ActorPart index to the ActorLOD that provides its transform.
// ActorLODs[0] ("top") is the root and not directly a part.
// Parts 0..9 map to ActorLODs[1..10] respectively.
export const partToLODIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * g_actorLODs[11] — transform/bounding data for each body part position.
 * Fields: name, parentName, flags, boundingSphere[4], boundingBox[6],
 *         position[3], direction[3], up[3]
 */
export const ActorLODs = Object.freeze([
    { name: 'top', parentName: 'top', flags: 0,
      boundingSphere: [0.000267, 0.780808, -0.01906, 0.951612],
      boundingBox: [-0.461166, -0.002794, -0.299442, 0.4617, 1.56441, 0.261321],
      position: [0, 0, 0], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'body', parentName: 'body', flags: ActorLODFlags.USE_TEXTURE,
      boundingSphere: [0.00158332, 0.401828, -0.00048697, 0.408071],
      boundingBox: [-0.287507, 0.150419, -0.147452, 0.289219, 0.649774, 0.14258],
      position: [-0.00089, 0.436353, 0.007277], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'infohat', parentName: 'infohat', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0, -0.00938, -0.01955, 0.35],
      boundingBox: [-0.231822, -0.140237, -0.320954, 0.234149, 0.076968, 0.249083],
      position: [0.000191, 1.519793, 0.001767], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'infogron', parentName: 'infogron', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0, 0.11477, 0.00042, 0.26],
      boundingBox: [-0.285558, -0.134391, -0.142231, 0.285507, 0.152986, 0.143071],
      position: [-0.00089, 0.436353, 0.007277], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'head', parentName: 'head', flags: ActorLODFlags.USE_TEXTURE,
      boundingSphere: [0, -0.03006, 0, 0.3],
      boundingBox: [-0.189506, -0.209665, -0.189824, 0.189532, 0.228822, 0.194945],
      position: [-0.00105, 1.293115, 0.001781], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'arm-lft', parentName: 'arm-lft', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [-0.06815, -0.0973747, 0.0154655, 0.237],
      boundingBox: [-0.137931, -0.282775, -0.105316, 0.000989, 0.100221, 0.140759],
      position: [-0.225678, 0.963312, 0.023286],
      direction: [-0.003031, -0.017187, 0.999848], up: [0.173622, 0.984658, 0.017453] },
    { name: 'arm-rt', parentName: 'arm-rt', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0.0680946, -0.097152, 0.0152722, 0.237],
      boundingBox: [0.00141, -0.289604, -0.100831, 0.138786, 0.09291, 0.145437],
      position: [0.223494, 0.963583, 0.018302],
      direction: [0, 0, 1], up: [-0.173648, 0.984808, 0] },
    { name: 'claw-lft', parentName: 'claw-lft', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
      boundingBox: [-0.089838, -0.246208, -0.117735, 0.091275, 0.000263, 0.07215],
      position: [-0.341869, 0.700355, 0.092779],
      direction: [0.000001, 0.000003, 1], up: [0.190812, 0.981627, -0.000003] },
    { name: 'claw-rt', parentName: 'claw-lft', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
      boundingBox: [-0.095016, -0.245349, -0.117979, 0.086528, 0.00067, 0.069743],
      position: [0.343317, 0.69924, 0.096123],
      direction: [0.00606, -0.034369, 0.999391], up: [-0.190704, 0.981027, 0.034894] },
    { name: 'leg-lft', parentName: 'leg', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
      boundingBox: [-0.129782, -0.440428, -0.184207, 0.13817, 0.118415, 0.122607],
      position: [-0.156339, 0.436087, 0.006822], direction: [0, 0, 1], up: [0, 1, 0] },
    { name: 'leg-rt', parentName: 'leg', flags: ActorLODFlags.USE_COLOR,
      boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
      boundingBox: [-0.132864, -0.437138, -0.183944, 0.134614, 0.12043, 0.121888],
      position: [0.151154, 0.436296, 0.007373], direction: [0, 0, 1], up: [0, 1, 0] }
]);

// Index arrays — 0xff marks end-of-list sentinel
export const hatPartIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
export const pepperHatPartIndices = [21, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
export const infomanHatPartIndices = [22];
export const ghostHatPartIndices = [20];
export const bodyPartIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const hatColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const faceTextureIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const chestTextureIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27];
export const armColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const clawRightColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const clawLeftColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const gronColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];
export const legColorIndices = [0, 1, 2, 3, 4, 5, 6, 7];

// Name arrays
export const hatPartNames = [
    'baseball', 'chef', 'cap', 'cophat', 'helmet', 'ponytail', 'pageboy', 'shrthair',
    'bald', 'flower', 'cboyhat', 'cuphat', 'cathat', 'backbcap', 'pizhat', 'caprc',
    'capch', 'capdb', 'capjs', 'capmd', 'sheet', 'phat', 'icap'
];

export const bodyPartNames = [
    'body', 'bodyred', 'bodyblck', 'bodywhte', 'bodyyllw', 'bodyblue', 'bodygren', 'bodybrwn'
];

export const chestTextures = [
    'peprchst.gif', 'mamachst.gif', 'papachst.gif', 'nickchst.gif', 'norachst.gif',
    'infochst.gif', 'shftchst.gif', 'rac1chst.gif', 'rac2chst.gif', 'bth1chst.gif',
    'bth2chst.gif', 'mech.gif', 'polkadot.gif', 'bowtie.gif', 'postchst.gif',
    'vest.gif', 'doctor.gif', 'copchest.gif', 'l.gif', 'e.gif',
    'g.gif', 'o.gif', 'fruit.gif', 'flowers.gif', 'construct.gif',
    'paint.gif', 'l6.gif', 'unkchst.gif'
];

export const faceTextures = [
    'peprface.gif', 'mamaface.gif', 'papaface.gif', 'nickface.gif', 'noraface.gif',
    'infoface.gif', 'shftface.gif', 'dogface.gif', 'womanshd.gif', 'smileshd.gif',
    'woman.gif', 'smile.gif', 'mustache.gif', 'black.gif'
];

export const colorAliases = [
    'lego white', 'lego black', 'lego yellow', 'lego red', 'lego blue', 'lego brown', 'lego lt grey', 'lego green'
];

// Character type classification
export const CharacterType = Object.freeze({
    STANDARD: 0,
    PEPPER: 1,
    INFOMAN: 2,
    GHOST: 3
});

/**
 * Determine character type from actor index
 */
export function getCharacterType(actorIndex) {
    if (actorIndex === 0 || actorIndex === 56) return CharacterType.PEPPER; // pepper, pep
    if (actorIndex === 5) return CharacterType.INFOMAN;
    if (actorIndex >= 48 && actorIndex <= 53) return CharacterType.GHOST; // ghost, ghost01..05
    return CharacterType.STANDARD;
}

// Reference names for the index arrays (used to build part configs)
const HP = 'hatPartIndices';
const PHP = 'pepperHatPartIndices';
const IHP = 'infomanHatPartIndices';
const GHP = 'ghostHatPartIndices';
const BP = 'bodyPartIndices';
const HC = 'hatColorIndices';
const FT = 'faceTextureIndices';
const CT = 'chestTextureIndices';
const AC = 'armColorIndices';
const CRC = 'clawRightColorIndices';
const CLC = 'clawLeftColorIndices';
const GC = 'gronColorIndices';
const LC = 'legColorIndices';

// Lookup tables for the index array references
const indexArrays = {
    [HP]: hatPartIndices,
    [PHP]: pepperHatPartIndices,
    [IHP]: infomanHatPartIndices,
    [GHP]: ghostHatPartIndices,
    [BP]: bodyPartIndices,
    [HC]: hatColorIndices,
    [FT]: faceTextureIndices,
    [CT]: chestTextureIndices,
    [AC]: armColorIndices,
    [CRC]: clawRightColorIndices,
    [CLC]: clawLeftColorIndices,
    [GC]: gronColorIndices,
    [LC]: legColorIndices
};

const nameArrays = {
    hatPartNames,
    bodyPartNames,
    chestTextures,
    faceTextures,
    colorAliases
};

/**
 * Helper to build a Part entry from compact form.
 * C++ Part has: { partNameIndices, partName, partNameIndex, nameIndices, names, nameIndex }
 * We store references to our JS arrays.
 */
function P(partNameIndicesRef, partNamesRef, partNameIndex, nameIndicesRef, namesRef, nameIndex) {
    return {
        partNameIndices: partNameIndicesRef ? indexArrays[partNameIndicesRef] : null,
        partNames: partNamesRef ? nameArrays[partNamesRef] : null,
        partNameIndex,
        nameIndices: indexArrays[nameIndicesRef],
        names: nameArrays[namesRef],
        nameIndex
    };
}

// Short aliases for name array refs
const HPN = 'hatPartNames';
const BPN = 'bodyPartNames';
const CTN = 'chestTextures';
const FTN = 'faceTextures';
const CA = 'colorAliases';

/**
 * g_actorInfoInit[66] — All 66 game actors.
 * Each entry: { name, sound, move, mood, parts[10] }
 * Parts order: body, infohat, infogron, head, armlft, armrt, clawlft, clawrt, leglft, legrt
 */
export const ActorInfoInit = Object.freeze([
    /* 0 */ { name: 'pepper', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 0), P(PHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 0),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 1 */ { name: 'mama', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 1), P(HP, HPN, 1, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 1),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 2 */ { name: 'papa', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 2, CT, CTN, 2), P(HP, HPN, 1, HC, CA, 0),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 2),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 3 */ { name: 'nick', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 2, CT, CTN, 3), P(HP, HPN, 3, HC, CA, 1),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 3),
        P(null, null, 0, AC, CA, 1), P(null, null, 0, AC, CA, 1),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 4 */ { name: 'laura', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 2, CT, CTN, 4), P(HP, HPN, 3, HC, CA, 1),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 4),
        P(null, null, 0, AC, CA, 1), P(null, null, 0, AC, CA, 1),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 5 */ { name: 'infoman', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 5), P(IHP, HPN, 0, HC, CA, 3),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 5),
        P(null, null, 0, AC, CA, 1), P(null, null, 0, AC, CA, 1),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 6 */ { name: 'brickstr', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 6), P(HP, HPN, 13, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 6),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 4),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 7 */ { name: 'studs', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 7), P(HP, HPN, 4, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 7),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 8 */ { name: 'rhoda', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 8), P(HP, HPN, 4, HC, CA, 3),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 9 */ { name: 'valerie', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 9), P(HP, HPN, 5, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 10 */ { name: 'snap', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 10), P(HP, HPN, 0, HC, CA, 4),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 11 */ { name: 'pt', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 6, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 12 */ { name: 'mg', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 12), P(HP, HPN, 6, HC, CA, 5),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 13 */ { name: 'bu', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 13), P(HP, HPN, 7, HC, CA, 5),
        P(null, null, 0, GC, CA, 5), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 5), P(null, null, 0, LC, CA, 5)] },
    /* 14 */ { name: 'ml', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 14), P(HP, HPN, 2, HC, CA, 4),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 15 */ { name: 'nu', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 7),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 16 */ { name: 'na', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 15), P(HP, HPN, 10, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 17 */ { name: 'cl', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 16), P(HP, HPN, 19, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 18 */ { name: 'en', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 16), P(HP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 19 */ { name: 're', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 16), P(HP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 20 */ { name: 'ro', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 2, CT, CTN, 17), P(HP, HPN, 3, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 1), P(null, null, 0, AC, CA, 1),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 21 */ { name: 'd1', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 15, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 22 */ { name: 'd2', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 16, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 23 */ { name: 'd3', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 17, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 24 */ { name: 'd4', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 11), P(HP, HPN, 18, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 25 */ { name: 'l1', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 18), P(HP, HPN, 5, HC, CA, 1),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 26 */ { name: 'l2', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 19), P(HP, HPN, 6, HC, CA, 1),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 27 */ { name: 'l3', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 20), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 28 */ { name: 'l4', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 21), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 29 */ { name: 'l5', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 26), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 30 */ { name: 'l6', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 26), P(HP, HPN, 0, HC, CA, 1),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 31 */ { name: 'b1', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 1), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 32 */ { name: 'b2', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 1), P(HP, HPN, 5, HC, CA, 1),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 33 */ { name: 'b3', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 4), P(HP, HPN, 7, HC, CA, 5),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 34 */ { name: 'b4', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 1), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 35 */ { name: 'cm', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 4, CT, CTN, 22), P(HP, HPN, 9, HC, CA, 2),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 36 */ { name: 'gd', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 1), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 6), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 6), P(null, null, 0, AC, CA, 6),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 6), P(null, null, 0, LC, CA, 6)] },
    /* 37 */ { name: 'rd', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 0, HC, CA, 3),
        P(null, null, 0, GC, CA, 7), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 7), P(null, null, 0, LC, CA, 7)] },
    /* 38 */ { name: 'pg', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 5, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 39 */ { name: 'bd', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 6), P(HP, HPN, 0, HC, CA, 6),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 40 */ { name: 'sy', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 4), P(HP, HPN, 5, HC, CA, 6),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 41 */ { name: 'gn', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 6, CT, CTN, 13), P(HP, HPN, 7, HC, CA, 5),
        P(null, null, 0, GC, CA, 5), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 5), P(null, null, 0, LC, CA, 5)] },
    /* 42 */ { name: 'df', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 5, CT, CTN, 23), P(HP, HPN, 6, HC, CA, 5),
        P(null, null, 0, GC, CA, 6), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 4), P(null, null, 0, AC, CA, 4),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 6), P(null, null, 0, LC, CA, 6)] },
    /* 43 */ { name: 'bs', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 10), P(HP, HPN, 7, HC, CA, 3),
        P(null, null, 0, GC, CA, 7), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 44 */ { name: 'lt', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 10), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 45 */ { name: 'st', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 9), P(HP, HPN, 5, HC, CA, 5),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 46 */ { name: 'bm', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 24), P(HP, HPN, 0, HC, CA, 4),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 7),
        P(null, null, 0, AC, CA, 6), P(null, null, 0, AC, CA, 6),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 47 */ { name: 'jk', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 24), P(HP, HPN, 0, HC, CA, 4),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 6), P(null, null, 0, AC, CA, 6),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 48 */ { name: 'ghost', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 49 */ { name: 'ghost01', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 50 */ { name: 'ghost02', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 51 */ { name: 'ghost03', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 52 */ { name: 'ghost04', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 53 */ { name: 'ghost05', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 0), P(GHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 0), P(null, null, 0, FT, FTN, 13),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 0), P(null, null, 0, CRC, CA, 0),
        P(null, null, 0, LC, CA, 0), P(null, null, 0, LC, CA, 0)] },
    /* 54 */ { name: 'hg', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 8, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 3), P(null, null, 0, CRC, CA, 3),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 55 */ { name: 'pntgy', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 0, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 7),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 3), P(null, null, 0, CRC, CA, 3),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 56 */ { name: 'pep', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 0), P(PHP, HPN, 0, HC, CA, 0),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 0),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 57 */ { name: 'cop01', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 2, CT, CTN, 17), P(HP, HPN, 3, HC, CA, 1),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 1), P(null, null, 0, AC, CA, 1),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 58 */ { name: 'actor_01', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 4), P(HP, HPN, 5, HC, CA, 6),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 59 */ { name: 'actor_02', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 6), P(HP, HPN, 0, HC, CA, 6),
        P(null, null, 0, GC, CA, 1), P(null, null, 0, FT, FTN, 12),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 1), P(null, null, 0, LC, CA, 1)] },
    /* 60 */ { name: 'actor_03', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 1), P(HP, HPN, 7, HC, CA, 1),
        P(null, null, 0, GC, CA, 6), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 6), P(null, null, 0, AC, CA, 6),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 6), P(null, null, 0, LC, CA, 6)] },
    /* 61 */ { name: 'actor_04', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 1, CT, CTN, 12), P(HP, HPN, 6, HC, CA, 5),
        P(null, null, 0, GC, CA, 4), P(null, null, 0, FT, FTN, 10),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 4), P(null, null, 0, LC, CA, 4)] },
    /* 62 */ { name: 'actor_05', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 4, CT, CTN, 22), P(HP, HPN, 9, HC, CA, 2),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 8),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 63 */ { name: 'btmncycl', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 5, HC, CA, 3),
        P(null, null, 0, GC, CA, 3), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 0), P(null, null, 0, AC, CA, 0),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 3), P(null, null, 0, LC, CA, 3)] },
    /* 64 */ { name: 'cboycycl', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 3, CT, CTN, 10), P(HP, HPN, 7, HC, CA, 3),
        P(null, null, 0, GC, CA, 7), P(null, null, 0, FT, FTN, 11),
        P(null, null, 0, AC, CA, 2), P(null, null, 0, AC, CA, 2),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 2), P(null, null, 0, LC, CA, 2)] },
    /* 65 */ { name: 'boatman', sound: 0, move: 0, mood: 0, parts: [
        P(BP, BPN, 0, LC, CA, 3), P(HP, HPN, 0, HC, CA, 3),
        P(null, null, 0, GC, CA, 7), P(null, null, 0, FT, FTN, 9),
        P(null, null, 0, AC, CA, 3), P(null, null, 0, AC, CA, 3),
        P(null, null, 0, CLC, CA, 2), P(null, null, 0, CRC, CA, 2),
        P(null, null, 0, LC, CA, 7), P(null, null, 0, LC, CA, 7)] }
]);

/**
 * Save file field offsets within the 16-byte character record.
 * The save file stores these per-character values that override defaults:
 *   sound(S32) + move(S32) + mood(U8) + hatPartNameIndex(U8) + hatNameIndex(U8)
 *   + infogronNameIndex(U8) + armlftNameIndex(U8) + armrtNameIndex(U8)
 *   + leglftNameIndex(U8) + legrtNameIndex(U8)
 */
export const CharacterFieldOffsets = Object.freeze({
    sound: 0,            // S32
    move: 4,             // S32
    mood: 8,             // U8
    hatPartNameIndex: 9, // U8
    hatNameIndex: 10,    // U8
    infogronNameIndex: 11, // U8
    armlftNameIndex: 12, // U8
    armrtNameIndex: 13,  // U8
    leglftNameIndex: 14, // U8
    legrtNameIndex: 15   // U8
});

export const CHARACTER_RECORD_SIZE = 16;

/**
 * Part labels for display
 */
export const ActorPartLabels = Object.freeze({
    0: 'Body',
    1: 'Hat',
    2: 'Torso Emblem',
    3: 'Head',
    4: 'Left Arm',
    5: 'Right Arm',
    6: 'Left Claw',
    7: 'Right Claw',
    8: 'Left Leg',
    9: 'Right Leg'
});
