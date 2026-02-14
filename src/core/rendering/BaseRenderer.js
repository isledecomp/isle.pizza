import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Base renderer providing shared Three.js setup, lighting, texture creation,
 * geometry building, and animation loop for LEGO model viewers.
 */
export class BaseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.animating = false;
        this.modelGroup = null;
        this.textures = new Map();

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.setupLighting();

        this.controls = null;
        this._didDrag = false;
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
        sunLight.position.set(1, 2, 3);
        this.scene.add(sunLight);
    }

    setupControls(target) {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 4.0;
        this.controls.target.copy(target);

        this.controls.addEventListener('start', () => {
            this.controls.autoRotate = false;
        });

        this._onPointerDown = (e) => {
            this._didDrag = false;
            this._pointerStart = { x: e.clientX, y: e.clientY };
        };
        this._onPointerMove = (e) => {
            if (!this._pointerStart) return;
            const dx = e.clientX - this._pointerStart.x;
            const dy = e.clientY - this._pointerStart.y;
            if (dx * dx + dy * dy > 9) this._didDrag = true;
        };

        this.canvas.addEventListener('pointerdown', this._onPointerDown);
        this.canvas.addEventListener('pointermove', this._onPointerMove);

        this._initialAutoRotate = this.controls.autoRotate;
        this.controls.saveState();
    }

    resetView() {
        if (!this.controls) return;
        this.controls.reset();
        this.controls.autoRotate = this._initialAutoRotate;
    }

    wasDragged() {
        return this._didDrag;
    }

    /**
     * Create a Three.js texture from parsed texture data
     */
    createTexture(textureData) {
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

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Build the texture lookup map from an array of texture data objects.
     * @param {Array} textures - Texture data with name, width, height, palette, pixels
     * @param {boolean} overwrite - If false, skip textures already in the map
     */
    loadTextures(textures, overwrite = true) {
        if (!textures) return;
        for (const tex of textures) {
            if (!tex.name) continue;
            const key = tex.name.toLowerCase();
            if (overwrite || !this.textures.has(key)) {
                this.textures.set(key, this.createTexture(tex));
            }
        }
    }

    /**
     * Create a material for a mesh using its texture or color properties.
     * @param {object} mesh - Mesh with properties (textureName, color)
     * @param {THREE.Color} [fallbackColor] - Color when mesh has no texture or color
     */
    createMeshMaterial(mesh, fallbackColor = null) {
        const meshTexName = mesh.properties?.textureName?.toLowerCase();
        if (meshTexName && this.textures.has(meshTexName)) {
            return new THREE.MeshLambertMaterial({
                map: this.textures.get(meshTexName),
                side: THREE.DoubleSide,
                color: 0xffffff
            });
        }

        const meshColor = mesh.properties?.color;
        const color = meshColor
            ? new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255)
            : (fallbackColor || new THREE.Color(0.5, 0.5, 0.5));

        return new THREE.MeshLambertMaterial({
            color,
            side: THREE.DoubleSide
        });
    }

    /**
     * Create a single geometry from mesh data
     */
    createGeometry(mesh, lod) {
        if (!mesh.polygonIndices || mesh.polygonIndices.length === 0) {
            return null;
        }

        const hasTexture = mesh.textureIndices && mesh.textureIndices.length > 0;

        const vertexIndicesPacked = [];
        for (const poly of mesh.polygonIndices) {
            vertexIndicesPacked.push(poly.a, poly.b, poly.c);
        }

        const textureIndicesFlat = [];
        if (hasTexture) {
            for (const texPoly of mesh.textureIndices) {
                textureIndicesFlat.push(texPoly.a, texPoly.b, texPoly.c);
            }
        }

        const meshVertices = [];
        const meshNormals = [];
        const meshUvs = [];
        const indices = [];

        for (let i = 0; i < vertexIndicesPacked.length; i++) {
            const packed = vertexIndicesPacked[i];

            if ((packed & 0x80000000) !== 0) {
                indices.push(meshVertices.length);

                const gv = packed & 0xFFFF;
                const v = lod.vertices[gv] || { x: 0, y: 0, z: 0 };
                meshVertices.push([-v.x, v.y, v.z]);

                const gn = (packed >>> 16) & 0x7fff;
                const n = lod.normals[gn] || { x: 0, y: 1, z: 0 };
                meshNormals.push([-n.x, n.y, n.z]);

                if (hasTexture && lod.textureVertices && lod.textureVertices.length > 0) {
                    const tex = textureIndicesFlat[i];
                    const uv = lod.textureVertices[tex] || { u: 0, v: 0 };
                    meshUvs.push([uv.u, 1 - uv.v]);
                }
            } else {
                indices.push(packed & 0xFFFF);
            }
        }

        // Reverse face winding
        for (let i = 0; i < indices.length; i += 3) {
            const temp = indices[i];
            indices[i] = indices[i + 2];
            indices[i + 2] = temp;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshVertices.flat(), 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshNormals.flat(), 3));
        geometry.setIndex(indices);

        if (hasTexture && meshUvs.length > 0) {
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(meshUvs.flat(), 2));
        }

        return geometry;
    }

    centerAndScaleModel(scaleFactor) {
        if (!this.modelGroup) return;

        const box = new THREE.Box3().setFromObject(this.modelGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = scaleFactor / maxDim;
            this.modelGroup.scale.setScalar(scale);
            // Position must account for scale: Three.js applies scale before
            // translation, so vertex v maps to (position + scale * v).
            // To center: position = -center * scale → v maps to scale*(v - center).
            this.modelGroup.position.copy(center).multiplyScalar(-scale);
        } else {
            this.modelGroup.position.sub(center);
        }
    }

    clearModel() {
        if (this.modelGroup) {
            this.modelGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    child.material?.dispose();
                }
            });
            this.scene.remove(this.modelGroup);
            this.modelGroup = null;
        }

        for (const texture of this.textures.values()) {
            texture.dispose();
        }
        this.textures.clear();
    }

    start() {
        this.animating = true;
        this.animate();
    }

    stop() {
        this.animating = false;
    }

    animate = () => {
        if (!this.animating) return;
        requestAnimationFrame(this.animate);

        this.updateAnimation();

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Override in subclasses for custom animation logic.
     * Called each frame before rendering.
     */
    updateAnimation() {
        this.controls?.update();
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    dispose() {
        this.animating = false;
        if (this.controls) {
            this.controls.dispose();
            this.canvas.removeEventListener('pointerdown', this._onPointerDown);
            this.canvas.removeEventListener('pointermove', this._onPointerMove);
        }
        this.clearModel();
        this.renderer?.dispose();
    }
}
