/**
 * Shared keyframe evaluation functions for animation playback.
 *
 * Mirrors the backend's keyframe evaluation pipeline from legoanim.cpp:
 *   FindKeys, GetRotation, GetTranslation, GetScale, CreateLocalTransform
 *
 * Used by both ScenePlayerRenderer (direct per-frame matrix application)
 * and AnimatedRenderer (track-based animation via AnimationMixer).
 */

import { Vec3 } from 'ogl/src/math/Vec3.js';
import { Quat } from 'ogl/src/math/Quat.js';
import { Mat4 } from 'ogl/src/math/Mat4.js';

/**
 * Locate keyframe bracket for a given time.
 * Mirrors FindKeys in legoanim.cpp:960.
 *
 * @param {Array<{time: number}>} keys - Keyframe array (sorted by time)
 * @param {number} time - Current time in ms
 * @returns {{ n: number, i: number }}
 *   n=0: no applicable key (before first or empty)
 *   n=1: use single key at index i
 *   n=2: interpolate between keys[i] and keys[i+1]
 */
export function findKeys(keys, time) {
    if (keys.length === 0) return { n: 0 };
    if (time < keys[0].time) return { n: 0 };
    if (time > keys[keys.length - 1].time) return { n: 1, i: keys.length - 1 };

    let idx = 0;
    for (let j = 0; j < keys.length - 1; j++) {
        if (time >= keys[j + 1].time) {
            idx = j + 1;
            continue;
        }
        break;
    }

    if (time === keys[idx].time) return { n: 1, i: idx };
    if (idx < keys.length - 1) return { n: 2, i: idx };
    return { n: 0 };
}

/**
 * Evaluate rotation keyframes at a given time.
 * Mirrors GetRotation in legoanim.cpp:843.
 *
 * Negates quaternion X to match the vertex X-negation in BaseRenderer geometry building.
 *
 * @param {Array<{time, flags, x, y, z, w}>} keys - Rotation keyframes (quaternion)
 * @param {number} time - Current time in ms
 * @returns {Mat4} Rotation matrix
 */
export function evaluateRotation(keys, time) {
    const r = findKeys(keys, time);
    const toQuat = (k) => new Quat(-k.x, k.y, k.z, k.w);

    if (r.n === 0) return new Mat4();

    if (r.n === 1) {
        // c_active flag (0x01)
        return (keys[r.i].flags & 1)
            ? new Mat4().fromQuaternion(toQuat(keys[r.i]))
            : new Mat4();
    }

    // n === 2: interpolate between keys[i] and keys[i+1]
    const before = keys[r.i];
    const after = keys[r.i + 1];

    if ((before.flags & 1) || (after.flags & 1)) {
        const beforeQ = toQuat(before);

        // c_skipInterpolation flag (0x04)
        if (after.flags & 4) {
            return new Mat4().fromQuaternion(beforeQ);
        }

        const afterQ = toQuat(after);

        // c_negateRotation flag (0x02)
        if (after.flags & 2) {
            afterQ.set(-afterQ[0], -afterQ[1], -afterQ[2], -afterQ[3]);
        }

        const t = (time - before.time) / (after.time - before.time);
        const result = new Quat().copy(beforeQ).slerp(afterQ, t);
        return new Mat4().fromQuaternion(result);
    }

    return new Mat4();
}

/**
 * Evaluate translation keyframes at a given time.
 * Mirrors GetTranslation in legoanim.cpp:779.
 *
 * Negates X to match the vertex X-negation in BaseRenderer geometry building.
 * Strictly checks the IsActive flag (0x01), matching the reference implementation.
 *
 * @param {Array<{time, flags, x, y, z}>} keys - Translation keyframes
 * @param {number} time - Current time in ms
 * @returns {Vec3|null} Translation vector, or null if inactive
 */
export function evaluateTranslation(keys, time) {
    const r = findKeys(keys, time);

    if (r.n === 0) return null;

    if (r.n === 1) {
        if (!(keys[r.i].flags & 1)) return null;
        return new Vec3(-keys[r.i].x, keys[r.i].y, keys[r.i].z);
    }

    // n === 2: interpolate
    const before = keys[r.i];
    const after = keys[r.i + 1];
    if (!(before.flags & 1) && !(after.flags & 1)) return null;

    const t = (time - before.time) / (after.time - before.time);
    return new Vec3(
        -(before.x + t * (after.x - before.x)),
        before.y + t * (after.y - before.y),
        before.z + t * (after.z - before.z),
    );
}

/**
 * Evaluate scale keyframes at a given time.
 * Mirrors GetScale in legoanim.cpp:906.
 *
 * No IsActive check — the reference implementation does not check it for scale keys.
 *
 * @param {Array<{time, flags, x, y, z}>} keys - Scale keyframes
 * @param {number} time - Current time in ms
 * @returns {Vec3|null} Scale vector, or null if no applicable key
 */
export function evaluateScale(keys, time) {
    const r = findKeys(keys, time);

    if (r.n === 0) return null;

    if (r.n === 1) {
        return new Vec3(keys[r.i].x, keys[r.i].y, keys[r.i].z);
    }

    // n === 2: interpolate
    const before = keys[r.i];
    const after = keys[r.i + 1];
    const t = (time - before.time) / (after.time - before.time);
    return new Vec3(
        before.x + t * (after.x - before.x),
        before.y + t * (after.y - before.y),
        before.z + t * (after.z - before.z),
    );
}

/**
 * Build a local transform matrix from a node's keyframes at the given time.
 * Mirrors CreateLocalTransform in legoanim.cpp:742.
 *
 * Order: Scale -> Rotation * Scale -> + Translation
 *
 * @param {{ translationKeys, rotationKeys, scaleKeys }} nodeData
 * @param {number} time - Current time in ms
 * @returns {Mat4}
 */
export function evaluateLocalTransform(nodeData, time) {
    let mat = new Mat4();

    if (nodeData.scaleKeys.length) {
        const s = evaluateScale(nodeData.scaleKeys, time);
        if (s) mat.scale(s);

        if (nodeData.rotationKeys.length) {
            mat = evaluateRotation(nodeData.rotationKeys, time).multiply(mat);
        }
    } else if (nodeData.rotationKeys.length) {
        mat = evaluateRotation(nodeData.rotationKeys, time);
    }

    if (nodeData.translationKeys.length) {
        const v = evaluateTranslation(nodeData.translationKeys, time);
        if (v) {
            mat[12] += v[0];
            mat[13] += v[1];
            mat[14] += v[2];
        }
    }

    return mat;
}

/**
 * Evaluate visibility from morph keyframes at the given time.
 * Mirrors GetVisibility in legoanim.cpp:937.
 *
 * Uses step interpolation: returns the last key value at or before the given time.
 *
 * @param {Array<{time, visible: boolean}>} morphKeys
 * @param {number} time - Current time in ms
 * @returns {boolean}
 */
export function getVisibility(morphKeys, time) {
    const r = findKeys(morphKeys, time);
    return (r.n === 0) ? true : morphKeys[r.i].visible;
}
