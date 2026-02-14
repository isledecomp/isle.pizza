import * as THREE from 'three';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

/**
 * Renderer for LEGO Island buildings. Buildings are WDB models with
 * hierarchical ROIs (potentially multi-part like policsta, jail).
 */
export class BuildingRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);

        this.camera.position.set(2.5, 2.0, 4.0);
        this.camera.lookAt(0, -0.3, 0);

        this.setupControls(new THREE.Vector3(0, -0.3, 0));
    }

    /**
     * Load a building model from pre-collected ROIs.
     * @param {Array} rois - Array of { name, lods } from WDB model
     * @param {Array} textures - Texture list from the model + globals
     */
    loadBuilding(rois, textures) {
        this.clearModel();

        if (!rois || rois.length === 0) return;

        this.loadTextures(textures);

        this.modelGroup = new THREE.Group();

        const colorEntry = LegoColors['lego white'] || { r: 255, g: 255, b: 255 };
        const fallbackColor = new THREE.Color(colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255);

        for (const roi of rois) {
            const lods = roi.lods || [];
            if (lods.length === 0) continue;

            const lod = lods[lods.length - 1]; // Highest quality
            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;
                this.modelGroup.add(new THREE.Mesh(geometry, this.createMeshMaterial(mesh, fallbackColor)));
            }
        }

        this.centerAndScaleModel(2.5);
        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    queueClickAnimation(buildingIndex, move) {
        super.queueClickAnimation(`BuildingAnim${buildingIndex}_${move}`);
    }
}
