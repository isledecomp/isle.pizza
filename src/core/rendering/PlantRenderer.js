import * as THREE from 'three';
import { PlantLodNames } from '../savegame/plantConstants.js';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

// Plant color → LEGO color mapping for fallback materials
const PLANT_COLOR_MAP = ['lego white', 'lego black', 'lego yellow', 'lego red', 'lego green'];

// Animation suffix per variant: flower→F, tree→T, bush→B, palm→P
const VARIANT_ANIM_SUFFIX = ['F', 'T', 'B', 'P'];

// Per-variant display adjustments: [scaleFactor, yOffset]
// Flower is tall/wide → zoom out + shift down; others shift up to sit in frame
const VARIANT_DISPLAY = [
    [1.6, -0.1],   // Flower: smaller, shifted slightly down
    [1.8,  0.6],   // Tree: slightly smaller, shifted up
    [1.6,  1.4],   // Bush: smaller, shifted well up
    [2.0,  1.1],   // Palm: shifted well up
];

/**
 * Renderer for LEGO Island plants. Much simpler than ActorRenderer —
 * single model group, no multi-part assembly.
 */
export class PlantRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);
        this._queuedClickAnim = null;

        this.camera.position.set(1.5, 1.2, 2.5);
        this.camera.lookAt(0, 0.2, 0);

        this.setupControls(new THREE.Vector3(0, 0.2, 0));
    }

    /**
     * Load a plant model.
     * @param {number} variant - Plant variant (0-3)
     * @param {number} color - Plant color (0-4)
     * @param {Map} partsMap - Name→part lookup from WDB
     * @param {Array} textures - Texture list from WDB
     */
    loadPlant(variant, color, partsMap, textures) {
        this.clearModel();

        const lodName = PlantLodNames[variant]?.[color];
        if (!lodName) return;

        // Find the part data (case-insensitive)
        const partData = partsMap.get(lodName.toLowerCase());
        if (!partData) return;

        // Build texture lookup
        if (textures) {
            for (const tex of textures) {
                if (tex.name) {
                    this.textures.set(tex.name.toLowerCase(), this.createTexture(tex));
                }
            }
        }

        this.modelGroup = new THREE.Group();

        const lods = partData.lods || [];
        if (lods.length === 0) return;

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
                    // Fallback to plant color
                    const colorName = PLANT_COLOR_MAP[color] || 'lego green';
                    const colorEntry = LegoColors[colorName] || LegoColors['lego green'];
                    material = new THREE.MeshLambertMaterial({
                        color: new THREE.Color(colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255),
                        side: THREE.DoubleSide
                    });
                }
            }

            this.modelGroup.add(new THREE.Mesh(geometry, material));
        }

        const [scaleFactor, yOffset] = VARIANT_DISPLAY[variant] || [2.0, 0];
        this.centerAndScaleModel(scaleFactor);
        this.modelGroup.position.y += yOffset;
        this.scene.add(this.modelGroup);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Check if the plant mesh was clicked.
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
     * @param {number} variant - Plant variant (0-3)
     * @param {number} move - The plant's move value
     */
    queueClickAnimation(variant, move) {
        this._queuedClickAnim = { variant, move };
    }

    /**
     * Play a queued click animation if available.
     * Called after model reload or directly for non-visual changes.
     */
    async playQueuedAnimation() {
        if (!this._queuedClickAnim || !this.modelGroup) return;

        const { variant, move } = this._queuedClickAnim;
        this._queuedClickAnim = null;

        const suffix = VARIANT_ANIM_SUFFIX[variant];
        const animName = `PlantAnim${suffix}${move}`;

        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) return;

            const tracks = this.buildPlantTracks(animData);
            if (tracks.length === 0) return;

            this.stopAnimation();

            const clip = new THREE.AnimationClip('plantClick', -1, tracks);
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
     * Build animation tracks for a plant. Maps animation tree nodes
     * to the model group (the entire plant is a single group).
     */
    buildPlantTracks(animData) {
        const duration = animData.duration;
        const timesSet = new Set([0]);
        this.collectKeyframeTimes(animData.rootNode, timesSet);
        const times = [...timesSet].filter(t => t <= duration).sort((a, b) => a - b);

        // Find the deepest non-root node that has animation data —
        // map it to our modelGroup
        const plantNode = this.findPlantNode(animData.rootNode);
        if (!plantNode) return [];

        const quatValues = [];
        const timesSec = [];

        for (const time of times) {
            const mat = this.evaluateNodeChain(animData.rootNode, plantNode, time);
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            mat.decompose(position, quaternion, scale);

            timesSec.push(time / 1000);
            quatValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }

        // Only emit rotation tracks — position tracks would override the
        // centering applied by centerAndScaleModel() since the animation
        // uses the game's world-space coordinates.
        return [
            new THREE.QuaternionKeyframeTrack('.quaternion', timesSec, quatValues)
        ];
    }

    /**
     * Find the first leaf/deepest node with animation data in the tree.
     */
    findPlantNode(node) {
        // Depth-first: prefer children
        for (const child of node.children) {
            const found = this.findPlantNode(child);
            if (found) return found;
        }
        // If this node has actual keyframe data, use it
        const d = node.data;
        if (d.translationKeys.length > 0 || d.rotationKeys.length > 0 || d.scaleKeys.length > 0) {
            return node;
        }
        return null;
    }

    /**
     * Evaluate the composed matrix from root down to targetNode at a given time.
     */
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
