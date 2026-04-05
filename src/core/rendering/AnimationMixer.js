/**
 * Lightweight animation system for OGL Transform nodes.
 * Resolves track names like "part_body.position" to scene graph nodes
 * and interpolates keyframed values (vector lerp, quaternion slerp, boolean step).
 */

export const LoopRepeat = 0;
export const LoopOnce = 1;

export class AnimationClip {
    /**
     * @param {string} name
     * @param {number} duration - Duration in seconds (-1 = auto from tracks)
     * @param {AnimationTrack[]} tracks
     */
    constructor(name, duration, tracks) {
        this.name = name;
        this.tracks = tracks;

        if (duration < 0) {
            let maxTime = 0;
            for (const track of tracks) {
                const lastTime = track.times[track.times.length - 1];
                if (lastTime > maxTime) maxTime = lastTime;
            }
            this.duration = maxTime;
        } else {
            this.duration = duration;
        }
    }
}

/**
 * A single animation track binding values to a property on a named object.
 */
export class AnimationTrack {
    /**
     * @param {string} name - e.g. "part_body.position" or ".quaternion"
     * @param {Float64Array|number[]} times - Keyframe times in seconds
     * @param {Float64Array|number[]} values - Keyframe values (flattened)
     * @param {'vector'|'quaternion'|'boolean'} type
     */
    constructor(name, times, values, type = 'vector') {
        this.name = name;
        this.times = times;
        this.values = values;
        this.type = type;

        // Parse "objectName.propertyName"
        const dot = name.lastIndexOf('.');
        this.objectName = dot > 0 ? name.substring(0, dot) : '';
        this.propertyName = name.substring(dot + 1);

        // Size per keyframe
        if (type === 'quaternion') this.size = 4;
        else if (type === 'boolean') this.size = 1;
        else this.size = values.length / times.length;
    }
}

// Quaternion track factory
export function QuaternionTrack(name, times, values) {
    return new AnimationTrack(name, times, values, 'quaternion');
}

// Vector track factory
export function VectorTrack(name, times, values) {
    return new AnimationTrack(name, times, values, 'vector');
}

// Boolean track factory
export function BooleanTrack(name, times, values) {
    return new AnimationTrack(name, times, values, 'boolean');
}

/**
 * Manages playback of an AnimationClip on a root Transform.
 */
export class SimpleAnimationMixer {
    constructor(root) {
        this.root = root;
        this._action = null;
        this._time = 0;
        this._listeners = {};
        this._nodeCache = new Map();
    }

    /**
     * Create an action for a clip.
     * @param {AnimationClip} clip
     * @returns {{ play, stop, setLoop, clampWhenFinished }}
     */
    clipAction(clip) {
        const action = {
            clip,
            loop: LoopRepeat,
            clampWhenFinished: false,
            playing: false,
            setLoop(mode) { this.loop = mode; return this; },
            play: () => {
                action.playing = true;
                this._action = action;
                this._time = 0;
                this._resolveBindings(clip);
            },
            stop: () => {
                action.playing = false;
                if (this._action === action) this._action = null;
            },
        };
        return action;
    }

    /**
     * Resolve track names to actual Transform nodes and cache bindings.
     */
    _resolveBindings(clip) {
        for (const track of clip.tracks) {
            if (track._target !== undefined) continue; // Already resolved

            if (!track.objectName) {
                // Bind to root
                track._target = this.root;
            } else {
                // Find child by name
                let cached = this._nodeCache.get(track.objectName);
                if (!cached) {
                    this.root.traverse((node) => {
                        if (node.name === track.objectName) {
                            cached = node;
                            return true; // Stop traversal
                        }
                    });
                    if (cached) this._nodeCache.set(track.objectName, cached);
                }
                track._target = cached || null;
            }
        }
    }

