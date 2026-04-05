import { Transform, Mesh } from 'ogl';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { Quat } from 'ogl/src/math/Quat.js';
import { Mat4 } from 'ogl/src/math/Mat4.js';
import { ActorLODs, ActorInfoInit } from '../savegame/actorConstants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';
import {
    SimpleAnimationMixer, AnimationClip,
    VectorTrack, QuaternionTrack, BooleanTrack, LoopOnce,
} from './AnimationMixer.js';
import { getVisibility } from '../animation/keyframeEval.js';

/**
 * Map actor index to animation suffix index (from g_characters[].m_unk0x16).
 */
const ACTOR_SUFFIX_INDEX = (() => {
    const map = new Array(66).fill(0);
    map[0] = 1;  // pepper → Pe
    map[1] = 2;  // mama → Ma
    map[2] = 3;  // papa → Pa
    map[3] = 4;  // nick → Ni
    map[4] = 5;  // laura → La
    map[5] = 0;  // infoman → xx
    map[6] = 6;  // brickstr → Br
    map[37] = 9;  // rd → Rd
    map[38] = 8;  // pg → Pg
    map[39] = 7;  // bd → Bd
    map[40] = 10; // sy → Sy
    map[56] = 1;  // pep → Pe
    return map;
})();

const G_CYCLES = [
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs011xx','CNs012xx',null,null,null,null,null],
    ['CNs001Pe','CNs002Pe','CNs003Pe','CNs004Pe','CNs005Pe','CNs007Pe','CNs006Pe','CNs008Pe','CNs009Pe','CNs010Pe','CNs001sk',null,null,null,null,null,null],
    ['CNs001Ma','CNs002Ma','CNs003Ma','CNs004Ma','CNs005Ma','CNs007Ma','CNs006Ma','CNs008Ma','CNs009Ma','CNs010Ma','CNs0x4Ma',null,null,'CNs011Ma','CNs012Ma','CNs013Ma',null],
    ['CNs001Pa','CNs002Pa','CNs003Pa','CNs004Pa','CNs005Pa','CNs007Pa','CNs006Pa','CNs008Pa','CNs009Pa','CNs010Pa','CNs0x4Pa',null,null,'CNs011Pa','CNs012Pa','CNs013Pa',null],
    ['CNs001Ni','CNs002Ni','CNs003Ni','CNs004Ni','CNs005Ni','CNs007Ni','CNs006Ni','CNs008Ni','CNs009Ni','CNs010Ni','CNs011Ni','CNsx11Ni',null,null,null,null,null],
    ['CNs001La','CNs002La','CNs003La','CNs004La','CNs005La','CNs007La','CNs006La','CNs008La','CNs009La','CNs010La','CNs011La','CNsx11La',null,null,null,null,null],
    ['CNs001Br','CNs002Br','CNs003Br','CNs004Br','CNs005Br','CNs007Br','CNs006Br','CNs008Br','CNs009Br','CNs010Br','CNs011Br','CNs900Br','CNs901Br','CNs011Br','CNs012Br','CNs013Br','CNs014Br'],
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Bd','CNs012xx',null,null,null,null,null],
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Pg','CNs012xx',null,null,null,null,null],
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Rd','CNs012xx',null,null,null,null,null],
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Sy','CNs012xx',null,null,null,null,null],
];

const PART_NAME_TO_ANIM_NODE = {
    'body': 'BODY',
    'infohat': 'INFOHAT',
    'infogron': 'INFOGRON',
    'head': 'HEAD',
    'arm-lft': 'ARM-LFT',
    'arm-rt': 'ARM-RT',
    'claw-lft': 'CLAW-LFT',
    'claw-rt': 'CLAW-RT',
    'leg-lft': 'LEG-LFT',
    'leg-rt': 'LEG-RT'
};

export class ActorRenderer extends AnimatedRenderer {
    constructor(canvas, rendererOptions) {
        super(canvas, rendererOptions);
        this.partGroups = [];
        this._queuedClickMove = null;
        this.skipAnimations = false;

        this.camera.position.set(2, 0.8, 3.5);
        this.camera.lookAt([0, 0.2, 0]);

        this.setupControls(new Vec3(0, 0.2, 0));
        if (this.controls) {
            this.controls.autoRotate = false;
            this._initialAutoRotate = false;
        }
    }

