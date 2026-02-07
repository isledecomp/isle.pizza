/**
 * Image quantization utility for converting uploaded images to palette-indexed format
 */

/**
 * Quantize an image to a palette-indexed format suitable for the game.
 * The WDB palette is padded to 256 entries with black — matching how
 * LegoTextureInfo::Create() builds the DirectDraw surface palette:
 * indices 0..paletteSize-1 get the WDB colors, the rest are {0,0,0}.
 *
 * @param {HTMLImageElement} img - Source image
 * @param {number} targetWidth - Target width in pixels
 * @param {number} targetHeight - Target height in pixels
 * @param {Array<{r:number,g:number,b:number}>} basePalette - WDB palette to quantize against
 * @returns {{ palette: Array<{r:number,g:number,b:number}>, pixels: Uint8Array }}
 */
export function quantizeImage(img, targetWidth, targetHeight, basePalette) {
    // Pad to 256 entries with black, mirroring the game's surface palette
    const palette = basePalette.slice();
    while (palette.length < 256) {
        palette.push({ r: 0, g: 0, b: 0 });
    }

    // Resize to target dimensions
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const rgba = imageData.data;
    const pixelCount = targetWidth * targetHeight;

    // Build lookup cache for fast nearest-color matching
    const paletteLookup = new Map();

    // Map each pixel to nearest palette entry
    const pixels = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
        const r = rgba[i * 4];
        const g = rgba[i * 4 + 1];
        const b = rgba[i * 4 + 2];
        const key = (r << 16) | (g << 8) | b;

        if (paletteLookup.has(key)) {
            pixels[i] = paletteLookup.get(key);
        } else {
            // Find nearest color in palette
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let j = 0; j < palette.length; j++) {
                const dr = r - palette[j].r;
                const dg = g - palette[j].g;
                const db = b - palette[j].b;
                const dist = dr * dr + dg * dg + db * db;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = j;
                }
            }
            pixels[i] = bestIdx;
            paletteLookup.set(key, bestIdx);
        }
    }

    return { palette, pixels };
}

/**
 * Square a palette-indexed texture by duplicating rows or columns.
 * Mirrors the game's LegoImage::Read(p_square=TRUE) behavior.
 * @param {{ width: number, height: number, palette: Array<{r,g,b}>, pixels: Uint8Array, paletteSize?: number }} tex
 * @returns {{ width: number, height: number, palette: Array<{r,g,b}>, pixels: Uint8Array, paletteSize: number }}
 */
export function squareTexture(tex) {
    const { width, height, palette, pixels } = tex;
    if (width === height) return tex;

    const size = Math.max(width, height);
    const squared = new Uint8Array(size * size);

    if (width > height) {
        const factor = width / height;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const src = pixels[y * width + x];
                for (let k = 0; k < factor; k++) {
                    squared[(y * factor + k) * size + x] = src;
                }
            }
        }
    } else {
        const factor = height / width;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const src = pixels[y * width + x];
                for (let k = 0; k < factor; k++) {
                    squared[y * size + (x * factor + k)] = src;
                }
            }
        }
    }

    return { width: size, height: size, palette, pixels: squared, paletteSize: palette.length };
}
