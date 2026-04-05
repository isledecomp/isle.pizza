import { Transform, Mesh } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { PlantLodNames } from '../savegame/plantConstants.js';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

const PLANT_COLOR_MAP = ['lego white', 'lego black', 'lego yellow', 'lego red', 'lego green'];
const VARIANT_ANIM_SUFFIX = ['F', 'T', 'B', 'P'];
const VARIANT_SCALE = [1.6, 1.8, 1.6, 2.0];

/**
 * Renderer for LEGO Island plants.
 */
export class PlantRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);

        this.camera.position.set(1.5, 1.2, 2.5);
        this.camera.lookAt([0, 0.2, 0]);

        this.setupControls(new Vec3(0, 0.2, 0));
    }

    loadPlant(variant, color, partsMap, textures) {
        this.clearModel();

        const lodName = PlantLodNames[variant]?.[color];
        if (!lodName) return;

        const partData = partsMap.get(lodName.toLowerCase());
        if (!partData) return;

        this.loadTextures(textures);

        this.modelGroup = new Transform();

        const lods = partData.lods || [];
        if (lods.length === 0) return;

        const colorName = PLANT_COLOR_MAP[color] || 'lego green';
        const colorEntry = LegoColors[colorName] || LegoColors['lego green'];
        const fallbackColor = [colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255];

        const lod = lods[lods.length - 1];
        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;
            const program = this.createMeshProgram(mesh, fallbackColor);
            this.modelGroup.addChild(new Mesh(this.gl, { geometry, program }));
        }

        this.centerAndScaleModel(VARIANT_SCALE[variant] ?? 2.0);
        this.scene.addChild(this.modelGroup);
        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    queueClickAnimation(variant, move) {
        const suffix = VARIANT_ANIM_SUFFIX[variant];
        super.queueClickAnimation(`PlantAnim${suffix}${move}`);
    }
}