    loadActor(actorIndex, characters, globalPartsMap, globalTextures, vehiclePartsMap, vehicleTextures, vehicleInfo) {
        this.clearModel();

        const actorInfo = ActorInfoInit[actorIndex];
        const charState = characters[actorIndex];

        this.loadTextures(globalTextures);
        if (vehicleInfo) this.loadTextures(vehicleTextures, false);

        this.modelGroup = new Transform();
        this.modelGroup.name = 'actorRoot';
        this.partGroups = [];
        this.vehicleGroup = null;
        this.vehicleInfo = vehicleInfo || null;

        for (let i = 0; i < 10; i++) {
            const actorLOD = ActorLODs[i + 1];
            const part = actorInfo.parts[i];

            let partName;
            if (i === 0 || i === 1) {
                partName = this.resolvePartName(part, charState, i);
            } else {
                partName = actorLOD.parentName;
            }

            if (!partName) continue;

            const partData = globalPartsMap.get(partName.toLowerCase());
            if (!partData) continue;

            const partGroup = new Transform();
            partGroup._userData = { partIndex: i, partName, lodName: actorLOD.name };
            partGroup.name = `part_${actorLOD.name}`;

            const resolvedName = this.resolveNameValue(part, charState, i);

            const lods = partData.lods || [];
            if (lods.length > 0) {
                const lod = lods[lods.length - 1];
                this.createPartMeshes(lod, actorLOD, part, resolvedName, i, partGroup);
            }

            this.applyPartTransform(partGroup, actorLOD);

            this.modelGroup.addChild(partGroup);
            this.partGroups[i] = partGroup;
        }

        if (vehicleInfo && vehiclePartsMap) {
            this.createVehicleMesh(vehicleInfo, vehiclePartsMap);
        }

        this.centerAndScaleModel(1.8);
        this.modelGroup.rotation.y = Math.PI;
        if (this.vehicleGroup) {
            this.modelGroup.position.y += 0.2;
        }
        this.scene.addChild(this.modelGroup);

        if (!this.skipAnimations) {
            const mood = charState?.mood ?? 0;
            this.loadAnimationForActor(actorIndex, mood, vehicleInfo);
        }

        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    resolvePartName(part, charState, partIdx) {
        if (!part.partNameIndices || !part.partNames) return null;

        let nameIdx = part.partNameIndex;
        if (partIdx === 1 && charState) {
            nameIdx = charState.hatPartNameIndex;
        }

        return part.partNames[part.partNameIndices[nameIdx]];
    }

    resolveNameValue(part, charState, partIdx) {
        if (!part.nameIndices || !part.names) return null;

        let nameIdx = part.nameIndex;

        if (charState) {
            switch (partIdx) {
                case 1: nameIdx = charState.hatNameIndex; break;
                case 2: nameIdx = charState.infogronNameIndex; break;
                case 4: nameIdx = charState.armlftNameIndex; break;
                case 5: nameIdx = charState.armrtNameIndex; break;
                case 8: nameIdx = charState.leglftNameIndex; break;
                case 9: nameIdx = charState.legrtNameIndex; break;
            }
        }

        return part.names[part.nameIndices[nameIdx]];
    }

    // createPartMeshes is inherited from BaseRenderer

    createVehicleMesh(vehicleInfo, vehiclePartsMap) {
        const rois = vehiclePartsMap.get(vehicleInfo.vehicleModel.toLowerCase());
        if (!rois || rois.length === 0) return;

        this.vehicleGroup = new Transform();
        this.vehicleGroup.name = `vehicle_${vehicleInfo.vehicleModel}`;

        for (const roi of rois) {
            const lods = roi.lods || [];
            if (lods.length === 0) continue;

            const lod = lods[lods.length - 1];
            for (const mesh of lod.meshes) {
                const geometry = this.createGeometry(mesh, lod);
                if (!geometry) continue;
                const program = this.createMeshProgram(mesh);
                this.vehicleGroup.addChild(new Mesh(this.gl, { geometry, program }));
            }
        }

        this.modelGroup.addChild(this.vehicleGroup);
    }

    centerAndScaleModel(scaleFactor) {
        if (!this.modelGroup) return;

        // Build a temporary parent with just the parts we want to measure
        const min = new Vec3(Infinity, Infinity, Infinity);
        const max = new Vec3(-Infinity, -Infinity, -Infinity);
        let hasData = false;

        // Update world matrices first
        this.modelGroup.updateMatrixWorld(true);

        for (let i = 0; i < this.partGroups.length; i++) {
            if (i === 1 || !this.partGroups[i]) continue; // skip hat
            this.expandBounds(this.partGroups[i], min, max);
            hasData = true;
        }
        if (this.vehicleGroup) {
            this.expandBounds(this.vehicleGroup, min, max);
            hasData = true;
        }

        if (!hasData || min[0] === Infinity) {
            super.centerAndScaleModel(scaleFactor);
            return;
        }

        const center = new Vec3(
            (min[0] + max[0]) / 2,
            (min[1] + max[1]) / 2,
            (min[2] + max[2]) / 2,
        );
        const size = new Vec3(
            max[0] - min[0],
            max[1] - min[1],
            max[2] - min[2],
        );

        const maxDim = Math.max(size[0], size[1], size[2]);
        if (maxDim > 0) {
            const scale = scaleFactor / maxDim;
            this.modelGroup.scale.set(scale, scale, scale);
            this.modelGroup.position.set(
                -center[0] * scale,
                -center[1] * scale,
                -center[2] * scale,
            );
        } else {
            this.modelGroup.position.set(-center[0], -center[1], -center[2]);
        }
    }

    applyPartTransform(group, actorLOD) {
        const pos = actorLOD.position;
        group.position.set(-pos[0], pos[1], pos[2]);
    }

    getClickedPart(mouseEvent) {
        if (!this.modelGroup) return -1;

        const rect = this.canvas.getBoundingClientRect();
        const mouse = [
            ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1,
            -(((mouseEvent.clientY - rect.top) / rect.height) * 2 - 1),
        ];

        this.raycaster.castMouse(this.camera, mouse);

        let closestPart = -1;
        let closestDistance = Infinity;

        for (let i = 0; i < this.partGroups.length; i++) {
            const partGroup = this.partGroups[i];
            if (!partGroup) continue;

            const meshes = [];
            partGroup.traverse((child) => {
                if (child instanceof Mesh) meshes.push(child);
            });

            const hits = this.raycaster.intersectMeshes(meshes, { cullFace: false });
            if (hits.length > 0 && hits[0].hit.distance < closestDistance) {
                closestDistance = hits[0].hit.distance;
                closestPart = i;
            }
        }

        return closestPart;
    }

    // ─── Animation System ────────────────────────────────────────────

    static getSecondaryAnimColumn(mood) {
        let adjMood = mood;
        if (adjMood >= 2) adjMood--;
        return adjMood + 4;
    }

    queueClickAnimation(move) {
        this._queuedClickMove = move;
    }

    async loadAnimationForActor(actorIndex, mood = 0, vehicleInfo = undefined) {
        if (!this.modelGroup) return;

        if (vehicleInfo === undefined) {
            vehicleInfo = this.vehicleInfo;
        }

        if (this._queuedClickMove !== null && !vehicleInfo) {
            const move = this._queuedClickMove;
            this._queuedClickMove = null;
            await this.playClickAnimation(move, actorIndex, mood);
            return;
        }
        this._queuedClickMove = null;

        this.stopAnimation();

        let animName;
        if (vehicleInfo) {
            animName = vehicleInfo.vehicleAnim;
        } else {
            const suffixIdx = ACTOR_SUFFIX_INDEX[actorIndex] ?? 0;
            const secondaryCol = ActorRenderer.getSecondaryAnimColumn(mood);
            const primaryCol = mood;
            animName = G_CYCLES[suffixIdx]?.[secondaryCol] ?? G_CYCLES[suffixIdx]?.[primaryCol];
        }

        if (!animName) return;

        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) return;

            const nodeToPartGroup = this.buildNodeToPartGroupMap();

            if (vehicleInfo && this.vehicleGroup) {
                this.mapVehicleAnimNodes(animData, vehicleInfo, nodeToPartGroup);
            }

            const tracks = this.buildHierarchicalTracks(animData, nodeToPartGroup);
            if (tracks.length === 0) return;

            const clip = new AnimationClip('walk', -1, tracks);
            this.mixer = new SimpleAnimationMixer(this.modelGroup);
            this.currentAction = this.mixer.clipAction(clip);
            this.currentAction.play();
        } catch (e) {
            // Animation unavailable
        }
    }

    buildNodeToPartGroupMap() {
        const map = new Map();
        for (let i = 0; i < this.partGroups.length; i++) {
            const pg = this.partGroups[i];
            if (!pg) continue;
            const lodName = pg._userData.lodName;
            const animNodeName = PART_NAME_TO_ANIM_NODE[lodName];
            if (animNodeName) {
                map.set(animNodeName.toLowerCase(), pg);
            }
        }
        return map;
    }

    mapVehicleAnimNodes(animData, vehicleInfo, nodeToPartGroup) {
        const vehicleName = vehicleInfo.vehicleModel.toLowerCase();

        const scanTree = (node) => {
            const name = node.data.name?.toLowerCase();
            if (name) {
                const baseName = name.replace(/[\d_]+$/, '');
                if (baseName === vehicleName) {
                    nodeToPartGroup.set(name, this.vehicleGroup);
                }
            }
            for (const child of node.children) {
                scanTree(child);
            }
        };

        scanTree(animData.rootNode);
    }

    async playClickAnimation(move, actorIndex, mood) {
        if (!this.modelGroup) return;

        this.stopAnimation();

        const animName = `ClickAnim${move}`;
        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) {
                this.loadAnimationForActor(actorIndex, mood);
                return;
            }

            const nodeToPartGroup = this.buildNodeToPartGroupMap();

            const tracks = this.buildHierarchicalTracks(animData, nodeToPartGroup);
            if (tracks.length === 0) {
                this.loadAnimationForActor(actorIndex, mood);
                return;
            }

            const clip = new AnimationClip('click', -1, tracks);
            this.mixer = new SimpleAnimationMixer(this.modelGroup);
            const action = this.mixer.clipAction(clip);
            action.setLoop(LoopOnce);
            action.clampWhenFinished = true;
            this.currentAction = action;
            action.play();

            this.mixer.addEventListener('finished', () => {
                this.loadAnimationForActor(actorIndex, mood);
            });
        } catch (e) {
            console.error('ActorRenderer: click animation error', e);
            this.loadAnimationForActor(actorIndex, mood);
        }
    }

    buildHierarchicalTracks(animData, nodeToPartGroup) {
        const duration = animData.duration;

        const timesSet = new Set([0]);
        this.collectKeyframeTimes(animData.rootNode, timesSet);
        const times = [...timesSet].filter(t => t <= duration).sort((a, b) => a - b);

        const valueMap = new Map();
        const identity = new Mat4();

        for (const time of times) {
            this.evaluateNode(animData.rootNode, time, identity, nodeToPartGroup, valueMap, true);
        }

        const timesSec = times.map(t => t / 1000);
        const tracks = [];
        for (const [name, values] of valueMap) {
            if (name.endsWith('.position')) {
                tracks.push(VectorTrack(name, timesSec, values));
            } else if (name.endsWith('.quaternion')) {
                tracks.push(QuaternionTrack(name, timesSec, values));
            } else if (name.endsWith('.visible')) {
                tracks.push(BooleanTrack(name, timesSec, values));
            }
        }
        return tracks;
    }

    evaluateNode(node, time, parentMatrix, nodeToPartGroup, valueMap, isRoot = false) {
        const data = node.data;
        let mat = new Mat4();

        const isActorRoot = isRoot || data.name?.toLowerCase() === 'actor_01';

        if (data.scaleKeys.length > 0) {
            const scale = this.interpolateVertex(data.scaleKeys, time, false);
            if (scale) {
                mat.scale(scale);
            }
            if (data.rotationKeys.length > 0) {
                mat = this.evaluateRotation(data.rotationKeys, time).multiply(mat);
            }
        } else if (data.rotationKeys.length > 0) {
            mat = this.evaluateRotation(data.rotationKeys, time);
        }

        if (data.translationKeys.length > 0) {
            const vertex = this.interpolateVertex(data.translationKeys, time, true);
            if (vertex) {
                if (isActorRoot) {
                    mat[13] += vertex[1];
                } else {
                    mat[12] += vertex[0];
                    mat[13] += vertex[1];
                    mat[14] += vertex[2];
                }
            }
        }

        mat = new Mat4().copy(parentMatrix).multiply(mat);

        const nodeName = data.name?.toLowerCase();
        if (nodeName) {
            const partGroup = nodeToPartGroup.get(nodeName);
            if (partGroup) {
                const position = new Vec3();
                const quaternion = new Quat();
                const scale = new Vec3();
                mat.decompose(quaternion, position, scale);

                if (Math.abs(scale[0]) < 1e-8 || Math.abs(scale[1]) < 1e-8 || Math.abs(scale[2]) < 1e-8) {
                    quaternion.identity();
                }

                const trackName = partGroup.name;
                this.pushValues(valueMap, `${trackName}.position`, [position[0], position[1], position[2]]);
                this.pushValues(valueMap, `${trackName}.quaternion`, [quaternion[0], quaternion[1], quaternion[2], quaternion[3]]);

                if (data.morphKeys.length > 0) {
                    const visible = this.getVisibility(data.morphKeys, time);
                    this.pushValues(valueMap, `${trackName}.visible`, [visible]);
                }
            }
        }

        for (const child of node.children) {
            this.evaluateNode(child, time, mat, nodeToPartGroup, valueMap);
        }
    }

    getVisibility(morphKeys, time) {
        return getVisibility(morphKeys, time);
    }

    pushValues(map, key, values) {
        const existing = map.get(key);
        if (!existing) {
            map.set(key, [...values]);
        } else {
            existing.push(...values);
        }
    }

    clearModel() {
        super.clearModel();
        this.partGroups = [];
        this.vehicleGroup = null;
        this.vehicleInfo = null;
    }
}
