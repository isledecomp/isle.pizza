/**
 * Multi-actor scene renderer for scene animation playback.
 *
 * Directly applies animation transforms per-frame, matching the backend's
 * AnimUtils::ApplyTree -> LegoROI::ApplyAnimationTransformation pipeline.
 * No decompose/recompose round-trip -- matrices are set directly on OGL Transforms.
 */

import { Transform, Mesh } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { Mat4 } from 'ogl/src/math/Mat4.js';
import { BaseRenderer } from './BaseRenderer.js';
import { buildGlobalPartsMap } from '../formats/WdbParser.js';
import { evaluateLocalTransform, getVisibility } from '../animation/keyframeEval.js';
import { trimLODSuffix, stripStar } from '../animation/stringUtils.js';

/** Lowercase name with leading '*' stripped — used as the canonical key for actors/props. */
const canonicalize = (name) => stripStar(name).toLowerCase();

/**
 * Map from animation node names (lowercased) to character part group names.
 * Used to resolve animation tree nodes to the OGL Transform groups created
 * by assembleCharacterParts().
 */
const ANIM_NODE_TO_PART = {
    'body': 'part_body',
    'infohat': 'part_infohat',
    'infogron': 'part_infogron',
    'head': 'part_head',
    'arm-lft': 'part_arm-lft',
    'arm-rt': 'part_arm-rt',
    'claw-lft': 'part_claw-lft',
    'claw-rt': 'part_claw-rt',
    'leg-lft': 'part_leg-lft',
    'leg-rt': 'part_leg-rt',
};


export class ScenePlayerRenderer extends BaseRenderer {
    constructor(canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
        super(canvas);

        this._lastTime = 0;
        this._elapsed = 0;
        this._playing = false;
        this._duration = 0;
        this._actorContainers = new Map();
        this._animData = null;
    }

    /** @returns {Map<string, Map<string, Transform>>} Actor name -> part map */
    get actorContainers() {
        return this._actorContainers;
    }

