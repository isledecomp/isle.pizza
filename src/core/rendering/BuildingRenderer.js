import { Transform, Mesh } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

/**
 * Renderer for LEGO Island buildings. Buildings are WDB models with
 * hierarchical ROIs (potentially multi-part like policsta, jail).
 */
export class BuildingRenderer extends AnimatedRenderer {
    constructor(canvas, rendererOptions) {
        super(canvas, rendererOptions);

        this.camera.position.set(2.5, 2.0, 4.0);
        this.camera.lookAt([0, -0.3, 0]);

        this.setupControls(new Vec3(0, -0.3, 0));
    }

    loadBuilding(rois, textures) {
        this.clearModel();

        if (!rois || rois.length === 0) return;

        this.loadTextures(textures);

        this.modelGroup = new Transform();

        const colorEntry = LegoColors['lego white'] || { r: 255, g: 255, b: 255 };
        const fallbackColor = [colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255];

        for (const roi of rois) {
            const lods = roi.lods || [];
            if (lods.length === 0) continue;

            const lod = lods[lods.length - 1];
            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;
                const program = this.createMeshProgram(mesh, fallbackColor);
                this.modelGroup.addChild(new Mesh(this.gl, { geometry, program }));
            }
        }

        this.centerAndScaleModel(2.5);
        this.scene.addChild(this.modelGroup);
        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    queueClickAnimation(buildingIndex, move) {
        super.queueClickAnimation(`BuildingAnim${buildingIndex}_${move}`);
    }
}
