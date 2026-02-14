import * as THREE from 'three';
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

        this.camera.position.set(0, 0.2, 7);

        this.setupControls(new THREE.Vector3(0, 0.2, 0));
    }

    /**
     * Load model geometry and texture from parsed WDB data
     * @param {object} roiData - Parsed ROI data with lods
     * @param {object} textureData - Parsed texture with palette and pixels
     */
    loadModel(roiData, textureData) {
        this.palette = textureData.palette;
        this.modelGroup = new THREE.Group();

        if (!roiData.lods || roiData.lods.length === 0) {
            this.scene.add(this.modelGroup);
            return;
        }

        const lod = roiData.lods[0];

        this.textureCanvas = this.createTextureCanvas(textureData);
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;

            const hasTexture = mesh.textureIndices && mesh.textureIndices.length > 0;

            if (hasTexture) {
                const material = new THREE.MeshLambertMaterial({
                    map: this.texture,
                    side: THREE.DoubleSide
                });
                this.texturedMesh = new THREE.Mesh(geometry, material);
                this.modelGroup.add(this.texturedMesh);
            } else {
                const color = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                const material = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(color.r / 255, color.g / 255, color.b / 255),
                    side: THREE.DoubleSide
                });
                this.modelGroup.add(new THREE.Mesh(geometry, material));
            }
        }

        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Create canvas texture from paletted LEGO texture data.
     * Unlike BaseRenderer.createTexture(), this keeps a reference to the
     * canvas and base image data so subclasses can paint over it (e.g. scores).
     * @param {object} textureData - { width, height, palette, pixels }
     * @returns {HTMLCanvasElement}
     */
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

    /**
     * Raycast and return UV coordinates of hit on textured mesh
     * @param {MouseEvent} event - Mouse event
     * @returns {{ uv: THREE.Vector2, x: number, y: number } | null}
     */
    raycastUV(event) {
        if (!this.texturedMesh) return null;

        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObject(this.texturedMesh);

        if (intersects.length > 0 && intersects[0].uv) {
            const uv = intersects[0].uv;
            const x = uv.x * this.textureCanvas.width;
            const y = (1 - uv.y) * this.textureCanvas.height;
            return { uv, x, y };
        }
        return null;
    }

    dispose() {
        this.texture?.dispose();
        super.dispose();
    }
}
