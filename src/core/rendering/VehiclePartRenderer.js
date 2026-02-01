import * as THREE from 'three';
import { LegoColors } from '../savegame/constants.js';
import { resolveLods } from '../formats/WdbParser.js';

/**
 * Specialized renderer for LEGO vehicle parts
 * Renders ROI with proper textures - only colors meshes with INH prefix in textureName/materialName
 */
export class VehiclePartRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.animating = false;
        this.modelGroup = null;
        this.colorableMeshes = []; // Meshes with INH prefix
        this.textures = new Map(); // Cache for loaded textures

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0, 3);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.setupLighting();
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(2, 2, 3);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-2, 1, 2);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 1, -3);
        this.scene.add(rimLight);
    }

    /**
     * Check if a mesh has INH prefix in textureName or materialName
     * This indicates the mesh should inherit color from the ROI
     */
    hasInhPrefix(mesh) {
        const texName = mesh.properties?.textureName?.toLowerCase() || '';
        const matName = mesh.properties?.materialName?.toLowerCase() || '';
        return texName.startsWith('inh') || matName.startsWith('inh');
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
        return texture;
    }

    /**
     * Load part geometry with proper textures and colorable mesh detection
     * @param {object} roiData - Parsed ROI data with lods
     * @param {string} colorName - LEGO color name for colorable parts
     * @param {object[]} textureList - Array of texture data from model
     * @param {Map} partsMap - Map of part name -> part data for shared LOD resolution
     */
    loadPartWithColor(roiData, colorName, textureList = [], partsMap = new Map()) {
        this.clearModel();

        this.modelGroup = new THREE.Group();
        this.colorableMeshes = [];
        this.partsMap = partsMap;

        // Build texture lookup map (case-insensitive)
        this.textures.clear();
        for (const tex of textureList) {
            if (tex.name) {
                this.textures.set(tex.name.toLowerCase(), this.createTexture(tex));
            }
        }

        const legoColor = LegoColors[colorName] || LegoColors['lego red'];
        const threeLegoColor = new THREE.Color(legoColor.r / 255, legoColor.g / 255, legoColor.b / 255);

        this.createMeshesFromROI(roiData, threeLegoColor);

        this.centerAndScaleModel();

        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Recursively create meshes from ROI and its children
     */
    createMeshesFromROI(roiData, legoColor) {
        const lods = resolveLods(roiData, this.partsMap);

        if (lods.length > 0) {
            // Use highest quality LOD (last in array has most vertices)
            const lod = lods[lods.length - 1];

            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;

                const isColorable = this.hasInhPrefix(mesh);
                const hasUVs = mesh.textureIndices && mesh.textureIndices.length > 0;
                const meshTextureName = mesh.properties?.textureName?.toLowerCase();

                let material;

                // Get alpha from mesh properties
                // In the original game: alpha = 0 means opaque, alpha > 0 means transparent
                const meshAlpha = mesh.properties?.alpha || 0;
                const isTransparent = meshAlpha > 0;
                const opacity = isTransparent ? meshAlpha : 1;

                if (isColorable) {
                    // Mesh has INH prefix - use the LEGO color
                    material = new THREE.MeshStandardMaterial({
                        color: legoColor,
                        side: THREE.DoubleSide,
                        roughness: 0.7,
                        metalness: 0.1,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                    this.colorableMeshes.push(null); // Placeholder, will set after mesh creation
                } else if (hasUVs && meshTextureName && this.textures.has(meshTextureName)) {
                    // Mesh has its own texture
                    material = new THREE.MeshStandardMaterial({
                        map: this.textures.get(meshTextureName),
                        side: THREE.DoubleSide,
                        roughness: 0.8,
                        metalness: 0.1,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                } else {
                    // Fallback to mesh's vertex color
                    const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                    material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255),
                        side: THREE.DoubleSide,
                        roughness: 0.8,
                        metalness: 0.1,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                }

                const threeMesh = new THREE.Mesh(geometry, material);
                this.modelGroup.add(threeMesh);

                // Track colorable meshes
                if (isColorable) {
                    this.colorableMeshes[this.colorableMeshes.length - 1] = threeMesh;
                }
            }
        }

        // Process children recursively
        for (const child of roiData.children || []) {
            this.createMeshesFromROI(child, legoColor);
        }
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

    /**
     * Update color of colorable meshes without reloading geometry
     */
    updateColor(colorName) {
        if (!this.modelGroup || this.colorableMeshes.length === 0) return;

        const legoColor = LegoColors[colorName] || LegoColors['lego red'];
        const threeColor = new THREE.Color(legoColor.r / 255, legoColor.g / 255, legoColor.b / 255);

        for (const mesh of this.colorableMeshes) {
            if (mesh && mesh.material) {
                mesh.material.color = threeColor;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    centerAndScaleModel() {
        if (!this.modelGroup) return;

        const box = new THREE.Box3().setFromObject(this.modelGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        this.modelGroup.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = 1.5 / maxDim;
            this.modelGroup.scale.setScalar(scale);
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
        this.colorableMeshes = [];

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

        if (this.modelGroup) {
            this.modelGroup.rotation.y += 0.01;
        }

        this.renderer.render(this.scene, this.camera);
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    dispose() {
        this.animating = false;
        this.clearModel();
        this.renderer?.dispose();
    }
}
