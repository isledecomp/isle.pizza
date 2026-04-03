import { Renderer, Camera, Transform, Mesh, Geometry, Program, Texture } from 'ogl';
import { Orbit } from 'ogl/src/extras/Orbit.js';
import { Vec3 } from 'ogl/src/math/Vec3.js';
import { Quat } from 'ogl/src/math/Quat.js';
import { LAMBERT_VERTEX, LAMBERT_FRAGMENT, LIGHT_UNIFORMS } from './LambertShader.js';
import { ActorInfoInit, ActorLODs, ActorLODFlags } from '../savegame/actorConstants.js';
import { LegoColors } from '../savegame/constants.js';
import { resolveLods, buildGlobalPartsMap, buildPartsMap } from '../formats/WdbParser.js';

/**
 * Base renderer providing shared OGL setup, texture creation,
 * geometry building, and animation loop for LEGO model viewers.
 */
export class BaseRenderer {
    constructor(canvas, rendererOptions = {}) {
        this.canvas = canvas;
        this.animating = false;
        this.modelGroup = null;
        this.textures = new Map();

        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;

        this.glRenderer = new Renderer({
            canvas,
            antialias: true,
            alpha: true,
            dpr,
            width: canvas.width,
            height: canvas.height,
            ...rendererOptions
        });
        this.gl = this.glRenderer.gl;

        // Transparent clear
        this.gl.clearColor(0, 0, 0, 0);

        this.scene = new Transform();

        this.camera = new Camera(this.gl, { fov: 45, near: 0.1, far: 100 });

        this.controls = null;
        this._didDrag = false;
    }

