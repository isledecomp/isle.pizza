/**
 * Color utilities for LEGO Island's custom HSV-based background color
 *
 * IMPORTANT: LEGO Island uses a NON-STANDARD HSV algorithm (see legoutils.cpp)
 * - H (Hue): 0-100 maps to standard hue wheel
 * - S (Saturation): NOT standard saturation! S=100 produces WHITE
 * - V (Value): Brightness component
 *
 * For vivid colors, keep S in the 40-70 range. The default sky is "set 56 54 68".
 */

/**
 * Parse a backgroundcolor variable value into HSV components
 * @param {string} value - Value in format "set H S V"
 * @returns {{ h: number, s: number, v: number }} HSV values (0-100)
 */
export function parseBackgroundColor(value) {
    const match = value.match(/^set\s+(\d+)\s+(\d+)\s+(\d+)$/);
    if (!match) {
        // Default sky color
        return { h: 56, s: 54, v: 68 };
    }
    return {
        h: parseInt(match[1], 10),
        s: parseInt(match[2], 10),
        v: parseInt(match[3], 10)
    };
}

/**
 * Format HSV values into a backgroundcolor variable value
 * @param {number} h - Hue (0-100)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value/Brightness (0-100)
 * @returns {string} Value in format "set H S V"
 */
export function formatBackgroundColor(h, s, v) {
    return `set ${Math.round(h)} ${Math.round(s)} ${Math.round(v)}`;
}

/**
 * Convert LEGO Island's custom HSV (0-100 scale) to RGB (0-255)
 * Replicates the exact algorithm from legoutils.cpp ConvertHSVToRGB()
 *
 * WARNING: S=100 always produces white due to the algorithm!
 *
 * @param {number} h - Hue (0-100)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value/Brightness (0-100)
 * @returns {{ r: number, g: number, b: number }} RGB values (0-255)
 */
export function hsvToRgb(h, s, v) {
    // Convert 0-100 scale to 0-1 (as the game does with * 0.01)
    const hNorm = h / 100;
    const sNorm = s / 100;
    const vNorm = v / 100;

    // LEGO Island's custom algorithm (from legoutils.cpp ConvertHSVToRGB)
    let max;
    if (sNorm > 0.5) {
        max = (1.0 - vNorm) * sNorm + vNorm;
    } else {
        max = (vNorm + 1.0) * sNorm;
    }

    if (max <= 0) {
        return { r: 0, g: 0, b: 0 };
    }

    const min = sNorm * 2.0 - max;
    const hueSegment = Math.floor(hNorm * 6);
    const hueFraction = hNorm * 6.0 - hueSegment;
    const delta = hueFraction * ((max - min) / max) * max;
    const ascending = min + delta;  // Channel value rising from min
    const descending = max - delta; // Channel value falling from max

    let r, g, b;
    switch (hueSegment) {
        case 0: // Red to Yellow
            r = max; g = ascending; b = min;
            break;
        case 1: // Yellow to Green
            r = descending; g = max; b = min;
            break;
        case 2: // Green to Cyan
            r = min; g = max; b = ascending;
            break;
        case 3: // Cyan to Blue
            r = min; g = descending; b = max;
            break;
        case 4: // Blue to Magenta
            r = ascending; g = min; b = max;
            break;
        case 5: // Magenta to Red
        case 6:
            r = max; g = min; b = descending;
            break;
        default:
            r = 0; g = 0; b = 0;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert HSV (0-100 scale) to hex color string
 * @param {number} h - Hue (0-100)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value/Brightness (0-100)
 * @returns {string} Hex color string (e.g., "#ffcc00")
 */
export function hsvToHex(h, s, v) {
    const { r, g, b } = hsvToRgb(h, s, v);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
