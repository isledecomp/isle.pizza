import * as THREE from 'three';
import { ActorLODs, ActorLODFlags, ActorInfoInit } from '../savegame/actorConstants.js';
import { LegoColors } from '../savegame/constants.js';
import { AnimatedRenderer } from './AnimatedRenderer.js';

/**
 * Map actor index to animation suffix index (from g_characters[].m_unk0x16).
 * This maps the 66 ActorInfoInit indices to the g_cycles row index.
 */
const ACTOR_SUFFIX_INDEX = (() => {
    // Default all to 0 (xx)
    const map = new Array(66).fill(0);
    map[0] = 1;  // pepper → Pe
    map[1] = 2;  // mama → Ma
    map[2] = 3;  // papa → Pa
    map[3] = 4;  // nick → Ni
    map[4] = 5;  // laura → La
    map[5] = 0;  // infoman → xx (not in g_characters, uses default)
    map[6] = 6;  // brickstr → Br
    // 7-35: all 0 (xx) — generic NPCs
    // Note: g_characters indices don't perfectly align with ActorInfoInit indices
    // for the NPCs after brickstr. The g_characters array has 47 entries
    // matching by name. We map the special ones:
    map[37] = 9;  // rd → Rd (g_characters index 36)
    map[38] = 8;  // pg → Pg (g_characters index 37)
    map[39] = 7;  // bd → Bd (g_characters index 38)
    map[40] = 10; // sy → Sy (g_characters index 39)
    map[56] = 1;  // pep → Pe (same as pepper)
    return map;
})();

/**
 * g_cycles[11][17] — animation name table from legoanimationmanager.cpp.
 * Rows = character type suffix index, columns = mood (0-3) for walking, higher indices for other animations.
 */
const G_CYCLES = [
    // 0: xx
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs011xx','CNs012xx',null,null,null,null,null],
    // 1: Pe
    ['CNs001Pe','CNs002Pe','CNs003Pe','CNs004Pe','CNs005Pe','CNs007Pe','CNs006Pe','CNs008Pe','CNs009Pe','CNs010Pe','CNs001sk',null,null,null,null,null,null], // CNs001sk = skateboard
    // 2: Ma
    ['CNs001Ma','CNs002Ma','CNs003Ma','CNs004Ma','CNs005Ma','CNs007Ma','CNs006Ma','CNs008Ma','CNs009Ma','CNs010Ma','CNs0x4Ma',null,null,'CNs011Ma','CNs012Ma','CNs013Ma',null],
    // 3: Pa
    ['CNs001Pa','CNs002Pa','CNs003Pa','CNs004Pa','CNs005Pa','CNs007Pa','CNs006Pa','CNs008Pa','CNs009Pa','CNs010Pa','CNs0x4Pa',null,null,'CNs011Pa','CNs012Pa','CNs013Pa',null],
    // 4: Ni
    ['CNs001Ni','CNs002Ni','CNs003Ni','CNs004Ni','CNs005Ni','CNs007Ni','CNs006Ni','CNs008Ni','CNs009Ni','CNs010Ni','CNs011Ni','CNsx11Ni',null,null,null,null,null],
    // 5: La
    ['CNs001La','CNs002La','CNs003La','CNs004La','CNs005La','CNs007La','CNs006La','CNs008La','CNs009La','CNs010La','CNs011La','CNsx11La',null,null,null,null,null],
    // 6: Br
    ['CNs001Br','CNs002Br','CNs003Br','CNs004Br','CNs005Br','CNs007Br','CNs006Br','CNs008Br','CNs009Br','CNs010Br','CNs011Br','CNs900Br','CNs901Br','CNs011Br','CNs012Br','CNs013Br','CNs014Br'],
    // 7: Bd
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Bd','CNs012xx',null,null,null,null,null],
    // 8: Pg
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Pg','CNs012xx',null,null,null,null,null],
    // 9: Rd
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Rd','CNs012xx',null,null,null,null,null],
    // 10: Sy
    ['CNs001xx','CNs002xx','CNs003xx','CNs004xx','CNs005xx','CNs007xx','CNs006xx','CNs008xx','CNs009xx','CNs010xx','CNs001Sy','CNs012xx',null,null,null,null,null],
];

