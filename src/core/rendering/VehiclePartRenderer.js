import * as THREE from 'three';
import { LegoColors } from '../savegame/constants.js';
import { resolveLods } from '../formats/WdbParser.js';
import { BaseRenderer } from './BaseRenderer.js';

/**
 * Specialized renderer for LEGO vehicle parts
 * Renders ROI with proper textures - only colors meshes with INH prefix in textureName/materialName
 */
export class VehiclePartRenderer extends BaseRenderer {
    constructor(canvas) {
        super(canvas);
        this.colorableMeshes = []; // Meshes with INH prefix

        this.camera.position.set(0, 0, 3);
        this.camera.lookAt(0, 0, 0);

        this.setupControls(new THREE.Vector3(0, 0, 0));
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

        this.loadTextures(textureList);

        const legoColor = LegoColors[colorName] || LegoColors['lego red'];
        const threeLegoColor = new THREE.Color(legoColor.r / 255, legoColor.g / 255, legoColor.b / 255);

        this.createMeshesFromROI(roiData, threeLegoColor);

        this.centerAndScaleModel(1.5);

        this.scene.add(this.modelGroup);
        this.controls.autoRotate = true;
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
                    material = new THREE.MeshLambertMaterial({
                        color: legoColor,
                        side: THREE.DoubleSide,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                    this.colorableMeshes.push(null); // Placeholder, will set after mesh creation
                } else if (hasUVs && meshTextureName && this.textures.has(meshTextureName)) {
                    // Mesh has its own texture
                    material = new THREE.MeshLambertMaterial({
                        map: this.textures.get(meshTextureName),
                        side: THREE.DoubleSide,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                } else {
                    // Fallback to mesh's vertex color
                    const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                    material = new THREE.MeshLambertMaterial({
                        color: new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255),
                        side: THREE.DoubleSide,
                        transparent: isTransparent,
                        opacity: opacity,
                        depthWrite: !isTransparent
                    });
                }

                const threeMesh = new THREE.Mesh(geometry, material);
                if (meshTextureName) {
                    threeMesh.userData.textureName = meshTextureName;
                }
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
     * Update texture on meshes matching a given texture name
     * @param {string} textureName - Texture name to match (case-insensitive)
     * @param {{ width: number, height: number, palette: Array<{r,g,b}>, pixels: Uint8Array }} textureData
     */
    updateTexture(textureName, textureData) {
        if (!this.modelGroup) return;

        const newTexture = this.createTexture(textureData);
        const targetName = textureName.toLowerCase();

        this.modelGroup.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            if (child.userData.textureName !== targetName) return;

            const oldMap = child.material.map;
            child.material.map = newTexture;
            // Set color to white so texture isn't tinted by the fallback color
            child.material.color.setRGB(1, 1, 1);
            child.material.needsUpdate = true;
            if (oldMap && oldMap !== newTexture) oldMap.dispose();
        });

        this.renderer.render(this.scene, this.camera);
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

    clearModel() {
        super.clearModel();
        this.colorableMeshes = [];
    }
}
