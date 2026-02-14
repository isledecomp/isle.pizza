import * as THREE from 'three';
import { parseAnimation } from '../formats/AnimationParser.js';
import { fetchAnimation } from '../assetLoader.js';
import { BaseRenderer } from './BaseRenderer.js';

/**
 * Intermediate renderer for LEGO models with animation support.
 * Extends BaseRenderer with clock-driven animation loop, AnimationMixer
 * management, animation caching, raycasting, and shared keyframe utilities.
 */
export class AnimatedRenderer extends BaseRenderer {
    constructor(canvas) {
        super(canvas);
        this.clock = new THREE.Clock();
        this.mixer = null;
        this.currentAction = null;
        this.animationCache = new Map();
        this.raycaster = new THREE.Raycaster();
        this._queuedClickAnim = null;
    }

    // ─── Animation Utilities ─────────────────────────────────────────

    /**
     * Fetch and parse an animation file by name, with caching.
     */
    async fetchAnimationByName(animName) {
        if (this.animationCache.has(animName)) {
            return this.animationCache.get(animName);
        }
        const buffer = await fetchAnimation(animName);
        if (!buffer) return null;
        const animData = parseAnimation(buffer);
        this.animationCache.set(animName, animData);
        return animData;
    }

    stopAnimation() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.currentAction = null;
        }
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    }

    /**
     * Recursively collect all unique keyframe times from the animation tree.
     */
    collectKeyframeTimes(node, timesSet) {
        const data = node.data;
        for (const key of data.translationKeys) timesSet.add(key.time);
        for (const key of data.rotationKeys) timesSet.add(key.time);
        for (const key of data.scaleKeys) timesSet.add(key.time);
        for (const key of data.morphKeys) timesSet.add(key.time);
        for (const child of node.children) {
            this.collectKeyframeTimes(child, timesSet);
        }
    }

    /**
     * Evaluate rotation keyframes at a given time.
     * Handles slerp interpolation between keyframes with flag-based control.
     * Coordinate conversion: game (w,x,y,z) -> Three.js with X negated.
     */
    evaluateRotation(keys, time) {
        const { before, after } = this.getBeforeAndAfter(keys, time);
        const toQuat = (key) => new THREE.Quaternion(-key.x, key.y, key.z, key.w);

        if (!after) {
            if (before.flags & 0x01) {
                return new THREE.Matrix4().makeRotationFromQuaternion(toQuat(before));
            }
            return new THREE.Matrix4();
        }

        if ((before.flags & 0x01) || (after.flags & 0x01)) {
            const beforeQ = toQuat(before);

            // Flag 0x04: skip interpolation, use before value
            if (after.flags & 0x04) {
                return new THREE.Matrix4().makeRotationFromQuaternion(beforeQ);
            }

            let afterQ = toQuat(after);
            // Flag 0x02: negate the after quaternion before slerp
            if (after.flags & 0x02) {
                afterQ.set(-afterQ.x, -afterQ.y, -afterQ.z, -afterQ.w);
            }

            const t = (time - before.time) / (after.time - before.time);
            const result = new THREE.Quaternion().slerpQuaternions(beforeQ, afterQ, t);
            return new THREE.Matrix4().makeRotationFromQuaternion(result);
        }

        return new THREE.Matrix4();
    }

    /**
     * Interpolate translation or scale keyframes at a given time.
     * For translation: negates X for coordinate system conversion.
     * For scale: no negation.
     */
    interpolateVertex(keys, time, isTranslation) {
        const { before, after } = this.getBeforeAndAfter(keys, time);

        const toVec = (key) => isTranslation
            ? new THREE.Vector3(-key.x, key.y, key.z)
            : new THREE.Vector3(key.x, key.y, key.z);

        if (!after) {
            if (isTranslation && !(before.flags & 0x01)) {
                if (Math.abs(before.x) < 1e-5 && Math.abs(before.y) < 1e-5 && Math.abs(before.z) < 1e-5) {
                    return null;
                }
            }
            return toVec(before);
        }

        if (isTranslation && !(before.flags & 0x01) && !(after.flags & 0x01)) {
            const bNonZero = Math.abs(before.x) > 1e-5 || Math.abs(before.y) > 1e-5 || Math.abs(before.z) > 1e-5;
            const aNonZero = Math.abs(after.x) > 1e-5 || Math.abs(after.y) > 1e-5 || Math.abs(after.z) > 1e-5;
            if (!bNonZero && !aNonZero) return null;
        }

        const t = (time - before.time) / (after.time - before.time);
        return new THREE.Vector3().lerpVectors(toVec(before), toVec(after), t);
    }

    /**
     * Find the keyframes immediately before and after the given time.
     */
    getBeforeAndAfter(keys, time) {
        let idx = keys.findIndex(k => k.time > time);
        if (idx < 0) idx = keys.length;
        const before = keys[Math.max(0, idx - 1)];
        return { before, after: keys[idx] || null };
    }

    // ─── Click Animation ─────────────────────────────────────────────

    /**
     * Queue a click animation by name. Subclasses may override to
     * accept domain-specific arguments and construct the name.
     * @param {string} animName - Animation asset name
     */
    queueClickAnimation(animName) {
        this._queuedClickAnim = animName;
    }

    /**
     * Play the queued click animation (one-shot), then resume auto-rotate.
     */
    async playQueuedAnimation() {
        if (!this._queuedClickAnim || !this.modelGroup) return;

        const animName = this._queuedClickAnim;
        this._queuedClickAnim = null;

        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) return;

            const tracks = this.buildRotationTracks(animData);
            if (tracks.length === 0) return;

            this.stopAnimation();

            const clip = new THREE.AnimationClip('clickAnim', -1, tracks);
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

    // ─── Raycast Hit Testing ─────────────────────────────────────────

    /**
     * Check if any mesh in the model was clicked.
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

    // ─── Simple Animation Tree Utilities ─────────────────────────────

    /**
     * Build rotation-only keyframe tracks by finding the deepest animated
     * node and evaluating the composed transform chain at each keyframe time.
     * Used by plant and building animations (single-group models).
     */
    buildRotationTracks(animData) {
        const duration = animData.duration;
        const timesSet = new Set([0]);
        this.collectKeyframeTimes(animData.rootNode, timesSet);
        const times = [...timesSet].filter(t => t <= duration).sort((a, b) => a - b);

        const targetNode = this.findAnimatedNode(animData.rootNode);
        if (!targetNode) return [];

        const quatValues = [];
        const timesSec = [];

        for (const time of times) {
            const mat = this.evaluateNodeChain(animData.rootNode, targetNode, time);
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

    /**
     * Find the deepest node in the animation tree that has keyframe data.
     */
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

    /**
     * Evaluate the composed transform matrix from root down to targetNode.
     */
    evaluateNodeChain(node, targetNode, time) {
        const path = [];
        if (!this.findNodePath(node, targetNode, path)) {
            return new THREE.Matrix4();
        }

        let mat = new THREE.Matrix4();
        for (const n of path) {
            const local = this.evaluateLocalTransform(n.data, time);
            mat.multiply(local);
        }
        return mat;
    }

    /**
     * Build the path from current node to target via depth-first search.
     */
    findNodePath(current, target, path) {
        path.push(current);
        if (current === target) return true;
        for (const child of current.children) {
            if (this.findNodePath(child, target, path)) return true;
        }
        path.pop();
        return false;
    }

    /**
     * Evaluate the local transform matrix for an animation node at a given time.
     */
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

    // ─── Scene Management ────────────────────────────────────────────

    clearModel() {
        this.stopAnimation();
        super.clearModel();
    }

    start() {
        this.animating = true;
        this.clock.start();
        this.animate();
    }

    updateAnimation() {
        const delta = this.clock.getDelta();
        if (this.mixer) {
            this.mixer.update(delta);
        }
        this.controls?.update();
    }

    dispose() {
        this.stopAnimation();
        super.dispose();
        this.animationCache.clear();
    }
}
