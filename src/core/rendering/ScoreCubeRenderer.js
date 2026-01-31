import { WdbModelRenderer } from './WdbModelRenderer.js';

/**
 * Specialized renderer for the LEGO Island score cube
 * Extends WdbModelRenderer with score-specific functionality
 */
export class ScoreCubeRenderer extends WdbModelRenderer {
    // Score grid layout constants (from score.cpp)
    static AREA_Y_OFFSETS = [0x2b, 0x57, 0x80, 0xab, 0xd6]; // per actor row
    static AREA_HEIGHTS = [0x2a, 0x27, 0x29, 0x29, 0x2a];
    static AREA_X_OFFSETS = [0x2f, 0x56, 0x81, 0xaa, 0xd4]; // per activity column
    static AREA_WIDTHS = [0x25, 0x29, 0x27, 0x28, 0x28];
    static COLOR_INDICES = [0x11, 0x0f, 0x08, 0x05]; // grey, yellow, blue, red

    /**
     * Update score colors on texture
     * Score layout on cube (left to right, top to bottom):
     * - Activities (columns): carRace, jetskiRace, pizza, towTrack, ambulance (0-4)
     * - Actors (rows): pepper, mama, papa, nick, laura (0-4)
     * @param {Array<Array<number>>} scores - 2D array [actor][activity] with values 0-3
     */
    updateScores(scores) {
        if (!this.textureCanvas || !this.baseImageData || !this.palette) return;

        const ctx = this.textureCanvas.getContext('2d');
        ctx.putImageData(this.baseImageData, 0, 0);

        for (let actor = 0; actor < 5; actor++) {
            for (let activity = 0; activity < 5; activity++) {
                const score = scores?.[actor]?.[activity] ?? 0;
                const clampedScore = Math.max(0, Math.min(3, score));
                const colorIdx = ScoreCubeRenderer.COLOR_INDICES[clampedScore];
                const color = this.palette[colorIdx];

                if (color) {
                    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                    ctx.fillRect(
                        ScoreCubeRenderer.AREA_X_OFFSETS[activity],
                        ScoreCubeRenderer.AREA_Y_OFFSETS[actor],
                        ScoreCubeRenderer.AREA_WIDTHS[activity],
                        ScoreCubeRenderer.AREA_HEIGHTS[actor]
                    );
                }
            }
        }

        if (this.texture) {
            this.texture.needsUpdate = true;
        }
    }

    /**
     * Raycast to find clicked score cell
     * @param {MouseEvent} event - Click event
     * @returns {{ actor: number, activity: number } | null}
     */
    raycast(event) {
        const hit = this.raycastUV(event);
        if (!hit) return null;
        return this.uvToScoreCell(hit.x, hit.y);
    }

    /**
     * Convert texture pixel coordinates to score cell
     * @param {number} x - X coordinate (0-256)
     * @param {number} y - Y coordinate (0-256)
     * @returns {{ actor: number, activity: number } | null}
     */
    uvToScoreCell(x, y) {
        for (let activity = 0; activity < 5; activity++) {
            for (let actor = 0; actor < 5; actor++) {
                if (
                    x >= ScoreCubeRenderer.AREA_X_OFFSETS[activity] &&
                    x < ScoreCubeRenderer.AREA_X_OFFSETS[activity] + ScoreCubeRenderer.AREA_WIDTHS[activity] &&
                    y >= ScoreCubeRenderer.AREA_Y_OFFSETS[actor] &&
                    y < ScoreCubeRenderer.AREA_Y_OFFSETS[actor] + ScoreCubeRenderer.AREA_HEIGHTS[actor]
                ) {
                    return { actor, activity };
                }
            }
        }
        return null;
    }
}