    /**
     * Load and initialize the scene from parsed animation data.
     *
     * Pipeline:
     *   1. Load textures and build global parts map
     *   2. Assemble character and prop actors from the animation's actor list
     *   3. Resolve animation tree nodes to OGL Transforms
     *   4. Create props found in the tree but not in the actor list
     *   5. Apply frame 0, center/scale, set up camera and controls
     *
     * @param {import('../formats/SICompositeParser.js').SceneAnimData} sceneAnimData
     * @param {Array} participants - Participant records with charIndex
     * @param {{ wdbParser, wdbData }} wdbBundle
     */
    loadScene(sceneAnimData, participants, wdbBundle) {
        this.clearModel();

        const { wdbParser: parser, wdbData: wdb } = wdbBundle;
        this.loadTextures(wdb.globalTextures);

        this.modelGroup = new Transform();
        this.modelGroup.name = 'sceneRoot';
        this._actorContainers.clear();
        this._duration = sceneAnimData.duration;
        this._parser = parser;
        this._wdb = wdb;
        this._worldPartsMaps = new Map();

        const animData = sceneAnimData.anim;
        this._animData = animData;
        this._globalPartsMap = buildGlobalPartsMap(wdb.globalParts);

        // Phase 1: Assemble actors from the animation's actor list
        for (const actor of animData.actors) {
            if (!actor.name) continue;

            const canonicalName = canonicalize(actor.name);

            if (actor.actorType === 2) {
                // Character actor (e_managedLegoActor)
                this._assembleCharacter(canonicalName, this._globalPartsMap);
            } else {
                // Prop actor
                this._assembleProp(canonicalName);
            }
        }

        // Phase 2: Resolve animation tree nodes to OGL Transforms
        this._resolveAnimTree(animData.rootNode, this.modelGroup);

        // Phase 3: Create props found in the tree but not in the scene
        this._createMissingTreeProps(animData.rootNode);

        // Phase 3.5: Compute rebase rotation (face viewer) and resolve PTATCAM
        this._rebaseMatrix = this._computeRebaseMatrix();
        this._resolvePtAtCam(sceneAnimData.ptAtCamNames);

        // Phase 4: Apply frame 0 to position everything for bounding box
        this._applyFrame(0);

        this.centerAndScaleModel(2.5);
        this.scene.addChild(this.modelGroup);
        this.camera.position.set(3, 1.5, 5);
        this.camera.lookAt([0, 0.3, 0]);
        this.setupControls(new Vec3(0, 0.3, 0));
        if (this.controls) this.controls.autoRotate = false;
        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    // ── Actor Assembly ──────────────────────────────────────────────

    /**
     * Assemble a character actor from its parts and add to the scene.
     */
    _assembleCharacter(canonicalName, globalPartsMap) {
        const characterIndex = this.findCharacterIndex(canonicalName);
        if (characterIndex < 0) return;

        const parts = this.assembleCharacterParts(characterIndex, globalPartsMap);

        // Group parts under a container Transform named after the character.
        // Mirrors the backend's ROI hierarchy where each character is a parent
        // ROI with body parts as children, preventing name collisions when
        // multiple characters share part names (body, head, arm-lft, etc.).
        const container = new Transform();
        container.name = canonicalName;

        const partMap = new Map();
        for (const [partName, partGroup] of parts) {
            container.addChild(partGroup);
            partMap.set(partName, partGroup);
        }

        this.modelGroup.addChild(container);
        this._actorContainers.set(canonicalName, partMap);
    }

    /**
     * Assemble a prop actor and add to the scene.
     * Tries trimmed LOD suffix first, then the original name.
     */
    _assembleProp(canonicalName) {
        const group = this._lookupProp(canonicalName);
        if (group) {
            group.name = canonicalName;
            this.modelGroup.addChild(group);
        }
    }

    /**
     * Look up a prop by name, trying trimmed LOD suffix first, then the original.
     * @param {string} canonicalName - Lowercased prop name
     * @returns {Transform|null}
     */
    _lookupProp(canonicalName) {
        const trimmedName = trimLODSuffix(canonicalName);
        let group = this.assemblePropHierarchical(
            trimmedName, this._parser, this._wdb, this._worldPartsMaps, this._globalPartsMap
        );
        if (!group && trimmedName !== canonicalName) {
            group = this.assemblePropHierarchical(
                canonicalName, this._parser, this._wdb, this._worldPartsMaps, this._globalPartsMap
            );
        }
        return group;
    }

    // ── Animation Tree Resolution ───────────────────────────────────

    /** Find the first direct child of `parent` whose name matches. */
    _findChildByName(parent, name, excludeMesh = false) {
        for (const child of parent.children) {
            if (child.name === name && (!excludeMesh || !(child instanceof Mesh))) return child;
        }
        return null;
    }

    /**
     * Walk the animation tree and annotate each node.data with _transform
     * pointing to the resolved OGL Transform.
     *
     * Uses parent context to handle duplicate names (e.g. BIRDBEAK under
     * both BIRD and BIRD01). Matches the backend's FindChildROI behavior
     * where the search context is the direct parent's scope.
     */
    _resolveAnimTree(animNode, parentOGL) {
        const rawName = animNode.data?.name;
        if (!rawName) {
            for (const child of animNode.children) {
                this._resolveAnimTree(child, parentOGL);
            }
            return;
        }

        const canonicalName = canonicalize(rawName);
        let matched = null;

        // 1. Character body part? Scoped to parent context (character container),
        //    matching the backend's FindChildROI.
        const partName = ANIM_NODE_TO_PART[canonicalName];
        if (partName) {
            matched = this._findChildByName(parentOGL, partName);
        }

        // 2. Child of parent OGL Transform? (handles duplicate names via context)
        if (!matched) {
            matched = this._findChildByName(parentOGL, canonicalName, true);
        }

        // 3. Direct child of modelGroup?
        if (!matched) {
            matched = this._findChildByName(this.modelGroup, canonicalName, true);
        }

        animNode.data._transform = matched || null;

        // Backend behavior: the search context only changes at the top level (props/characters
        // that are direct children of modelGroup). For nested sub-parts, the search context
        // stays at the top-level prop so siblings can be found.
        const nextParent = (matched && matched.parent === this.modelGroup) ? matched : parentOGL;
        for (const child of animNode.children) {
            this._resolveAnimTree(child, nextParent);
        }
    }

    /**
     * Create props for tree nodes that still have no _transform after resolution.
     */
    _createMissingTreeProps(node) {
        const rawName = node.data?.name;
        if (rawName && !node.data._transform) {
            const canonicalName = canonicalize(rawName);
            const group = this._lookupProp(canonicalName);

            if (group) {
                group.name = canonicalName;
                this.modelGroup.addChild(group);
                node.data._transform = group;

                // Re-resolve children now that this prop exists
                for (const child of node.children) {
                    this._resolveAnimTree(child, group);
                }
                return;
            }
        }

        for (const child of node.children) {
            this._createMissingTreeProps(child);
        }
    }

    // ── Rebase Matrix (Face Viewer) ────────────────────────────────

    /**
     * Compute a Y-axis rotation that makes the root character face the camera.
     *
     * Walks the animation tree at t=0 to find the first character actor's world
     * matrix, extracts its forward direction (XZ plane), and returns a rotation
     * that aligns it with the direction from origin toward the default camera.
     */
    _computeRebaseMatrix() {
        const animData = this._animData;

        // Collect character actor names
        const characterNames = new Set();
        for (const actor of animData.actors) {
            if (actor.actorType === 2 && actor.name) {
                characterNames.add(canonicalize(actor.name));
            }
        }
        if (characterNames.size === 0) return new Mat4();

        // Find the first character's world matrix at t=0.
        // Start from root's children to match _applyFrame's iteration.
        let animPose0 = null;
        for (const child of animData.rootNode.children) {
            animPose0 = this._findFirstCharacterPose(child, new Mat4(), characterNames);
            if (animPose0) break;
        }
        if (!animPose0) return new Mat4();

        // Forward direction = column 2 of OGL column-major matrix
        const fwdX = animPose0[8];
        const fwdZ = animPose0[10];
        const fwdLen = Math.sqrt(fwdX * fwdX + fwdZ * fwdZ);
        if (fwdLen < 1e-6) return new Mat4();

        // Current forward angle (from +Z axis)
        const currentAngle = Math.atan2(fwdX, fwdZ);

        // Character models face -Z in local space (see ActorRenderer: modelGroup.rotation.y = π).
        // Column 2 points behind the character, so the visual forward is -column2.
        // To make -column2 point toward the camera, column2 must point AWAY from camera.
        const desiredAngle = Math.atan2(-3, -5);

        const rebase = new Mat4();
        rebase.rotate(desiredAngle - currentAngle, [0, 1, 0]);
        return rebase;
    }

    /**
     * Recursively walk the animation tree at t=0, accumulating world matrices,
     * and return the world matrix of the first node that matches a character actor.
     */
    _findFirstCharacterPose(node, parentMat, characterNames) {
        const data = node.data;
        if (!data) return null;

        const localMat = evaluateLocalTransform(data, 0);
        const worldMat = new Mat4().copy(parentMat).multiply(localMat);

        if (data.name) {
            const canonicalName = canonicalize(data.name);
            if (characterNames.has(canonicalName)) {
                return worldMat;
            }
        }

        for (const child of node.children) {
            const result = this._findFirstCharacterPose(child, worldMat, characterNames);
            if (result) return result;
        }
        return null;
    }

    // ── PTATCAM (Point At Camera) ──────────────────────────────────

    /**
     * Resolve PTATCAM ROI names to OGL Transforms by searching the animation tree.
     * @param {string[]} ptAtCamNames - ROI names from the SI extra directives
     */
    _resolvePtAtCam(ptAtCamNames) {
        this._ptAtCamTransforms = [];
        if (!ptAtCamNames || ptAtCamNames.length === 0) return;

        const targetNames = new Set(ptAtCamNames.map(n => n.toLowerCase()));
        this._collectPtAtCamNodes(this._animData.rootNode, targetNames);
    }

    /** Recursively collect transforms for nodes matching PTATCAM target names. */
    _collectPtAtCamNodes(node, targetNames) {
        if (node.data?.name) {
            const canonicalName = canonicalize(node.data.name);
            if (targetNames.has(canonicalName) && node.data._transform) {
                this._ptAtCamTransforms.push(node.data._transform);
            }
        }
        for (const child of node.children) {
            this._collectPtAtCamNodes(child, targetNames);
        }
    }

    /**
     * Apply PTATCAM post-processing: reorient target ROIs so their forward
     * direction points toward the camera.
     *
     * Mirrors LegoAnimPresenter::PutFrame / ScenePlayer::ApplyPtAtCam from the
     * original game. Keeps the up vector, recomputes right and forward based on
     * the camera-to-ROI direction.
     */
    _applyPtAtCam() {
        if (!this._ptAtCamTransforms || this._ptAtCamTransforms.length === 0) return;

        // Camera position in animation world space:
        // modelGroup transform is uniform scale + translation (from centerAndScaleModel)
        const s = this.modelGroup.scale.x;
        const p = this.modelGroup.position;
        const camX = (this.camera.position.x - p.x) / s;
        const camY = (this.camera.position.y - p.y) / s;
        const camZ = (this.camera.position.z - p.z) / s;

        for (const target of this._ptAtCamTransforms) {
            const wm = this._animWorldMap.get(target);
            if (!wm) continue;

            // Column magnitudes (preserve scale)
            const rightMag = Math.sqrt(wm[0] * wm[0] + wm[1] * wm[1] + wm[2] * wm[2]);
            const upMag = Math.sqrt(wm[4] * wm[4] + wm[5] * wm[5] + wm[6] * wm[6]);
            const fwdMag = Math.sqrt(wm[8] * wm[8] + wm[9] * wm[9] + wm[10] * wm[10]);
            if (rightMag < 1e-6 || upMag < 1e-6 || fwdMag < 1e-6) continue;

            // ROI position (column 3)
            const posX = wm[12], posY = wm[13], posZ = wm[14];

            // Vector from camera to ROI
            const ctX = posX - camX, ctY = posY - camY, ctZ = posZ - camZ;

            // Normalized up (column 1)
            const nuX = wm[4] / upMag, nuY = wm[5] / upMag, nuZ = wm[6] / upMag;

            // newRight = normalize(cross(up, camToROI))
            let nrX = nuY * ctZ - nuZ * ctY;
            let nrY = nuZ * ctX - nuX * ctZ;
            let nrZ = nuX * ctY - nuY * ctX;
            const nrLen = Math.sqrt(nrX * nrX + nrY * nrY + nrZ * nrZ);
            if (nrLen < 1e-6) continue; // camera aligned with up vector
            nrX /= nrLen; nrY /= nrLen; nrZ /= nrLen;

            // newFwd = cross(newRight, up)
            const nfX = nrY * nuZ - nrZ * nuY;
            const nfY = nrZ * nuX - nrX * nuZ;
            const nfZ = nrX * nuY - nrY * nuX;

            // Write columns back with restored magnitudes
            wm[0] = nrX * rightMag; wm[1] = nrY * rightMag; wm[2] = nrZ * rightMag;
            wm[4] = nuX * upMag;    wm[5] = nuY * upMag;    wm[6] = nuZ * upMag;
            wm[8] = nfX * fwdMag;   wm[9] = nfY * fwdMag;   wm[10] = nfZ * fwdMag;

            // Apply to OGL transform
            if (target.parent === this.modelGroup) {
                for (let i = 0; i < 16; i++) target.matrix[i] = wm[i];
            } else {
                const parentAnimWorld = this._animWorldMap.get(target.parent);
                if (parentAnimWorld) {
                    const relMat = new Mat4().copy(parentAnimWorld).inverse().multiply(wm);
                    for (let i = 0; i < 16; i++) target.matrix[i] = relMat[i];
                } else {
                    for (let i = 0; i < 16; i++) target.matrix[i] = wm[i];
                }
            }
            target.worldMatrixNeedsUpdate = true;
        }
    }

    // ── Playback Control ────────────────────────────────────────────

    play() {
        this._playing = true;
        this._lastTime = performance.now();
        if (!this.animating) this.start();
    }

    pause() {
        this._playing = false;
    }

    /** Reset elapsed time to zero for replay. */
    resetPlayback() {
        this._elapsed = 0;
    }

    /** Seek to a specific time in the animation. */
    seek(timeMs) {
        const clampedMs = Math.max(0, Math.min(timeMs, this._duration));
        this._elapsed = clampedMs / 1000;
        this._lastTime = performance.now();
        this._applyFrame(clampedMs);
    }

    get playing() { return this._playing; }
    get elapsed() { return this._elapsed * 1000; }
    get duration() { return this._duration; }
    set duration(value) { this._duration = value; }
    get finished() { return this._duration > 0 && this._elapsed * 1000 >= this._duration; }

    /**
     * Override BaseRenderer's updateAnimation for the scene playback loop.
     * Called each frame by BaseRenderer.animate().
     */
    updateAnimation() {
        const now = performance.now();
        const dt = (now - this._lastTime) / 1000;
        this._lastTime = now;

        if (this._playing) {
            this._elapsed += dt;
            if (this._elapsed * 1000 >= this._duration) {
                this._elapsed = this._duration / 1000;
                this._playing = false;
            }
            this._applyFrame(this._elapsed * 1000);
        }

        this.controls?.update();
    }

    // ── Per-Frame Animation (mirrors ApplyTree -> ApplyAnimationTransformation) ──

    /**
     * Apply all animation transforms at the given time.
     * Mirrors AnimUtils::ApplyTree which iterates root's children
     * with the rebase matrix, then applies PTATCAM post-processing.
     */
    _applyFrame(timeMs) {
        if (!this._animData) return;

        const root = this._animData.rootNode;

        // Map of OGL Transform -> its animation world matrix, for computing relative matrices
        this._animWorldMap = new Map();

        for (const child of root.children) {
            this._applyNode(child, timeMs, this._rebaseMatrix);
        }

        this._applyPtAtCam();
    }

    /**
     * Apply animation transforms to a single tree node and recurse.
     * Mirrors LegoROI::ApplyAnimationTransformation.
     *
     * For OGL transforms that are direct children of modelGroup (characters, top-level props),
     * we set the full animation world matrix directly.
     *
     * For sub-parts within a hierarchical prop (e.g. jail doors under jail, helicopter blades
     * under helicopter), we compute a RELATIVE matrix: inv(parentAnimWorld) * childAnimWorld.
     * This way OGL's parent-child composition produces the correct final world transform.
     */
    _applyNode(node, time, parentMat) {
        const data = node.data;
        if (!data) return;

        // Build local transform: Scale -> Rotation -> Translation
        const localMat = evaluateLocalTransform(data, time);

        // World = parent * local (matches roi->m_local2world.Product(mat, p_matrix))
        const worldMat = new Mat4().copy(parentMat).multiply(localMat);

        const target = data._transform;
        if (target) {
            let useMat;
            if (target.parent === this.modelGroup) {
                // Direct child of modelGroup: use animation world matrix
                useMat = worldMat;
            } else {
                // Sub-part within a prop: compute matrix relative to OGL parent
                // so that OGL's parent.worldMatrix * child.matrix = child.animWorldMatrix
                const parentAnimWorld = this._animWorldMap.get(target.parent);
                if (parentAnimWorld) {
                    const inv = new Mat4().copy(parentAnimWorld).inverse();
                    useMat = inv.multiply(worldMat);
                } else {
                    useMat = worldMat;
                }
            }

            for (let i = 0; i < 16; i++) target.matrix[i] = useMat[i];
            target.matrixAutoUpdate = false;
            target.worldMatrixNeedsUpdate = true;

            // Store this target's animation world matrix for sub-parts
            this._animWorldMap.set(target, worldMat);

            // Visibility from morph keys
            if (data.morphKeys.length) {
                target.visible = getVisibility(data.morphKeys, time);
            }
        }

        // Recurse -- always pass worldMat, matching backend behavior for unresolved nodes
        for (const child of node.children) {
            this._applyNode(child, time, worldMat);
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    clearModel() {
        this._animData = null;
        this._actorContainers.clear();
        this._elapsed = 0;
        this._playing = false;
        this._parser = null;
        this._wdb = null;
        this._worldPartsMaps = null;
        this._globalPartsMap = null;
        this._rebaseMatrix = null;
        this._ptAtCamTransforms = null;
        super.clearModel();
    }

    dispose() {
        this.animating = false;
        this.clearModel();
        super.dispose();
    }
}
