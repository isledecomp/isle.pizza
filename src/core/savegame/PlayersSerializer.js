/**
 * Serializer for Players.gsi file - updating player names
 */
import { BinaryWriter } from './BinaryWriter.js';
import { LetterIndex } from './constants.js';

/**
 * Serializer for Players.gsi file
 */
export class PlayersSerializer {
    /**
     * @param {{ count: number, players: Array<{ letters: number[], name: string }> }} playersData
     */
    constructor(playersData) {
        this.data = playersData;
    }

    /**
     * Update a player's name at the given index
     * @param {number} index - Player index
     * @param {string} newName - New name (max 7 characters, A-Z only)
     */
    updateName(index, newName) {
        if (index < 0 || index >= this.data.players.length) {
            throw new Error('Invalid player index');
        }

        // Encode the new name to letter indices
        const letters = LetterIndex.encode(newName);
        this.data.players[index].letters = letters;
        this.data.players[index].name = LetterIndex.decode(letters);
    }

    /**
     * Serialize the players data to binary format
     * @returns {ArrayBuffer}
     */
    serialize() {
        const writer = new BinaryWriter(256);

        // Write count
        writer.writeS16(this.data.count);

        // Write each player entry (7 x S16 letters each = 14 bytes)
        for (const player of this.data.players) {
            for (const letter of player.letters) {
                writer.writeS16(letter);
            }
        }

        return writer.toArrayBuffer();
    }
}

/**
 * Create a serializer for players data
 * @param {{ count: number, players: Array<{ letters: number[], name: string }> }} playersData
 * @returns {PlayersSerializer}
 */
export function createPlayersSerializer(playersData) {
    return new PlayersSerializer(playersData);
}
