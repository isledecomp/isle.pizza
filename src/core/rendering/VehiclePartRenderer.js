import { Transform, Mesh } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { LegoColors } from '../savegame/constants.js';
import { resolveLods } from '../formats/WdbParser.js';
import { BaseRenderer } from './BaseRenderer.js';

/**
 * Specialized renderer for LEGO vehicle parts.
 * Renders ROI with proper textures - only colors meshes with INH prefix.
 */
export class VehiclePartRenderer extends BaseRenderer {
    constructor(canvas) {
        super(canvas);
        this.colorableMeshes = [];

        this.camera.position.set(0, 0, 3);
        this.camera.lookAt([0, 0, 0]);

        this.setupControls(new Vec3(0, 0, 0));
    }

    hasInhPrefix(mesh) {
        const texName = mesh.properties?.textureName?.toLowerCase() || '';
        const matName = mesh.properties?.materialName?.toLowerCase() || '';
        return texName.startsWith('inh') || matName.startsWith('inh');
    }

    loadPartWithColor(roiData, colorName, textureList = [], partsMap = new Map()) {
        this.clearModel();

        this.modelGroup = new Transform();
        this.colorableMeshes = [];
        this.partsMap = partsMap;

        this.loadTextures(textureList);

        const legoColor = LegoColors[colorName] || LegoColors['lego red'];
        const legoColorArr = [legoColor.r / 255, legoColor.g / 255, legoColor.b / 255];

        this.createMeshesFromROI(roiData, legoColorArr);

        this.centerAndScaleModel(1.5);

        this.scene.addChild(this.modelGroup);
        this.controls.autoRotate = true;
        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    createMeshesFromROI(roiData, legoColor) {
        const lods = resolveLods(roiData, this.partsMap);

        if (lods.length > 0) {
            const lod = lods[lods.length - 1];

            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;

                const isColorable = this.hasInhPrefix(mesh);
                const hasUVs = mesh.textureIndices && mesh.textureIndices.length > 0;
                const meshTextureName = mesh.properties?.textureName?.toLowerCase();

                const meshAlpha = mesh.properties?.alpha || 0;
                const isTransparent = meshAlpha > 0;
                const opacity = isTransparent ? meshAlpha : 1;

                const transparencyOpts = {
                    transparent: isTransparent,
                    depthWrite: !isTransparent,
                };

                let program;

                if (isColorable) {
                    program = this.createColoredProgram([...legoColor], opacity, transparencyOpts);
                    this.colorableMeshes.push(null);
                } else if (hasUVs && meshTextureName && this.textures.has(meshTextureName)) {
                    program = this.createTexturedProgram(this.textures.get(meshTextureName), opacity, transparencyOpts);
                } else {
                    const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                    program = this.createColoredProgram([meshColor.r / 255, meshColor.g / 255, meshColor.b / 255], opacity, transparencyOpts);
                }

                const oglMesh = new Mesh(this.gl, { geometry, program });
                if (meshTextureName) {
                    oglMesh._textureName = meshTextureName;
                }
                this.modelGroup.addChild(oglMesh);

                if (isColorable) {
                    this.colorableMeshes[this.colorableMeshes.length - 1] = oglMesh;
                }
            }
        }

        for (const child of roiData.children || []) {
            this.createMeshesFromROI(child, legoColor);
        }
    }

    updateTexture(textureName, textureData) {
        if (!this.modelGroup) return;

        const targetName = textureName.toLowerCase();
        const newTexture = this.createTexture(textureData);

        // Clean up old texture if it exists
        const oldTexture = this.textures.get(targetName);
        if (oldTexture) {
            this.gl.deleteTexture(oldTexture.texture);
        }
        this.textures.set(targetName, newTexture);

        this.modelGroup.traverse((child) => {
            if (!(child instanceof Mesh)) return;
            if (child._textureName !== targetName) return;

            child.program.uniforms.tMap.value = newTexture;
            child.program.uniforms.uUseTexture.value = 1;
            child.program.uniforms.uColor.value = [1, 1, 1];
        });

        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    updateColor(colorName) {
        if (!this.modelGroup || this.colorableMeshes.length === 0) return;

        const legoColor = LegoColors[colorName] || LegoColors['lego red'];
        const colorArr = [legoColor.r / 255, legoColor.g / 255, legoColor.b / 255];

        for (const mesh of this.colorableMeshes) {
            if (mesh && mesh.program) {
                mesh.program.uniforms.uColor.value = colorArr;
            }
        }

        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    clearModel() {
        super.clearModel();
        this.colorableMeshes = [];
    }
}