    setupControls(target) {
        // Orbit requires a DOM element — skip in worker/offscreen contexts
        if (typeof document === 'undefined') return;

        // OGL's Orbit stores autoRotate in a closure that can't be mutated.
        // We disable it in OGL and drive auto-rotation ourselves.
        this._orbit = new Orbit(this.camera, {
            element: this.canvas,
            target: new Vec3(target[0], target[1], target[2]),
            enableZoom: true,
            enablePan: true,
            ease: 0.15,
            inertia: 0.85,
            autoRotate: false,
            autoRotateSpeed: 1.0,
        });

        // Wrap with mutable autoRotate
        // Pre-allocate temporaries for the auto-rotate update to avoid per-frame GC
        const _rotAxis = new Vec3(0, 1, 0);
        const _rotQuat = new Quat();
        const _rotOffset = new Vec3();

        this.controls = {
            target: this._orbit.target,
            autoRotate: true,
            autoRotateSpeed: 4.0,
            forcePosition: () => this._orbit.forcePosition(),
            remove: () => this._orbit.remove(),
            update: () => {
                if (this.controls.autoRotate) {
                    const angle = ((2 * Math.PI) / 60 / 60) * this.controls.autoRotateSpeed;
                    _rotQuat.fromAxisAngle(_rotAxis, -angle);
                    _rotOffset.copy(this.camera.position).sub(this.controls.target);
                    _rotOffset.applyQuaternion(_rotQuat);
                    this.camera.position.copy(this.controls.target).add(_rotOffset);
                    this._orbit.forcePosition();
                }
                this._orbit.update();
            },
        };

        this._onPointerDown = (e) => {
            if (e.button !== 0) return;
            this._didDrag = false;
            this._pointerStart = { x: e.clientX, y: e.clientY };
            // Stop auto-rotate on user interaction
            this.controls.autoRotate = false;
        };
        this._onPointerMove = (e) => {
            if (!this._pointerStart) return;
            const dx = e.clientX - this._pointerStart.x;
            const dy = e.clientY - this._pointerStart.y;
            if (dx * dx + dy * dy > 9) this._didDrag = true;
        };
        this._onPointerUp = (e) => {
            if (e.button !== 0) return;
            if (this._pointerStart && !this._didDrag) {
                // OGL Orbit calls preventDefault() on touchstart, which
                // suppresses the browser's synthesized click event on mobile.
                // Dispatch a synthetic click so canvas onclick handlers work.
                const syntheticClick = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    button: 0,
                });
                syntheticClick._synthetic = true;
                this.canvas.dispatchEvent(syntheticClick);
            }
            this._pointerStart = null;
        };
        // Suppress native click events so only our synthetic clicks reach handlers.
        // This prevents double-firing on desktop where native clicks still work.
        this._onNativeClickCapture = (e) => {
            if (!e._synthetic) {
                e.stopImmediatePropagation();
            }
        };

        this.canvas.addEventListener('pointerdown', this._onPointerDown);
        this.canvas.addEventListener('pointermove', this._onPointerMove);
        this.canvas.addEventListener('pointerup', this._onPointerUp);
        this.canvas.addEventListener('click', this._onNativeClickCapture, true);

        this._initialAutoRotate = true;
        this._savedCameraPos = new Vec3().copy(this.camera.position);
        this._savedTarget = new Vec3().copy(this.controls.target);
    }

    resetView() {
        if (!this.controls) return;
        this.camera.position.copy(this._savedCameraPos);
        this.controls.target.copy(this._savedTarget);
        this.controls.forcePosition();
        this.controls.autoRotate = this._initialAutoRotate;
    }

    wasDragged() {
        return this._didDrag;
    }

    /**
     * Create an OGL texture from parsed palette-indexed texture data.
     */
    createTexture(textureData) {
        const w = textureData.width;
        const h = textureData.height;
        const canvas = typeof document !== 'undefined'
            ? document.createElement('canvas')
            : new OffscreenCanvas(w, h);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(w, h);
        for (let i = 0; i < textureData.pixels.length; i++) {
            const colorIdx = textureData.pixels[i];
            const color = textureData.palette[colorIdx] || { r: 0, g: 0, b: 0 };
            imageData.data[i * 4 + 0] = color.r;
            imageData.data[i * 4 + 1] = color.g;
            imageData.data[i * 4 + 2] = color.b;
            imageData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new Texture(this.gl, {
            image: canvas,
            minFilter: this.gl.NEAREST,
            magFilter: this.gl.NEAREST,
            wrapS: this.gl.REPEAT,
            wrapT: this.gl.REPEAT,
            generateMipmaps: false,
            flipY: true,
        });
        return texture;
    }

    /**
     * Build the texture lookup map from an array of texture data objects.
     */
    loadTextures(textures, overwrite = true) {
        if (!textures) return;
        for (const tex of textures) {
            if (!tex.name) continue;
            const key = tex.name.toLowerCase();
            if (overwrite || !this.textures.has(key)) {
                this.textures.set(key, this.createTexture(tex));
            }
        }
    }

    /**
     * Create an OGL Program (shader material) for a mesh.
     * @param {object} mesh - Mesh data with properties (textureName, color)
     * @param {number[]|null} fallbackColor - [r, g, b] normalized, or null
     * @returns {Program}
     */
    createMeshProgram(mesh, fallbackColor = null) {
        const meshTexName = mesh.properties?.textureName?.toLowerCase();
        if (meshTexName && this.textures.has(meshTexName)) {
            return this.createTexturedProgram(this.textures.get(meshTexName));
        }

        const meshColor = mesh.properties?.color;
        const color = meshColor
            ? [meshColor.r / 255, meshColor.g / 255, meshColor.b / 255]
            : (fallbackColor || [0.5, 0.5, 0.5]);

        return this.createColoredProgram(color);
    }

    /**
     * Create a Lambert program with a texture map.
     * @param {Texture} texture - OGL Texture to use
     * @param {number} [opacity=1]
     * @param {object} [opts] - Extra Program options (e.g. transparent, depthWrite)
     */
    createTexturedProgram(texture, opacity = 1, opts = {}) {
        return this._createLambertProgram({
            tMap: { value: texture },
            uUseTexture: { value: 1 },
            uColor: { value: [1, 1, 1] },
            uOpacity: { value: opacity },
        }, opts);
    }

    /**
     * Create a Lambert program with a solid color.
     * @param {number[]} color - [r, g, b] normalized
     * @param {number} [opacity=1]
     * @param {object} [opts] - Extra Program options
     */
    createColoredProgram(color, opacity = 1, opts = {}) {
        return this._createLambertProgram({
            tMap: { value: this._emptyTexture() },
            uUseTexture: { value: 0 },
            uColor: { value: color },
            uOpacity: { value: opacity },
        }, opts);
    }

    /**
     * Create a Lambert-shaded Program with the given extra uniforms.
     */
    _createLambertProgram(extraUniforms, opts = {}) {
        return new Program(this.gl, {
            vertex: LAMBERT_VERTEX,
            fragment: LAMBERT_FRAGMENT,
            uniforms: {
                ...LIGHT_UNIFORMS,
                ...extraUniforms,
            },
            cullFace: false,  // DoubleSide
            ...opts,
        });
    }

    _emptyTextureCache = null;
    _emptyTexture() {
        if (!this._emptyTextureCache) {
            this._emptyTextureCache = new Texture(this.gl, {
                image: new Uint8Array([255, 255, 255, 255]),
                width: 1,
                height: 1,
                generateMipmaps: false,
            });
        }
        return this._emptyTextureCache;
    }

    /**
     * Create a single OGL Geometry from mesh data.
     */
    createGeometry(mesh, lod) {
        if (!mesh.polygonIndices || mesh.polygonIndices.length === 0) {
            return null;
        }

        const hasTexture = mesh.textureIndices && mesh.textureIndices.length > 0;

        const vertexIndicesPacked = [];
        for (const poly of mesh.polygonIndices) {
            vertexIndicesPacked.push(poly.a, poly.b, poly.c);
        }

        const textureIndicesFlat = [];
        if (hasTexture) {
            for (const texPoly of mesh.textureIndices) {
                textureIndicesFlat.push(texPoly.a, texPoly.b, texPoly.c);
            }
        }

        const meshVertices = [];
        const meshNormals = [];
        const meshUvs = [];
        const indices = [];
        let vertexCount = 0;

        for (let i = 0; i < vertexIndicesPacked.length; i++) {
            const packed = vertexIndicesPacked[i];

            if ((packed & 0x80000000) !== 0) {
                indices.push(vertexCount++);

                const gv = packed & 0xFFFF;
                const v = lod.vertices[gv] || { x: 0, y: 0, z: 0 };
                meshVertices.push(-v.x, v.y, v.z);

                const gn = (packed >>> 16) & 0x7fff;
                const n = lod.normals[gn] || { x: 0, y: 1, z: 0 };
                meshNormals.push(-n.x, n.y, n.z);

                if (hasTexture && lod.textureVertices && lod.textureVertices.length > 0) {
                    const tex = textureIndicesFlat[i];
                    const uv = lod.textureVertices[tex] || { u: 0, v: 0 };
                    meshUvs.push(uv.u, 1 - uv.v);
                }
            } else {
                indices.push(packed & 0xFFFF);
            }
        }

        // Reverse face winding
        for (let i = 0; i < indices.length; i += 3) {
            const temp = indices[i];
            indices[i] = indices[i + 2];
            indices[i + 2] = temp;
        }

        const attrs = {
            position: { size: 3, data: new Float32Array(meshVertices) },
            normal: { size: 3, data: new Float32Array(meshNormals) },
            index: { data: new Uint32Array(indices) },
        };

        if (hasTexture && meshUvs.length > 0) {
            attrs.uv = { size: 2, data: new Float32Array(meshUvs) };
        } else {
            // OGL requires all shader attributes present; provide zeroed UVs
            attrs.uv = { size: 2, data: new Float32Array(vertexCount * 2) };
        }

        return new Geometry(this.gl, attrs);
    }

    /**
     * Expand axis-aligned bounding box with vertices from a Transform hierarchy.
     * Vertices are transformed to world space before comparison.
     */
    expandBounds(transform, min, max) {
        transform.traverse((node) => {
            if (!(node instanceof Mesh) || !node.geometry) return;
            const posAttr = node.geometry.attributes.position;
            if (!posAttr) return;

            const data = posAttr.data;
            const wm = node.worldMatrix;

            for (let i = 0; i < data.length; i += 3) {
                const x = data[i], y = data[i + 1], z = data[i + 2];
                const wx = wm[0] * x + wm[4] * y + wm[8] * z + wm[12];
                const wy = wm[1] * x + wm[5] * y + wm[9] * z + wm[13];
                const wz = wm[2] * x + wm[6] * y + wm[10] * z + wm[14];

                if (wx < min[0]) min[0] = wx;
                if (wy < min[1]) min[1] = wy;
                if (wz < min[2]) min[2] = wz;
                if (wx > max[0]) max[0] = wx;
                if (wy > max[1]) max[1] = wy;
                if (wz > max[2]) max[2] = wz;
            }
        });
    }

    /**
     * Compute axis-aligned bounding box of a Transform hierarchy.
     * Returns { min: Vec3, max: Vec3, center: Vec3, size: Vec3 }.
     */
    computeBoundingBox(transform) {
        const min = new Vec3(Infinity, Infinity, Infinity);
        const max = new Vec3(-Infinity, -Infinity, -Infinity);

        transform.updateMatrixWorld(true);
        this.expandBounds(transform, min, max);

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
        return { min, max, center, size };
    }

    centerAndScaleModel(scaleFactor) {
        if (!this.modelGroup) return;

        const { center, size } = this.computeBoundingBox(this.modelGroup);

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

    // ─── Shared Character/Prop Assembly ─────────────────────────────

    /**
     * Assemble the default 10-part character model for a given actor index.
     * Uses default part/name indices (no character state customization).
     *
     * Shared by ScenePlayerRenderer (scene character assembly) and ActorRenderer
     * (character preview with customization via resolvePartName/resolveNameValue overrides).
     *
     * @param {number} characterIndex - Index into ActorInfoInit
     * @param {Map} globalPartsMap - From buildGlobalPartsMap()
     * @returns {Array<[string, Transform]>} Pairs of [partName, transformGroup]
     */
    assembleCharacterParts(characterIndex, globalPartsMap) {
        const actorInfo = ActorInfoInit[characterIndex];
        const result = [];

        for (let i = 0; i < 10; i++) {
            const actorLOD = ActorLODs[i + 1];
            const part = actorInfo.parts[i];

            // Resolve the geometry part name
            let partName;
            if (i === 0 || i === 1) {
                if (!part.partNameIndices || !part.partNames) continue;
                partName = part.partNames[part.partNameIndices[part.partNameIndex]];
            } else {
                partName = actorLOD.parentName;
            }
            if (!partName) continue;

            const partData = globalPartsMap.get(partName.toLowerCase());
            if (!partData) continue;

            const partGroup = new Transform();
            const groupName = `part_${actorLOD.name}`;
            partGroup.name = groupName;

            // Resolve the texture/color name (default index, no charState)
            let resolvedName = null;
            if (part.nameIndices && part.names) {
                resolvedName = part.names[part.nameIndices[part.nameIndex]];
            }

            const lods = partData.lods || [];
            if (lods.length > 0) {
                this.createPartMeshes(lods[lods.length - 1], actorLOD, part, resolvedName, i, partGroup);
            }

            // Apply LOD position offset with X-negation for coordinate system conversion
            partGroup.position.set(-actorLOD.position[0], actorLOD.position[1], actorLOD.position[2]);

            result.push([groupName, partGroup]);
        }

        return result;
    }

    /**
     * Create meshes for one character part, selecting the appropriate
     * texture or color program based on LOD flags.
     *
     * Mirrors the rendering portion of ActorRenderer's original createPartMeshes.
     *
     * @param {object} lod - LOD data with meshes, vertices, normals, etc.
     * @param {object} actorLOD - ActorLODs entry with flags
     * @param {object} part - ActorInfoInit part entry
     * @param {string|null} resolvedName - Texture or color name to use
     * @param {number} partIdx - Part index (0-9)
     * @param {Transform} group - Parent transform to add meshes to
     */
    createPartMeshes(lod, actorLOD, part, resolvedName, partIdx, group) {
        const useTexture = (actorLOD.flags & ActorLODFlags.USE_TEXTURE) !== 0;
        const useColor = (actorLOD.flags & ActorLODFlags.USE_COLOR) !== 0;

        const bodyUsesDefaultGeom = partIdx === 0 && part.partNameIndices &&
            part.partNameIndices[part.partNameIndex] === 0;

        let partColor = null;
        let partTexture = null;

        if (useTexture && !bodyUsesDefaultGeom) {
            const texName = resolvedName?.toLowerCase();
            if (texName && this.textures.has(texName)) {
                partTexture = this.textures.get(texName);
            }
        }

        if ((useColor || bodyUsesDefaultGeom) && !partTexture) {
            const colorEntry = LegoColors[resolvedName] || LegoColors['lego white'];
            if (colorEntry) {
                partColor = [colorEntry.r / 255, colorEntry.g / 255, colorEntry.b / 255];
            }
        }

        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;

            // Check for mesh-level texture
            let meshTexture = null;
            const meshTexName = mesh.properties?.textureName?.toLowerCase();
            if (meshTexName && this.textures.has(meshTexName)) {
                meshTexture = this.textures.get(meshTexName);
            }

            let program;
            if (partTexture && mesh.properties?.textureName) {
                program = this.createTexturedProgram(partTexture);
            } else if (meshTexture) {
                program = this.createTexturedProgram(meshTexture);
            } else if (partColor) {
                program = this.createColoredProgram(partColor);
            } else {
                // Fallback: material alias color or mesh default color
                let color = null;
                if (mesh.properties?.useAlias && mesh.properties?.materialName) {
                    const alias = LegoColors[mesh.properties.materialName.toLowerCase()];
                    if (alias) color = [alias.r / 255, alias.g / 255, alias.b / 255];
                }
                if (!color) {
                    const meshColor = mesh.properties?.color || { r: 128, g: 128, b: 128 };
                    color = [meshColor.r / 255, meshColor.g / 255, meshColor.b / 255];
                }
                program = this.createColoredProgram(color);
            }

            group.addChild(new Mesh(this.gl, { geometry, program }));
        }
    }

    /**
     * Assemble a hierarchical prop model from WDB data.
     * Searches all worlds for a matching model name, parses its model data,
     * and builds a Transform tree with meshes.
     *
     * @param {string} name - Lowercased model name to search for
     * @param {object} parser - WDB parser instance
     * @param {object} wdb - Parsed WDB data
     * @param {Map} worldPartsMaps - Cache of per-world parts maps
     * @param {Map} [globalPartsMap] - Global parts map (fallback)
     * @returns {Transform|null}
     */
    assemblePropHierarchical(name, parser, wdb, worldPartsMaps, globalPartsMap) {
        for (const world of wdb.worlds || []) {
            for (const model of world.models || []) {
                if (model.name.toLowerCase() !== name) continue;
                try {
                    const modelData = parser.parseModelData(model.dataOffset);
                    if (!modelData?.roi) continue;

                    if (modelData.textures) {
                        this.loadTextures(modelData.textures, false);
                    }

                    let worldPartsMap = worldPartsMaps.get(world.name);
                    if (!worldPartsMap) {
                        worldPartsMap = buildPartsMap(parser, world.parts);
                        worldPartsMaps.set(world.name, worldPartsMap);
                    }

                    return this.buildROITree(modelData.roi, worldPartsMap);
                } catch (e) {
                    console.warn(`[BaseRenderer] Prop error (${name}):`, e);
                }
            }
        }

        // Fallback: check global parts
        if (globalPartsMap) {
            const part = globalPartsMap.get(name);
            if (part?.lods?.length) {
                const group = new Transform();
                group.name = name;
                this.addLodMeshes(part.lods, group);
                return group.children.length ? group : null;
            }
        }

        return null;
    }

    /**
     * Recursively build a Transform hierarchy from ROI data with resolved LODs.
     *
     * @param {object} roi - ROI node with name, children, and LOD references
     * @param {Map} partsMap - Parts map for resolving LODs
     * @returns {Transform}
     */
    buildROITree(roi, partsMap) {
        const group = new Transform();
        group.name = roi.name.toLowerCase();
        this.addLodMeshes(resolveLods(roi, partsMap), group);

        for (const child of roi.children || []) {
            const childGroup = this.buildROITree(child, partsMap);
            if (childGroup) group.addChild(childGroup);
        }
        return group;
    }

    /**
     * Create meshes from the highest-detail LOD and add them to a group.
     *
     * @param {Array} lods - Array of LOD data
     * @param {Transform} group - Parent transform
     */
    addLodMeshes(lods, group) {
        if (!lods?.length) return;
        const lod = lods[lods.length - 1];
        for (const mesh of lod.meshes) {
            const geometry = this.createGeometry(mesh, lod);
            if (!geometry) continue;
            group.addChild(new Mesh(this.gl, { geometry, program: this.createMeshProgram(mesh) }));
        }
    }

    /**
     * Find a character index by name (case-insensitive).
     * @param {string} name - Lowercased character name
     * @returns {number} Index into ActorInfoInit, or -1 if not found
     */
    findCharacterIndex(name) {
        for (let i = 0; i < ActorInfoInit.length; i++) {
            if (ActorInfoInit[i].name.toLowerCase() === name) return i;
        }
        return -1;
    }

    clearModel() {
        if (this.modelGroup) {
            this.modelGroup.traverse((child) => {
                if (child.geometry) child.geometry.remove();
                if (child.program) child.program.remove();
            });
            this.scene.removeChild(this.modelGroup);
            this.modelGroup = null;
        }

        for (const texture of this.textures.values()) {
            this.gl.deleteTexture(texture.texture);
        }
        this.textures.clear();
    }

    start() {
        this.animating = true;
        this.animate();
    }

    stop() {
        this.animating = false;
    }

    animate = () => {
        if (!this.animating) return;
        requestAnimationFrame(this.animate);

        this.updateAnimation();

        this.glRenderer.render({ scene: this.scene, camera: this.camera });
    }

    /**
     * Override in subclasses for custom animation logic.
     */
    updateAnimation() {
        this.controls?.update();
    }

    resize(width, height) {
        this.camera.perspective({ aspect: width / height });
        this.glRenderer.setSize(width, height);
    }

    dispose() {
        this.animating = false;
        if (this.controls) {
            this.controls.remove();
            this.canvas.removeEventListener('pointerdown', this._onPointerDown);
            this.canvas.removeEventListener('pointermove', this._onPointerMove);
            this.canvas.removeEventListener('pointerup', this._onPointerUp);
            this.canvas.removeEventListener('click', this._onNativeClickCapture, true);
        }
        this.clearModel();
        if (this._emptyTextureCache) {
            this.gl.deleteTexture(this._emptyTextureCache.texture);
            this._emptyTextureCache = null;
        }
    }
}
