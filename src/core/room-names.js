const adjectives = [
    'brave', 'swift', 'bold', 'clever', 'mighty',
    'wild', 'keen', 'fierce', 'noble', 'daring',
    'happy', 'lucky', 'sneaky', 'speedy', 'zany',
    'epic', 'fancy', 'jolly', 'plucky', 'witty',
    'cosmic', 'turbo', 'mega', 'ultra', 'super',
    'tiny', 'grand', 'royal', 'magic', 'hyper',
    'funky', 'radical', 'gnarly', 'stellar', 'wicked',
    'blazing', 'flying', 'roaming', 'dashing', 'rogue'
];

const colors = [
    'red', 'blue', 'green', 'golden', 'silver',
    'amber', 'coral', 'jade', 'ruby', 'cobalt',
    'crimson', 'azure', 'scarlet', 'violet', 'copper',
    'ivory', 'onyx', 'pearl', 'bronze', 'chrome',
    'neon', 'rusty', 'dusty', 'sunny', 'stormy',
    'frosty', 'mossy', 'sandy', 'misty', 'smoky',
    'crystal', 'marble', 'granite', 'plastic', 'painted',
    'wooden', 'steel', 'iron', 'stone', 'glass'
];

const nouns = [
    'brick', 'pizza', 'island', 'pepper', 'mama',
    'papa', 'nick', 'laura', 'brickster', 'studs',
    'rhoda', 'snap', 'infoman', 'clickitt', 'rom',
    'ding', 'legando', 'shrimp', 'hogg', 'funberg',
    'surfer', 'racer', 'cop', 'skater', 'jetski',
    'tower', 'chopper', 'minifig', 'nubby', 'maggie',
    'polly', 'brad', 'doris', 'tepid', 'bumpy',
    'trades', 'pounds', 'mail', 'greenbase', 'worse'
];

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export function generateRoomName() {
    return `${pickRandom(adjectives)}-${pickRandom(colors)}-${pickRandom(nouns)}`;
}

export function validateRoomName(name) {
    if (!name) return false;
    const parts = name.split('-');
    if (parts.length !== 3) return false;
    return adjectives.includes(parts[0]) && colors.includes(parts[1]) && nouns.includes(parts[2]);
}
