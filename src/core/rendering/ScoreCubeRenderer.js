import * as THREE from 'three';

/**
 * Three.js renderer for the LEGO Island score cube
 */
export class ScoreCubeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.animating = false;
        this.cubeGroup = null; // Group containing textured and non-textured meshes
        this.texturedMesh = null; // The mesh with the score texture (for raycasting)
        this.texture = null;
        this.textureCanvas = null;
        this.baseImageData = null;
        this.palette = null;

        // Setup scene
        this.scene = new THREE.Scene();

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0, 7);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.5);
        directional.position.set(5, 5, 5);
        this.scene.add(directional);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, -3, -5);
        this.scene.add(backLight);
    }

    /**
     * Load model geometry and texture from parsed WDB data
     * @param {object} roiData - Parsed ROI data with lods
     * @param {object} textureData - Parsed texture with palette and pixels
     */
    loadModel(roiData, textureData) {
        this.palette = textureData.palette;

        // Create group to hold all meshes
        this.cubeGroup = new THREE.Group();

        // Create geometries from ROI data (separate textured and non-textured)
        const { texturedGeometry, nonTexturedGeometries } = this.createGeometries(roiData);

        // Create texture from parsed data
        this.textureCanvas = this.createTextureCanvas(textureData);
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        // Create textured mesh (the score grid face)
        if (texturedGeometry) {
            const texturedMaterial = new THREE.MeshStandardMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.1
            });
            this.texturedMesh = new THREE.Mesh(texturedGeometry, texturedMaterial);
            this.cubeGroup.add(this.texturedMesh);
        }

        // Create non-textured meshes (cube frame/edges) with their colors
        for (const { geometry, color } of nonTexturedGeometries) {
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color.r / 255, color.g / 255, color.b / 255),
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.1
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.cubeGroup.add(mesh);
        }

        this.scene.add(this.cubeGroup);

        // Initial render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Create Three.js BufferGeometries from ROI LOD data
     * Based on brickolini-island's wdb.ts implementation
     *
     * Packed polygon index format (32-bit):
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
                    // Negate X for coordinate system conversion (like brickolini)
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
                // Get color from mesh properties
                const color = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                nonTexturedGeometries.push({ geometry, color });
            }
        }

        return { texturedGeometry, nonTexturedGeometries };
    }

    /**
     * Create canvas texture from parsed texture data
     * @param {object} textureData - { width, height, palette, pixels }
     * @returns {HTMLCanvasElement}
     */
    createTextureCanvas(textureData) {
        const canvas = document.createElement('canvas');
        canvas.width = textureData.width;
        canvas.height = textureData.height;
        const ctx = canvas.getContext('2d');

        // Convert indexed color to RGBA
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

        // Store base image for score updates
        this.baseImageData = ctx.getImageData(0, 0, textureData.width, textureData.height);

        return canvas;
    }

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

        // Restore base texture first
        ctx.putImageData(this.baseImageData, 0, 0);

        // Score pixel layout from score.cpp
        const areaYOffsets = [0x2b, 0x57, 0x80, 0xab, 0xd6]; // per actor row
        const areaHeights = [0x2a, 0x27, 0x29, 0x29, 0x2a];
        const areaXOffsets = [0x2f, 0x56, 0x81, 0xaa, 0xd4]; // per activity column
        const areaWidths = [0x25, 0x29, 0x27, 0x28, 0x28];

        // Palette indices for score colors
        const colorIndices = [0x11, 0x0f, 0x08, 0x05]; // grey, yellow, blue, red

        for (let actor = 0; actor < 5; actor++) {
            for (let activity = 0; activity < 5; activity++) {
                const score = scores?.[actor]?.[activity] ?? 0;
                const clampedScore = Math.max(0, Math.min(3, score));
                const colorIdx = colorIndices[clampedScore];
                const color = this.palette[colorIdx];

                if (color) {
                    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                    ctx.fillRect(
                        areaXOffsets[activity],
                        areaYOffsets[actor],
                        areaWidths[activity],
                        areaHeights[actor]
                    );
                }
            }
        }

        if (this.texture) {
            this.texture.needsUpdate = true;
        }
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
     * Animation loop
     */
    animate = () => {
        if (!this.animating) return;
        requestAnimationFrame(this.animate);

        // Rotate cube group
        if (this.cubeGroup) {
            this.cubeGroup.rotation.y += 0.008;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Raycast to find clicked score cell
     * @param {MouseEvent} event - Click event
     * @returns {{ actor: number, activity: number } | null}
     */
    raycast(event) {
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
            // Convert UV to pixel coordinates (texture is 256x256)
            // UV was flipped in geometry (1-v), so flip back for image coords
            const x = uv.x * 256;
            const y = (1 - uv.y) * 256;
            return this.uvToScoreCell(x, y);
        }

        return null;
    }

    /**
     * Convert texture pixel coordinates to score cell
     * @param {number} x - X coordinate (0-256)
     * @param {number} y - Y coordinate (0-256)
     * @returns {{ actor: number, activity: number } | null}
     */
    uvToScoreCell(x, y) {
        const areaXOffsets = [0x2f, 0x56, 0x81, 0xaa, 0xd4];
        const areaYOffsets = [0x2b, 0x57, 0x80, 0xab, 0xd6];
        const areaWidths = [0x25, 0x29, 0x27, 0x28, 0x28];
        const areaHeights = [0x2a, 0x27, 0x29, 0x29, 0x2a];

        for (let activity = 0; activity < 5; activity++) {
            for (let actor = 0; actor < 5; actor++) {
                if (
                    x >= areaXOffsets[activity] &&
                    x < areaXOffsets[activity] + areaWidths[activity] &&
                    y >= areaYOffsets[actor] &&
                    y < areaYOffsets[actor] + areaHeights[actor]
                ) {
                    return { actor, activity };
                }
            }
        }

        return null;
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

        if (this.cubeGroup) {
            this.cubeGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    child.material?.dispose();
                }
            });
            this.scene.remove(this.cubeGroup);
        }

        this.texture?.dispose();
        this.renderer?.dispose();
    }
}
