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
