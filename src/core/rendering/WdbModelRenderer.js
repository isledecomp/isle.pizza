import { Transform, Mesh, Texture } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { Raycast } from 'ogl/src/extras/Raycast.js';
import { BaseRenderer } from './BaseRenderer.js';

/**
 * Renderer for LEGO Island WDB models with mutable canvas textures.
 * Extends BaseRenderer with model loading, canvas-based texture painting,
 * and UV raycasting for click interaction.
 */
export class WdbModelRenderer extends BaseRenderer {
    constructor(canvas) {
        super(canvas);
        this.texturedMesh = null;
        this.texture = null;
        this.textureCanvas = null;
        this.baseImageData = null;
        this.palette = null;
        this._raycast = new Raycast();

        this.camera.position.set(0, 0.2, 7);

        this.setupControls(new Vec3(0, 0.2, 0));
    }

    loadModel(roiData, textureData) {
        this.palette = textureData.palette;
        this.modelGroup = new Transform();

        if (!roiData.lods || roiData.lods.length === 0) {
            this.scene.addChild(this.modelGroup);
            return;
        }

        const lod = roiData.lods[0];

        this.textureCanvas = this.createTextureCanvas(textureData);
        this.texture = new Texture(this.gl, {
            image: this.textureCanvas,
            minFilter: this.gl.LINEAR,
            magFilter: this.gl.LINEAR,
            generateMipmaps: false,
            flipY: true,
        });

        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;

            const hasTexture = mesh.textureIndices && mesh.textureIndices.length > 0;

            if (hasTexture) {
                const program = this.createTexturedProgram(this.texture);
                this.texturedMesh = new Mesh(this.gl, { geometry, program });
                this.modelGroup.addChild(this.texturedMesh);
            } else {
                const color = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                const program = this.createColoredProgram([color.r / 255, color.g / 255, color.b / 255]);
                this.modelGroup.addChild(new Mesh(this.gl, { geometry, program }));
            }
        }

        this.scene.addChild(this.modelGroup);
        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    createTextureCanvas(textureData) {
        const canvas = document.createElement('canvas');
        canvas.width = textureData.width;
        canvas.height = textureData.height;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(textureData.width, textureData.height);
        for (let i = 0; i < textureData.pixels.length; i++) {
            const colorIdx = textureData.pixels[i];
            const color = textureData.palette[colorIdx] || { r: 0, g: 0, b: 0 };
            imageData.data[i * 4 + 0] = color.r;
            imageData.data[i * 4 + 1] = color.g;
            imageData.data[i * 4 + 2] = color.b;
            imageData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        this.baseImageData = ctx.getImageData(0, 0, textureData.width, textureData.height);
        return canvas;
    }

    dispose() {
        if (this.texture) {
            this.gl.deleteTexture(this.texture.texture);
            this.texture = null;
        }
        super.dispose();
    }

    raycastUV(event) {
        if (!this.texturedMesh) return null;

        const rect = this.canvas.getBoundingClientRect();
        const mouse = [
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -(((event.clientY - rect.top) / rect.height) * 2 - 1),
        ];

        this._raycast.castMouse(this.camera, mouse);
        const hits = this._raycast.intersectMeshes([this.texturedMesh], {
            cullFace: false,
            includeUV: true,
        });

        if (hits.length > 0 && hits[0].hit && hits[0].hit.uv) {
            const uv = hits[0].hit.uv;
            const x = uv[0] * this.textureCanvas.width;
            const y = (1 - uv[1]) * this.textureCanvas.height;
            return { uv, x, y };
        }
        return null;
    }

}
