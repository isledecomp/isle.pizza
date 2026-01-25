/**
 * Parser for Players.gsi file - player profile names
 */
import { BinaryReader } from './BinaryReader.js';
import { LetterIndex } from './constants.js';

/**
 * @typedef {Object} PlayerEntry
 * @property {number[]} letters - Array of 7 letter indices
 * @property {string} name - Decoded player name
 */

/**
 * Parser for Players.gsi file
 */
export class PlayersParser {
    /**
     * @param {ArrayBuffer} buffer - Raw file contents
     */
    constructor(buffer) {
        this.reader = new BinaryReader(buffer);
    }

    /**
     * Parse the Players.gsi file
     * @returns {{ count: number, players: PlayerEntry[] }}
     */
    parse() {
        const count = this.reader.readS16();
        const players = [];

        for (let i = 0; i < count; i++) {
            const letters = [];
            for (let j = 0; j < 7; j++) {
                letters.push(this.reader.readS16());
            }

            const name = LetterIndex.decode(letters);
            players.push({ letters, name });
        }

        return { count, players };
    }
}

/**
 * Parse Players.gsi buffer and return player names
 * @param {ArrayBuffer} buffer - Raw file contents
 * @returns {{ count: number, players: PlayerEntry[] }}
 */
export function parsePlayers(buffer) {
    const parser = new PlayersParser(buffer);
    return parser.parse();
}
