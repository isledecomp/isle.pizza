/**
 * Parser for .tex texture files
 * Format: U32 num_textures, then per texture:
 *   U32 name_buffer_length + name (null-terminated within buffer)
 *   + U32 width + U32 height + U32 palette_size
 *   + RGB[palette_size] + pixels[width*height]
 */
import { BinaryReader } from './BinaryReader.js';

/**
 * Parse a .tex file buffer
 * @param {ArrayBuffer} buffer - Raw .tex file contents
 * @returns {{ textures: Array<{ name: string, width: number, height: number, paletteSize: number, palette: Array<{r,g,b}>, pixels: Uint8Array }> }}
 */
export function parseTex(buffer) {
    const reader = new BinaryReader(buffer);
    const numTextures = reader.readU32();
    const textures = [];

    for (let i = 0; i < numTextures; i++) {
        const nameBufferLength = reader.readU32();
        const nameRaw = reader.readString(nameBufferLength);
        const name = nameRaw.split('\0')[0].toLowerCase();

        const width = reader.readU32();
        const height = reader.readU32();
        const paletteSize = reader.readU32();

        const palette = [];
        for (let j = 0; j < paletteSize; j++) {
            palette.push({
                r: reader.readU8(),
                g: reader.readU8(),
                b: reader.readU8()
            });
        }

        const pixels = new Uint8Array(reader.slice(width * height));

        textures.push({ name, width, height, paletteSize, palette, pixels });
    }

    return { textures };
}
