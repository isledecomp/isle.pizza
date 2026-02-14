import * as THREE from 'three';
import { PlantLodNames } from '../savegame/plantConstants.js';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

// Plant color → LEGO color mapping for fallback materials
const PLANT_COLOR_MAP = ['lego white', 'lego black', 'lego yellow', 'lego red', 'lego green'];

// Animation suffix per variant: flower→F, tree→T, bush→B, palm→P
const VARIANT_ANIM_SUFFIX = ['F', 'T', 'B', 'P'];

// Per-variant scale factors
const VARIANT_SCALE = [1.6, 1.8, 1.6, 2.0];

/**
 * Renderer for LEGO Island plants. Much simpler than ActorRenderer —
 * single model group, no multi-part assembly.
 */
export class PlantRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);

        this.camera.position.set(1.5, 1.2, 2.5);
        this.camera.lookAt(0, 0.2, 0);

        this.setupControls(new THREE.Vector3(0, 0.2, 0));
    }

    /**
     * Load a plant model.
     * @param {number} variant - Plant variant (0-3)
     * @param {number} color - Plant color (0-4)
     * @param {Map} partsMap - Name→part lookup from WDB
     * @param {Array} textures - Texture list from WDB
     */
    loadPlant(variant, color, partsMap, textures) {
        this.clearModel();

        const lodName = PlantLodNames[variant]?.[color];
        if (!lodName) return;

        const partData = partsMap.get(lodName.toLowerCase());
        if (!partData) return;

        this.loadTextures(textures);

        this.modelGroup = new THREE.Group();

        const lods = partData.lods || [];
        if (lods.length === 0) return;

        const colorName = PLANT_COLOR_MAP[color] || 'lego green';
        const colorEntry = LegoColors[colorName] || LegoColors['lego green'];
        const fallbackColor = new THREE.Color(colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255);

        const lod = lods[lods.length - 1]; // Highest quality
        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;
            this.modelGroup.add(new THREE.Mesh(geometry, this.createMeshMaterial(mesh, fallbackColor)));
        }

        this.centerAndScaleModel(VARIANT_SCALE[variant] ?? 2.0);
        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    queueClickAnimation(variant, move) {
        const suffix = VARIANT_ANIM_SUFFIX[variant];
        super.queueClickAnimation(`PlantAnim${suffix}${move}`);
    }
}
