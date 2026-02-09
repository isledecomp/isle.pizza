/**
 * Parser for LEGO Island .ani animation files.
 * Format spec: isle/docs/animation.ksy
 *
 * Binary layout:
 *   S32 magic (0x11)
 *   F32 boundingRadius, F32 centerX, F32 centerY, F32 centerZ
 *   S32 hasCameraAnim, S32 unused
 *   U32 numActors
 *   For each actor: U32 nameLen, char[nameLen] name, U32 actorType (if nameLen > 0)
 *   S32 duration (ms)
 *   [optional camera_anim if hasCameraAnim != 0]
 *   tree_node root
 *
 * tree_node:
 *   node_data data
 *   U32 numChildren
 *   tree_node[numChildren] children
 *
 * node_data:
 *   U32 nameLen, char[nameLen] name (if nameLen > 0)
 *   U16 numTranslationKeys, translation_key[...]
 *   U16 numRotationKeys, rotation_key[...]
 *   U16 numScaleKeys, scale_key[...]
 *   U16 numMorphKeys, morph_key[...]
 *
 * Keys share packed time_and_flags (S32): bits 0-23 = time ms, bits 24-31 = flags
 * translation_key: anim_key + F32 x,y,z
 * rotation_key: anim_key + F32 angle(w), F32 x, F32 y, F32 z (quaternion)
 * scale_key: anim_key + F32 x,y,z
 * morph_key: anim_key + U8 visible
 */

import { BinaryReader } from './BinaryReader.js';

export class AnimationParser {
    /**
     * @param {ArrayBuffer} buffer
     */
    constructor(buffer) {
        this.reader = new BinaryReader(buffer);
    }

    parse() {
        const magic = this.reader.readS32();
        if (magic !== 0x11) {
            throw new Error(`Invalid animation magic: 0x${magic.toString(16)}, expected 0x11`);
        }

        const boundingRadius = this.reader.readF32();
        const centerX = this.reader.readF32();
        const centerY = this.reader.readF32();
        const centerZ = this.reader.readF32();
        const hasCameraAnim = this.reader.readS32();
        const unused = this.reader.readS32();

        const numActors = this.reader.readU32();
        const actors = [];
        for (let i = 0; i < numActors; i++) {
            actors.push(this.parseActorEntry());
        }

        const duration = this.reader.readS32();

        let cameraAnim = null;
        if (hasCameraAnim !== 0) {
            cameraAnim = this.parseCameraAnim();
        }

        const rootNode = this.parseTreeNode();

        return {
            boundingRadius,
            center: { x: centerX, y: centerY, z: centerZ },
            actors,
            duration,
            cameraAnim,
            rootNode
        };
    }

    parseActorEntry() {
        const nameLen = this.reader.readU32();
        if (nameLen === 0) {
            return { name: '', actorType: 0 };
        }
        const name = this.reader.readString(nameLen);
        const actorType = this.reader.readU32();
        return { name, actorType };
    }

    parseCameraAnim() {
        const numTranslationKeys = this.reader.readU16();
        const translationKeys = [];
        for (let i = 0; i < numTranslationKeys; i++) {
            translationKeys.push(this.parseTranslationKey());
        }

        const numTargetKeys = this.reader.readU16();
        const targetKeys = [];
        for (let i = 0; i < numTargetKeys; i++) {
            targetKeys.push(this.parseTranslationKey());
        }

        const numRotationKeys = this.reader.readU16();
        const rotationKeys = [];
        for (let i = 0; i < numRotationKeys; i++) {
            rotationKeys.push(this.parseRotationZKey());
        }

        return { translationKeys, targetKeys, rotationKeys };
    }

    parseTreeNode() {
        const data = this.parseNodeData();
        const numChildren = this.reader.readU32();
        const children = [];
        for (let i = 0; i < numChildren; i++) {
            children.push(this.parseTreeNode());
        }
        return { data, children };
    }

    parseNodeData() {
        const nameLen = this.reader.readU32();
        let name = '';
        if (nameLen > 0) {
            name = this.reader.readString(nameLen);
        }

        const numTranslationKeys = this.reader.readU16();
        const translationKeys = [];
        for (let i = 0; i < numTranslationKeys; i++) {
            translationKeys.push(this.parseTranslationKey());
        }

        const numRotationKeys = this.reader.readU16();
        const rotationKeys = [];
        for (let i = 0; i < numRotationKeys; i++) {
            rotationKeys.push(this.parseRotationKey());
        }

        const numScaleKeys = this.reader.readU16();
        const scaleKeys = [];
        for (let i = 0; i < numScaleKeys; i++) {
            scaleKeys.push(this.parseScaleKey());
        }

        const numMorphKeys = this.reader.readU16();
        const morphKeys = [];
        for (let i = 0; i < numMorphKeys; i++) {
            morphKeys.push(this.parseMorphKey());
        }

        return { name, translationKeys, rotationKeys, scaleKeys, morphKeys };
    }

    parseAnimKey() {
        const timeAndFlags = this.reader.readS32();
        return {
            time: timeAndFlags & 0xFFFFFF,
            flags: (timeAndFlags >>> 24) & 0xFF
        };
    }

    parseTranslationKey() {
        const key = this.parseAnimKey();
        const x = this.reader.readF32();
        const y = this.reader.readF32();
        const z = this.reader.readF32();
        return { ...key, x, y, z };
    }

    parseRotationKey() {
        const key = this.parseAnimKey();
        const w = this.reader.readF32(); // angle/scalar component
        const x = this.reader.readF32();
        const y = this.reader.readF32();
        const z = this.reader.readF32();
        return { ...key, w, x, y, z };
    }

    parseScaleKey() {
        const key = this.parseAnimKey();
        const x = this.reader.readF32();
        const y = this.reader.readF32();
        const z = this.reader.readF32();
        return { ...key, x, y, z };
    }

    parseMorphKey() {
        const key = this.parseAnimKey();
        const visible = this.reader.readU8();
        return { ...key, visible: visible !== 0 };
    }

    parseRotationZKey() {
        const key = this.parseAnimKey();
        const z = this.reader.readF32();
        return { ...key, z };
    }
}

/**
 * Parse an animation buffer.
 * @param {ArrayBuffer} buffer
 * @returns {Object} Parsed animation data
 */
export function parseAnimation(buffer) {
    const parser = new AnimationParser(buffer);
    return parser.parse();
}