    /**
     * Advance time and apply interpolated values.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const action = this._action;
        if (!action || !action.playing) return;

        this._time += dt;
        const clip = action.clip;
        const duration = clip.duration;

        let time = this._time;
        let finished = false;

        if (time >= duration) {
            if (action.loop === LoopOnce) {
                time = duration;
                finished = true;
            } else {
                time = time % duration;
            }
        }

        // Apply each track
        for (const track of clip.tracks) {
            if (!track._target) continue;
            this._applyTrack(track, time);
        }

        if (finished) {
            action.playing = false;
            this._action = null;
            this._emit('finished');
        }
    }

    _applyTrack(track, time) {
        const target = track._target;
        const prop = track.propertyName;
        const times = track.times;
        const values = track.values;
        const size = track.size;

        // Find keyframe bracket
        let idx = 0;
        for (let i = 0; i < times.length; i++) {
            if (times[i] > time) { idx = i; break; }
            idx = i + 1;
        }

        if (track.type === 'boolean') {
            // Step interpolation: use last value at or before time
            const vi = Math.min(Math.max(0, idx - 1), times.length - 1);
            target[prop] = !!values[vi];
            return;
        }

        if (idx === 0) {
            // Before first keyframe
            this._setProperty(target, prop, values, 0, size, track.type);
            return;
        }
        if (idx >= times.length) {
            // After last keyframe
            this._setProperty(target, prop, values, (times.length - 1) * size, size, track.type);
            return;
        }

        // Interpolate
        const t0 = times[idx - 1];
        const t1 = times[idx];
        const alpha = (time - t0) / (t1 - t0);
        const i0 = (idx - 1) * size;
        const i1 = idx * size;

        if (track.type === 'quaternion') {
            this._slerpQuaternion(target, prop, values, i0, i1, alpha);
        } else {
            this._lerpVector(target, prop, values, i0, i1, alpha, size);
        }
    }

    _setProperty(target, prop, values, offset, size, type) {
        const p = target[prop];
        if (size === 1) {
            target[prop] = values[offset];
        } else if (type === 'quaternion' && p && p.set) {
            // Set all components atomically to avoid OGL Quat proxy corruption
            p.set(values[offset], values[offset + 1], values[offset + 2], values[offset + 3]);
        } else if (p && p.length !== undefined) {
            for (let i = 0; i < size; i++) p[i] = values[offset + i];
        }
    }

    _slerpQuaternion(target, prop, values, i0, i1, t) {
        const q = target[prop];
        if (!q) return;

        // Read quaternions
        let ax = values[i0], ay = values[i0 + 1], az = values[i0 + 2], aw = values[i0 + 3];
        let bx = values[i1], by = values[i1 + 1], bz = values[i1 + 2], bw = values[i1 + 3];

        // Dot product
        let dot = ax * bx + ay * by + az * bz + aw * bw;
        if (dot < 0) {
            bx = -bx; by = -by; bz = -bz; bw = -bw;
            dot = -dot;
        }

        let s0, s1;
        if (1.0 - dot > 1e-6) {
            const omega = Math.acos(Math.min(dot, 1.0));
            const sinOmega = Math.sin(omega);
            s0 = Math.sin((1.0 - t) * omega) / sinOmega;
            s1 = Math.sin(t * omega) / sinOmega;
        } else {
            s0 = 1.0 - t;
            s1 = t;
        }

        // Set all components atomically to avoid OGL Quat proxy corruption.
        // Setting q[0], q[1], ... individually triggers onChange per component,
        // which round-trips through euler conversion and overwrites the quaternion.
        q.set(
            s0 * ax + s1 * bx,
            s0 * ay + s1 * by,
            s0 * az + s1 * bz,
            s0 * aw + s1 * bw,
        );
    }

    _lerpVector(target, prop, values, i0, i1, t, size) {
        const p = target[prop];
        if (!p || p.length === undefined) return;
        for (let i = 0; i < size; i++) {
            p[i] = values[i0 + i] + t * (values[i1 + i] - values[i0 + i]);
        }
    }

    stopAllAction() {
        if (this._action) {
            this._action.playing = false;
            this._action = null;
        }
        this._time = 0;
    }

    addEventListener(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    _emit(event) {
        const cbs = this._listeners[event];
        if (cbs) for (const cb of cbs) cb();
    }
}