/**
 * Map ActorLOD names (used in our part hierarchy) to animation node names.
 * Animation files use uppercase names like "BODY", "HEAD", "LEG-RT", etc.
 */
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

/**
 * Renderer for full LEGO characters assembled from WDB global parts.
 * Mirrors the game's LegoCharacterManager::CreateActorROI logic.
 */
export class ActorRenderer extends AnimatedRenderer {
    constructor(canvas) {
        super(canvas);
        this.partGroups = []; // 10 part groups for click targeting
        this._queuedClickMove = null; // queued click animation move index (0-3)

        this.camera.position.set(2, 0.8, 3.5);
        this.camera.lookAt(0, 0.2, 0);

        this.setupControls(new THREE.Vector3(0, 0.2, 0));
        this.controls.autoRotate = false;
        this._initialAutoRotate = false;
    }

    /**
     * Load a full actor from global parts, optionally with a vehicle.
     * @param {number} actorIndex - Index into ActorInfoInit (0-65)
     * @param {Array} characters - Parsed character state from save file (66 entries)
     * @param {Map} globalPartsMap - Name→part lookup for global parts
     * @param {Array} globalTextures - Global texture list from WDB
     * @param {Map|null} vehiclePartsMap - Name→part lookup for vehicle parts (null if no vehicle)
     * @param {Array|null} vehicleTextures - Vehicle texture list (null if no vehicle)
     * @param {object|null} vehicleInfo - { vehicleModel, vehicleAnim } or null
     */
    loadActor(actorIndex, characters, globalPartsMap, globalTextures, vehiclePartsMap, vehicleTextures, vehicleInfo) {
        this.clearModel();

        const actorInfo = ActorInfoInit[actorIndex];
        const charState = characters[actorIndex];

        // Build texture lookup
        for (const tex of globalTextures) {
            if (tex.name) {
                this.textures.set(tex.name.toLowerCase(), this.createTexture(tex));
            }
        }

        // Merge vehicle textures (if present)
        if (vehicleInfo && vehicleTextures) {
            for (const tex of vehicleTextures) {
                if (tex.name && !this.textures.has(tex.name.toLowerCase())) {
                    this.textures.set(tex.name.toLowerCase(), this.createTexture(tex));
                }
            }
        }

        this.modelGroup = new THREE.Group();
        this.partGroups = [];
        this.vehicleGroup = null;
        this.vehicleInfo = vehicleInfo || null;

        // Assemble 10 body parts (matching CreateActorROI loop: i=0..9 maps to ActorLODs[1..10])
        for (let i = 0; i < 10; i++) {
            const actorLOD = ActorLODs[i + 1];
            const part = actorInfo.parts[i];

            // Resolve part name for body (i=0) and hat (i=1)
            let partName;
            if (i === 0 || i === 1) {
                partName = this.resolvePartName(part, charState, i);
            } else {
                partName = actorLOD.parentName;
            }

            if (!partName) continue;

            // Find the part's LOD data in global parts
            const partData = globalPartsMap.get(partName.toLowerCase());
            if (!partData) continue;

            const partGroup = new THREE.Group();
            partGroup.userData.partIndex = i;
            partGroup.userData.partName = partName;
            partGroup.userData.lodName = actorLOD.name; // for animation matching
            // Name used by Three.js PropertyBinding to match animation tracks
            partGroup.name = `part_${actorLOD.name}`;

            // Resolve color/texture for this part
            const resolvedName = this.resolveNameValue(part, charState, i);

            // Create meshes from LODs
            const lods = partData.lods || [];
            if (lods.length > 0) {
                const lod = lods[lods.length - 1]; // Highest quality
                this.createPartMeshes(lod, actorLOD, part, resolvedName, i, partGroup);
            }

            // Position the part using ActorLOD transform
            this.applyPartTransform(partGroup, actorLOD);

            this.modelGroup.add(partGroup);
            this.partGroups[i] = partGroup;
        }

        // Create vehicle mesh if vehicle info is provided
        if (vehicleInfo && vehiclePartsMap) {
            this.createVehicleMesh(vehicleInfo, vehiclePartsMap);
        }

        this.centerAndScaleModel(1.8);
        // Rotate 180° around Y so actor faces the camera (negating X for
        // left-to-right-handed conversion flips the facing direction)
        this.modelGroup.rotation.y = Math.PI;
        // Shift model up in vehicle mode so it's better framed
        if (this.vehicleGroup) {
            this.modelGroup.position.y += 0.2;
        }
        this.scene.add(this.modelGroup);

        // Load and start walking/vehicle animation based on mood
        const mood = charState?.mood ?? 0;
        this.loadAnimationForActor(actorIndex, mood, vehicleInfo);

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Resolve which part geometry to use (body variant or hat type).
     */
    resolvePartName(part, charState, partIdx) {
        if (!part.partNameIndices || !part.partNames) return null;

        let nameIdx = part.partNameIndex;
        if (partIdx === 1 && charState) {
            nameIdx = charState.hatPartNameIndex;
        }

        return part.partNames[part.partNameIndices[nameIdx]];
    }

    /**
     * Resolve the color or texture name for a part.
     */
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

    /**
     * Create meshes for a single body part.
     */
    createPartMeshes(lod, actorLOD, part, resolvedName, partIdx, group) {
        const useTexture = (actorLOD.flags & ActorLODFlags.USE_TEXTURE) !== 0;
        const useColor = (actorLOD.flags & ActorLODFlags.USE_COLOR) !== 0;

        // Special case: body part (i=0) with partNameIndex 0 uses color instead of texture
        // (matches the C++ condition: i != 0 || part.m_partNameIndices[part.m_partNameIndex] != 0)
        const bodyUsesDefaultGeom = partIdx === 0 && part.partNameIndices &&
            part.partNameIndices[part.partNameIndex] === 0;

        let partColor = null;
        let partTexture = null;

        if (useTexture && !bodyUsesDefaultGeom) {
            // Look up texture by resolved name
            const texName = resolvedName?.toLowerCase();
            if (texName && this.textures.has(texName)) {
                partTexture = this.textures.get(texName);
            }
        }

        if ((useColor || bodyUsesDefaultGeom) && !partTexture) {
            // Resolve LEGO color
            const colorEntry = LegoColors[resolvedName] || LegoColors['lego white'];
            partColor = new THREE.Color(colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255);
        }

        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;

            // Check for per-mesh texture from the WDB geometry
            let meshTexture = null;
            const meshTexName = mesh.properties?.textureName?.toLowerCase();
            if (meshTexName && this.textures.has(meshTexName)) {
                meshTexture = this.textures.get(meshTexName);
            }

            let material;
            if (partTexture) {
                material = new THREE.MeshLambertMaterial({
                    map: partTexture,
                    side: THREE.DoubleSide,
                    color: 0xffffff
                });
            } else if (meshTexture) {
                material = new THREE.MeshLambertMaterial({
                    map: meshTexture,
                    side: THREE.DoubleSide,
                    color: 0xffffff
                });
            } else if (partColor) {
                material = new THREE.MeshLambertMaterial({
                    color: partColor,
                    side: THREE.DoubleSide
                });
            } else {
                const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                material = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255),
                    side: THREE.DoubleSide
                });
            }

            const threeMesh = new THREE.Mesh(geometry, material);
            group.add(threeMesh);
        }
    }

    /**
     * Create vehicle mesh from WDB model ROIs and add to modelGroup.
     * vehiclePartsMap maps model name → array of { name, lods }.
     */
    createVehicleMesh(vehicleInfo, vehiclePartsMap) {
        const rois = vehiclePartsMap.get(vehicleInfo.vehicleModel.toLowerCase());
        if (!rois || rois.length === 0) return;

        this.vehicleGroup = new THREE.Group();
        this.vehicleGroup.name = `vehicle_${vehicleInfo.vehicleModel}`;

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
                    const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                    material = new THREE.MeshLambertMaterial({
                        color: new THREE.Color(meshColor.r / 255, meshColor.g / 255, meshColor.b / 255),
                        side: THREE.DoubleSide
                    });
                }

                this.vehicleGroup.add(new THREE.Mesh(geometry, material));
            }
        }

        this.modelGroup.add(this.vehicleGroup);
    }

    /**
     * Center and scale the actor, excluding the hat from the bounding box
     * so that changing hats doesn't shift the actor's position.
     */
    centerAndScaleModel(scaleFactor) {
        if (!this.modelGroup) return;

        const box = new THREE.Box3();
        for (let i = 0; i < this.partGroups.length; i++) {
            if (i === 1 || !this.partGroups[i]) continue; // skip hat
            box.expandByObject(this.partGroups[i]);
        }
        if (this.vehicleGroup) {
            box.expandByObject(this.vehicleGroup);
        }

        if (box.isEmpty()) {
            super.centerAndScaleModel(scaleFactor);
            return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        this.modelGroup.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = scaleFactor / maxDim;
            this.modelGroup.scale.setScalar(scale);
        }
    }

    /**
     * Apply position/direction/up transform from ActorLOD data.
     * The game uses CalcLocalTransform with direction/up vectors.
     */
    applyPartTransform(group, actorLOD) {
        const pos = actorLOD.position;

        // Negate X for our coordinate system (matching VehiclePartRenderer's -v.x)
        group.position.set(-pos[0], pos[1], pos[2]);
    }

    /**
     * Get which body part was clicked
     * @returns {number} Part index (0-9) or -1 if nothing hit
     */
    getClickedPart(mouseEvent) {
        if (!this.modelGroup) return -1;

        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1,
            -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        for (let i = 0; i < this.partGroups.length; i++) {
            const partGroup = this.partGroups[i];
            if (!partGroup) continue;

            const meshes = [];
            partGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) meshes.push(child);
            });

            const intersects = this.raycaster.intersectObjects(meshes);
            if (intersects.length > 0) return i;
        }

        return -1;
    }

    // ─── Animation System ────────────────────────────────────────────

    /**
     * Compute secondary animation column index from mood, matching FUN_10063b90.
     * Primary: columns 0-3 (speed 0.7), Secondary: columns 4-6 (speed 4.0).
     * NPCs walk at speed 0.6-2.0, so most use the secondary animation which has
     * independent head/hat movement. Mood adjustment: if (mood >= 2) mood--.
     */
    static getSecondaryAnimColumn(mood) {
        let adjMood = mood;
        if (adjMood >= 2) adjMood--;
        return adjMood + 4;
    }

    /**
     * Queue a click animation to play after the next model load/reload.
     * @param {number} move - The actor's m_move value (0-3)
     */
    queueClickAnimation(move) {
        this._queuedClickMove = move;
    }

    /**
     * Load and start the animation for the given actor. If a click animation
     * is queued, plays it first (one-shot), then resumes the walking loop.
     * Otherwise loads the walking animation from the g_cycles table using the
     * secondary (speed 4.0) variant which NPCs typically use in-game.
     * When vehicleInfo is provided, uses the vehicle animation instead.
     * Falls back to Y-axis rotation if unavailable.
     */
    async loadAnimationForActor(actorIndex, mood = 0, vehicleInfo = undefined) {
        if (!this.modelGroup) return;

        // Use stored vehicleInfo when not explicitly provided (e.g. resuming after click anim)
        if (vehicleInfo === undefined) {
            vehicleInfo = this.vehicleInfo;
        }

        // If a click animation is queued (skip in vehicle mode), play it first
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
            // Vehicle mode: use the vehicle animation name
            animName = vehicleInfo.vehicleAnim;
        } else {
            const suffixIdx = ACTOR_SUFFIX_INDEX[actorIndex] ?? 0;
            // Use secondary animation (speed 4.0 threshold) — this is what NPCs use in-game
            // since their walking speed (0.6-2.0) exceeds the 0.7 primary threshold
            const secondaryCol = ActorRenderer.getSecondaryAnimColumn(mood);
            const primaryCol = mood;
            animName = G_CYCLES[suffixIdx]?.[secondaryCol] ?? G_CYCLES[suffixIdx]?.[primaryCol];
        }

        if (!animName) return; // null entry in g_cycles — no animation for this combo

        try {
            const animData = await this.fetchAnimationByName(animName);
            if (!animData || !this.modelGroup) return;

            const nodeToPartGroup = this.buildNodeToPartGroupMap();

            // Map vehicle animation nodes if in vehicle mode
            if (vehicleInfo && this.vehicleGroup) {
                this.mapVehicleAnimNodes(animData, vehicleInfo, nodeToPartGroup);
            }

            const tracks = this.buildHierarchicalTracks(animData, nodeToPartGroup);
            if (tracks.length === 0) return;

            const clip = new THREE.AnimationClip('walk', -1, tracks);
            this.mixer = new THREE.AnimationMixer(this.modelGroup);
            this.currentAction = this.mixer.clipAction(clip);
            this.currentAction.play();
        } catch (e) {
            // Animation unavailable — fall back to rotation (handled in updateAnimation())
        }
    }

    /**
     * Build a lookup mapping animation node names to part groups.
     */
    buildNodeToPartGroupMap() {
        const map = new Map();
        for (let i = 0; i < this.partGroups.length; i++) {
            const pg = this.partGroups[i];
            if (!pg) continue;
            const lodName = pg.userData.lodName;
            const animNodeName = PART_NAME_TO_ANIM_NODE[lodName];
            if (animNodeName) {
                map.set(animNodeName.toLowerCase(), pg);
            }
        }
        return map;
    }

    /**
     * Map vehicle animation tree nodes to the vehicle group.
     * Scans the animation tree for nodes whose name (stripped of trailing
     * digits/underscores) matches the vehicle model name, and maps them
     * to the vehicleGroup so buildHierarchicalTracks can drive the vehicle.
     */
    mapVehicleAnimNodes(animData, vehicleInfo, nodeToPartGroup) {
        const vehicleName = vehicleInfo.vehicleModel.toLowerCase();

        const scanTree = (node) => {
            const name = node.data.name?.toLowerCase();
            if (name) {
                // Strip trailing digits and underscores to get base name
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

    /**
     * Play a one-shot click animation (pose/gesture) determined by the actor's
     * m_move value (0-3). After it finishes, the walking animation resumes.
     * Matches LegoEntity::ClickAnimation which uses objectId = m_move + 10.
     */
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

            const clip = new THREE.AnimationClip('click', -1, tracks);
            this.mixer = new THREE.AnimationMixer(this.modelGroup);
            const action = this.mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.currentAction = action;
            action.play();

            // When click animation finishes, resume walking
            this.mixer.addEventListener('finished', () => {
                this.loadAnimationForActor(actorIndex, mood);
            });
        } catch (e) {
            console.error('ActorRenderer: click animation error', e);
            this.loadAnimationForActor(actorIndex, mood);
        }
    }

    /**
     * Build world-space keyframe tracks by evaluating the animation tree
     * hierarchically. At each unique keyframe time, walks the tree composing
     * parent * child transforms via matrix multiplication, then decomposes
     * to world-space position/quaternion for each part.
     */
    buildHierarchicalTracks(animData, nodeToPartGroup) {
        const duration = animData.duration;

        // Collect all unique keyframe times from the tree
        const timesSet = new Set([0]);
        this.collectKeyframeTimes(animData.rootNode, timesSet);
        const times = [...timesSet].filter(t => t <= duration).sort((a, b) => a - b);

        // For each time, evaluate the full tree and store world-space transforms
        const valueMap = new Map();
        const identity = new THREE.Matrix4();

        for (const time of times) {
            this.evaluateNode(animData.rootNode, time, identity, nodeToPartGroup, valueMap, true);
        }

        // Convert to Three.js KeyframeTracks
        const timesSec = times.map(t => t / 1000);
        const tracks = [];
        for (const [name, values] of valueMap) {
            if (name.endsWith('.position')) {
                tracks.push(new THREE.VectorKeyframeTrack(name, timesSec, values));
            } else if (name.endsWith('.quaternion')) {
                tracks.push(new THREE.QuaternionKeyframeTrack(name, timesSec, values));
            } else if (name.endsWith('.visible')) {
                tracks.push(new THREE.BooleanKeyframeTrack(name, timesSec, values));
            }
        }
        return tracks;
    }

    /**
     * Evaluate a single animation node at a given time, composing its local
     * transform with the parent's world matrix. If the node maps to a part
     * group, stores the decomposed world-space position and quaternion.
     * Recurses into children with the composed matrix.
     */
    evaluateNode(node, time, parentMatrix, nodeToPartGroup, valueMap, isRoot = false) {
        const data = node.data;
        let mat = new THREE.Matrix4();

        // Strip XZ translation on the actor root to keep the actor in place (treadmill fix).
        // Walking anims: the root node IS the actor (named "pepper", "mama", "actor_01", etc.)
        // Click anims: actor_01 is nested under wrapper nodes like "-NPa001ns"
        const isActorRoot = isRoot || data.name?.toLowerCase() === 'actor_01';

        // 1. Scale (applied first)
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

        // 2. Translation
        if (data.translationKeys.length > 0) {
            const vertex = this.interpolateVertex(data.translationKeys, time, true);
            if (vertex) {
                if (isActorRoot) {
                    // Actor_01: only apply vertical (Y) to preserve bounce,
                    // strip horizontal (XZ) so the actor animates in place
                    mat.elements[13] += vertex.y;
                } else {
                    mat.elements[12] += vertex.x;
                    mat.elements[13] += vertex.y;
                    mat.elements[14] += vertex.z;
                }
            }
        }

        // 3. Compose with parent: world = parent * local
        mat = parentMatrix.clone().multiply(mat);

        // 4. If this node maps to a part group, decompose and store
        const nodeName = data.name?.toLowerCase();
        if (nodeName) {
            const partGroup = nodeToPartGroup.get(nodeName);
            if (partGroup) {
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                mat.decompose(position, quaternion, scale);

                if (Math.abs(scale.x) < 1e-8 || Math.abs(scale.y) < 1e-8 || Math.abs(scale.z) < 1e-8) {
                    quaternion.identity();
                }

                const trackName = partGroup.name;
                this.pushValues(valueMap, `${trackName}.position`, position.toArray());
                this.pushValues(valueMap, `${trackName}.quaternion`, [quaternion.x, quaternion.y, quaternion.z, quaternion.w]);

                // Evaluate visibility from morph keys (matches game's SetVisibility(data->GetVisibility(p_time)))
                if (data.morphKeys.length > 0) {
                    const visible = this.getVisibility(data.morphKeys, time);
                    this.pushValues(valueMap, `${trackName}.visible`, [visible]);
                }
            }
        }

        // 5. Recurse into children
        for (const child of node.children) {
            this.evaluateNode(child, time, mat, nodeToPartGroup, valueMap);
        }
    }

    /**
     * Evaluate visibility from morph keys at a given time.
     * Matches game's GetVisibility: returns true (visible) by default,
     * or the last morph key's visible flag at or before the given time.
     */
    getVisibility(morphKeys, time) {
        let lastKey = null;
        for (const key of morphKeys) {
            if (key.time <= time) {
                lastKey = key;
            } else {
                break;
            }
        }
        return lastKey ? lastKey.visible : true;
    }

    /**
     * Append values to a named entry in the value map.
     */
    pushValues(map, key, values) {
        const existing = map.get(key);
        if (!existing) {
            map.set(key, [...values]);
        } else {
            existing.push(...values);
        }
    }

    // ─── Scene Management ────────────────────────────────────────────

    clearModel() {
        super.clearModel();
        this.partGroups = [];
        this.vehicleGroup = null;
        this.vehicleInfo = null;
    }
}
