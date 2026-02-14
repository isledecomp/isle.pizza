import * as THREE from 'three';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

/**
 * Renderer for LEGO Island buildings. Buildings are WDB models with
 * hierarchical ROIs (potentially multi-part like policsta, jail).
 */
export class BuildingRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);
        this._queuedClickAnim = null;

        this.camera.position.set(2.5, 2.0, 4.0);
        this.camera.lookAt(0, -0.3, 0);

        this.setupControls(new THREE.Vector3(0, -0.3, 0));
    }

    /**
     * Load a building model from pre-collected ROIs.
     * @param {Array} rois - Array of { name, lods } from WDB model
     * @param {Array} textures - Texture list from the model + globals
     */
    loadBuilding(rois, textures) {
        this.clearModel();

        if (!rois || rois.length === 0) return;

        // Build texture lookup
        if (textures) {
            for (const tex of textures) {
                if (tex.name) {
                    this.textures.set(tex.name.toLowerCase(), this.createTexture(tex));
                }
            }
        }

        this.modelGroup = new THREE.Group();

        for (const roi of rois) {
            const lods = roi.lods || [];
            if (lods.length === 0) continue;

            const lod = lods[lods.length - 1]; // Highest quality
            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;

                let material;
                const meshTexName = mesh.properties?.textureName?.toLowerCase();
                if (meshTexName && this.textures.has(meshTexName)) {
                    material = new THREE.MeshLambertMaterial({
                        map: this.textures.get(meshTexName),
                        side: THREE.DoubleSide,
                        color: 0xffffff
                    });
                } else {
                    const meshColor = mesh.properties?.color;
                    if (meshColor) {
                        material = new THREE.MeshLambertMaterial({
                            color: new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255),
                            side: THREE.DoubleSide
                        });
                    } else {
                        const colorEntry = LegoColors['lego white'] || { r: 255, g: 255, b: 255 };
                        material = new THREE.MeshLambertMaterial({
                            color: new THREE.Color(colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255),
                            side: THREE.DoubleSide
                        });
                    }
                }

                this.modelGroup.add(new THREE.Mesh(geometry, material));
            }
        }

        this.centerAndScaleModel(2.5);
        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Check if the building mesh was clicked.
     * @returns {boolean} True if any mesh was hit
     */
    getClickedMesh(mouseEvent) {
        if (!this.modelGroup) return false;

        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1,
            -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        const meshes = [];
        this.modelGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) meshes.push(child);
        });

        return this.raycaster.intersectObjects(meshes).length > 0;
    }

    // ─── Animation System ────────────────────────────────────────────

    /**
     * Queue a click animation to play.
     * @param {number} buildingIndex - Building index (9-14)
     * @param {number} move - The building's move value
     */
    queueClickAnimation(buildingIndex, move) {
        this._queuedClickAnim = { buildingIndex, move };
    }

    /**
     * Play a queued click animation if available.
     */
    async playQueuedAnimation() {
        if (!this._queuedClickAnim || !this.modelGroup) return;

        const { buildingIndex, move } = this._queuedClickAnim;
        this._queuedClickAnim = null;

        const animName = `BuildingAnim${buildingIndex}_${move}`;

        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) return;

            const tracks = this.buildBuildingTracks(animData);
            if (tracks.length === 0) return;

            this.stopAnimation();

            const clip = new THREE.AnimationClip('buildingClick', -1, tracks);
            this.mixer = new THREE.AnimationMixer(this.modelGroup);
            const action = this.mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = false;
            this.currentAction = action;
            action.play();

            this.mixer.addEventListener('finished', () => {
                this.stopAnimation();
                this.controls.autoRotate = true;
            });
        } catch (e) {
            // Animation unavailable — ignore
        }
    }

    /**
     * Build animation tracks for a building. Same approach as PlantRenderer.
     */
    buildBuildingTracks(animData) {
        const duration = animData.duration;
        const timesSet = new Set([0]);
        this.collectKeyframeTimes(animData.rootNode, timesSet);
        const times = [...timesSet].filter(t => t <= duration).sort((a, b) => a - b);

        const buildingNode = this.findAnimatedNode(animData.rootNode);
        if (!buildingNode) return [];

        const quatValues = [];
        const timesSec = [];

        for (const time of times) {
            const mat = this.evaluateNodeChain(animData.rootNode, buildingNode, time);
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            mat.decompose(position, quaternion, scale);

            timesSec.push(time / 1000);
            quatValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }

        return [
            new THREE.QuaternionKeyframeTrack('.quaternion', timesSec, quatValues)
        ];
    }

    findAnimatedNode(node) {
        for (const child of node.children) {
            const found = this.findAnimatedNode(child);
            if (found) return found;
        }
        const d = node.data;
        if (d.translationKeys.length > 0 || d.rotationKeys.length > 0 || d.scaleKeys.length > 0) {
            return node;
        }
        return null;
    }

    evaluateNodeChain(node, targetNode, time) {
        const path = [];
        if (!this.findPath(node, targetNode, path)) {
            return new THREE.Matrix4();
        }

        let mat = new THREE.Matrix4();
        for (const n of path) {
            const local = this.evaluateLocalTransform(n.data, time);
            mat.multiply(local);
        }
        return mat;
    }

    findPath(current, target, path) {
        path.push(current);
        if (current === target) return true;
        for (const child of current.children) {
            if (this.findPath(child, target, path)) return true;
        }
        path.pop();
        return false;
    }

    evaluateLocalTransform(data, time) {
        let mat = new THREE.Matrix4();

        if (data.scaleKeys.length > 0) {
            const scale = this.interpolateVertex(data.scaleKeys, time, false);
            if (scale) mat.scale(scale);
        }

        if (data.rotationKeys.length > 0) {
            const rotMat = this.evaluateRotation(data.rotationKeys, time);
            mat = rotMat.multiply(mat);
        }

        if (data.translationKeys.length > 0) {
            const vertex = this.interpolateVertex(data.translationKeys, time, true);
            if (vertex) {
                mat.elements[12] += vertex.x;
                mat.elements[13] += vertex.y;
                mat.elements[14] += vertex.z;
            }
        }

        return mat;
    }
}
