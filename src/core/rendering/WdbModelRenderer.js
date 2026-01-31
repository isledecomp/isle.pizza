import * as THREE from 'three';

/**
 * Generic Three.js renderer for LEGO Island WDB models
 * Handles D3DRM packed vertex format and paletted textures
 */
export class WdbModelRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.animating = false;
        this.modelGroup = null;
        this.texturedMesh = null;
        this.texture = null;
        this.textureCanvas = null;
        this.baseImageData = null;
        this.palette = null;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0.2, 7);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.setupLighting();
    }

    /**
     * Setup scene lighting - override to customize
     */
    setupLighting() {
        // Flat, even lighting similar to in-game
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        // Soft front light
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.3);
        frontLight.position.set(0, 0, 5);
        this.scene.add(frontLight);
    }

    /**
     * Load model geometry and texture from parsed WDB data
     * @param {object} roiData - Parsed ROI data with lods
     * @param {object} textureData - Parsed texture with palette and pixels
     */
    loadModel(roiData, textureData) {
        this.palette = textureData.palette;
        this.modelGroup = new THREE.Group();

        const { texturedGeometry, nonTexturedGeometries } = this.createGeometries(roiData);

        this.textureCanvas = this.createTextureCanvas(textureData);
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        if (texturedGeometry) {
            const texturedMaterial = new THREE.MeshStandardMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.1
            });
            this.texturedMesh = new THREE.Mesh(texturedGeometry, texturedMaterial);
            this.modelGroup.add(this.texturedMesh);
        }

        for (const { geometry, color } of nonTexturedGeometries) {
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color.r / 255, color.g / 255, color.b / 255),
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.1
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.modelGroup.add(mesh);
        }

        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Create Three.js BufferGeometries from ROI LOD data
     *
     * D3DRM packed polygon index format (32-bit):
     * - Bits 0-15: vertex index (16 bits) into positions array, OR destination index when reusing
     * - Bits 16-30: normal index into normals array
     * - Bit 31: "create new vertex" flag - when set, create a new mesh vertex;
     *           when clear, bits 0-15 is the INDEX into the created mesh vertices array
     *
     * @param {object} roiData - ROI with lods array
     * @returns {{ texturedGeometry: THREE.BufferGeometry|null, nonTexturedGeometries: Array }}
     */
    createGeometries(roiData) {
        if (!roiData.lods || roiData.lods.length === 0) {
            console.warn('ROI has no LODs');
            return { texturedGeometry: null, nonTexturedGeometries: [] };
        }

        const lod = roiData.lods[0];
        let texturedGeometry = null;
        const nonTexturedGeometries = [];

        for (const mesh of lod.meshes) {
            const hasTexture = mesh.textureIndices && mesh.textureIndices.length > 0;

            // Flatten polygon indices
            const vertexIndicesPacked = [];
            for (const poly of mesh.polygonIndices) {
                vertexIndicesPacked.push(poly.a, poly.b, poly.c);
            }

            // Flatten texture indices if present
            const textureIndicesFlat = [];
            if (hasTexture) {
                for (const texPoly of mesh.textureIndices) {
                    textureIndicesFlat.push(texPoly.a, texPoly.b, texPoly.c);
                }
            }

            // Build mesh vertices following brickolini-island logic
            const meshVertices = [];
            const meshNormals = [];
            const meshUvs = [];
            const indices = [];

            for (let i = 0; i < vertexIndicesPacked.length; i++) {
                const packed = vertexIndicesPacked[i];

                if ((packed & 0x80000000) !== 0) {
                    // Create flag is set - create new mesh vertex
                    indices.push(meshVertices.length);

                    const gv = packed & 0xFFFF; // Vertex index (16 bits)
                    const v = lod.vertices[gv] || { x: 0, y: 0, z: 0 };
                    // Negate X for coordinate system conversion
                    meshVertices.push([-v.x, v.y, v.z]);

                    const gn = (packed >>> 16) & 0x7fff; // Normal index (15 bits)
                    const n = lod.normals[gn] || { x: 0, y: 1, z: 0 };
                    meshNormals.push([-n.x, n.y, n.z]);

                    if (hasTexture && lod.textureVertices.length > 0) {
                        const tex = textureIndicesFlat[i];
                        const uv = lod.textureVertices[tex] || { u: 0, v: 0 };
                        meshUvs.push([uv.u, 1 - uv.v]);
                    }
                } else {
                    // Create flag NOT set - reuse existing mesh vertex by index
                    indices.push(packed & 0xFFFF);
                }
            }

            // Reverse face winding (swap indices 0 and 2 of each triangle)
            for (let i = 0; i < indices.length; i += 3) {
                const temp = indices[i];
                indices[i] = indices[i + 2];
                indices[i + 2] = temp;
            }

            // Create geometry
            const geometry = new THREE.BufferGeometry();
            const vertices = meshVertices.flat();
            const normals = meshNormals.flat();

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setIndex(indices);

            if (hasTexture) {
                const uvs = meshUvs.flat();
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                texturedGeometry = geometry;
            } else {
                const color = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                nonTexturedGeometries.push({ geometry, color });
            }
        }

        return { texturedGeometry, nonTexturedGeometries };
    }

    /**
     * Create canvas texture from paletted LEGO texture data
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

    /**
     * Start animation loop
     */
    start() {
        this.animating = true;
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        this.animating = false;
    }

    /**
     * Animation loop - override to customize animation
     */
    animate = () => {
        if (!this.animating) return;
        requestAnimationFrame(this.animate);

        if (this.modelGroup) {
            this.modelGroup.rotation.y += 0.008;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Resize renderer to match canvas size
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.animating = false;

        if (this.modelGroup) {
            this.modelGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    child.material?.dispose();
                }
            });
            this.scene.remove(this.modelGroup);
        }

        this.texture?.dispose();
        this.renderer?.dispose();
    }
}
