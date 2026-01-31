import { BinaryReader } from './BinaryReader.js';

/**
 * Parser for LEGO Island WORLD.WDB files
 * Based on wdb.ksy specification and source code analysis
 */
export class WdbParser {
    constructor(buffer) {
        this.reader = new BinaryReader(buffer);
        this.buffer = buffer;
    }

    /**
     * Parse the WDB file structure
     * @returns {{ worlds: Array, globalTexturesSize: number, globalPartsSize: number }}
     */
    parse() {
        const numWorlds = this.reader.readS32();
        const worlds = [];

        for (let i = 0; i < numWorlds; i++) {
            worlds.push(this.parseWorldEntry());
        }

        const globalTexturesSize = this.reader.readU32();
        // Skip global textures for now - BIGCUBE.GIF is in model_data
        this.reader.skip(globalTexturesSize);

        const globalPartsSize = this.reader.readU32();
        // Skip global parts
        this.reader.skip(globalPartsSize);

        return { worlds, globalTexturesSize, globalPartsSize };
    }

    parseWorldEntry() {
        const nameLen = this.reader.readS32();
        const name = this.reader.readString(nameLen).replace(/\0/g, '');

        // Parse parts (skip for now)
        const numParts = this.reader.readS32();
        for (let i = 0; i < numParts; i++) {
            this.skipPartReference();
        }

        // Parse models
        const numModels = this.reader.readS32();
        const models = [];
        for (let i = 0; i < numModels; i++) {
            models.push(this.parseModelEntry());
        }

        return { name, numParts, models };
    }

    skipPartReference() {
        const nameLen = this.reader.readU32();
        this.reader.skip(nameLen); // name
        this.reader.skip(4); // data_length
        this.reader.skip(4); // data_offset
    }

    parseModelEntry() {
        const nameLen = this.reader.readU32();
        const name = this.reader.readString(nameLen).replace(/\0/g, '');
        const dataLength = this.reader.readU32();
        const dataOffset = this.reader.readU32();
        const presenterLen = this.reader.readU32();
        const presenter = this.reader.readString(presenterLen).replace(/\0/g, '');
        const location = this.readVertex3();
        const direction = this.readVertex3();
        const up = this.readVertex3();
        const visible = this.reader.readU8();

        return { name, dataLength, dataOffset, presenter, location, direction, up, visible };
    }

    readVertex3() {
        return {
            x: this.reader.readF32(),
            y: this.reader.readF32(),
            z: this.reader.readF32()
        };
    }

    /**
     * Read string and strip null terminators
     */
    readCleanString(length) {
        return this.reader.readString(length).replace(/\0/g, '');
    }

    /**
     * Parse model_data blob at specified offset
     * @param {number} offset - Absolute file offset
     * @returns {{ version: number, anim: object, roi: object, textures: Array }}
     */
    parseModelData(offset) {
        this.reader.seek(offset);

        const version = this.reader.readU32();
        if (version !== 19) {
            throw new Error(`Unexpected model version: ${version}, expected 19`);
        }

        const textureInfoOffset = this.reader.readU32();
        const numRois = this.reader.readU32();

        // Parse animation data
        const anim = this.parseModelAnim();

        // Parse ROI hierarchy
        const roi = this.parseRoi();

        // Parse textures at textureInfoOffset
        this.reader.seek(offset + textureInfoOffset);
        const textures = this.parseTextureInfo();

        return { version, anim, roi, textures };
    }

    parseModelAnim() {
        const numActors = this.reader.readU32();
        const actors = [];

        for (let i = 0; i < numActors; i++) {
            const nameLen = this.reader.readU32();
            if (nameLen > 0) {
                const name = this.readCleanString(nameLen);
                const actorType = this.reader.readU32();
                actors.push({ name, actorType });
            }
        }

        const duration = this.reader.readS32();
        const rootNode = this.parseAnimTreeNode();

        return { actors, duration, rootNode };
    }

    parseAnimTreeNode() {
        const data = this.parseAnimNodeData();
        const numChildren = this.reader.readU32();
        const children = [];

        for (let i = 0; i < numChildren; i++) {
            children.push(this.parseAnimTreeNode());
        }

        return { data, children };
    }

    parseAnimNodeData() {
        const nameLen = this.reader.readU32();
        const name = nameLen > 0 ? this.readCleanString(nameLen) : '';

        // Translation keys
        const numTranslationKeys = this.reader.readU16();
        const translationKeys = [];
        for (let i = 0; i < numTranslationKeys; i++) {
            translationKeys.push(this.parseTranslationKey());
        }

        // Rotation keys
        const numRotationKeys = this.reader.readU16();
        const rotationKeys = [];
        for (let i = 0; i < numRotationKeys; i++) {
            rotationKeys.push(this.parseRotationKey());
        }

        // Scale keys
        const numScaleKeys = this.reader.readU16();
        const scaleKeys = [];
        for (let i = 0; i < numScaleKeys; i++) {
            scaleKeys.push(this.parseScaleKey());
        }

        // Morph keys
        const numMorphKeys = this.reader.readU16();
        const morphKeys = [];
        for (let i = 0; i < numMorphKeys; i++) {
            morphKeys.push(this.parseMorphKey());
        }

        return { name, translationKeys, rotationKeys, scaleKeys, morphKeys };
    }

    parseAnimKey() {
        const timeAndFlags = this.reader.readS32();
        const time = timeAndFlags & 0xFFFFFF;
        const flags = (timeAndFlags >> 24) & 0xFF;
        return { time, flags };
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
        const angle = this.reader.readF32(); // w component
        const x = this.reader.readF32();
        const y = this.reader.readF32();
        const z = this.reader.readF32();
        return { ...key, angle, x, y, z };
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
        return { ...key, visible };
    }

    parseRoi() {
        const nameLen = this.reader.readU32();
        const name = this.reader.readString(nameLen).replace(/\0/g, '');

        // Bounding sphere
        const boundingSphere = {
            center: this.readVertex3(),
            radius: this.reader.readF32()
        };

        // Bounding box
        const boundingBox = {
            min: this.readVertex3(),
            max: this.readVertex3()
        };

        // Texture name (for color/material reference)
        const textureNameLen = this.reader.readU32();
        const textureName = textureNameLen > 0 ? this.readCleanString(textureNameLen) : null;

        // Shared LOD list flag
        const sharedLodList = this.reader.readU8();

        let lods = [];
        if (sharedLodList === 0) {
            const numLods = this.reader.readU32();
            if (numLods > 0) {
                const nextRoiOffset = this.reader.readU32();
                for (let i = 0; i < numLods; i++) {
                    lods.push(this.parseLod());
                }
            }
        }

        // Children
        const numChildren = this.reader.readU32();
        const children = [];
        for (let i = 0; i < numChildren; i++) {
            children.push(this.parseRoi());
        }

        return { name, boundingSphere, boundingBox, textureName, lods, children };
    }

    parseLod() {
        const flags = this.reader.readU32();
        const numMeshes = this.reader.readU32();

        if (numMeshes === 0) {
            return { flags, numMeshes, vertices: [], normals: [], textureVertices: [], meshes: [] };
        }

        // Packed vertex/normal counts
        const vertexNormalCounts = this.reader.readU32();
        const vertexCount = vertexNormalCounts & 0xFFFF;
        const normalCount = (vertexNormalCounts >> 17) & 0x7FFF;

        const numTextureVertices = this.reader.readS32();

        // Read vertices
        const vertices = [];
        for (let i = 0; i < vertexCount; i++) {
            vertices.push(this.readVertex3());
        }

        // Read normals
        const normals = [];
        for (let i = 0; i < normalCount; i++) {
            normals.push(this.readVertex3());
        }

        // Read texture vertices (UVs)
        const textureVertices = [];
        for (let i = 0; i < numTextureVertices; i++) {
            textureVertices.push({
                u: this.reader.readF32(),
                v: this.reader.readF32()
            });
        }

        // Read meshes
        const meshes = [];
        for (let i = 0; i < numMeshes; i++) {
            meshes.push(this.parseMesh());
        }

        return { flags, numMeshes, vertexCount, normalCount, vertices, normals, textureVertices, meshes };
    }

    parseMesh() {
        const numPolygons = this.reader.readU16();
        const numVertices = this.reader.readU16();

        // Polygon indices (vertex/normal pairs)
        const polygonIndices = [];
        for (let i = 0; i < numPolygons; i++) {
            polygonIndices.push({
                a: this.reader.readU32(),
                b: this.reader.readU32(),
                c: this.reader.readU32()
            });
        }

        // Texture indices
        const numTextureIndices = this.reader.readU32();
        const textureIndices = [];
        if (numTextureIndices > 0) {
            for (let i = 0; i < numPolygons; i++) {
                textureIndices.push({
                    a: this.reader.readU32(),
                    b: this.reader.readU32(),
                    c: this.reader.readU32()
                });
            }
        }

        // Mesh properties
        const properties = this.parseMeshProperties();

        return { numPolygons, numVertices, polygonIndices, textureIndices, properties };
    }

    parseMeshProperties() {
        const color = {
            r: this.reader.readU8(),
            g: this.reader.readU8(),
            b: this.reader.readU8()
        };
        const alpha = this.reader.readF32();
        const shading = this.reader.readU8();
        const unknown0x0d = this.reader.readU8();
        const unknown0x20 = this.reader.readU8();
        const useAlias = this.reader.readU8();

        const textureNameLen = this.reader.readU32();
        const textureName = textureNameLen > 0 ? this.readCleanString(textureNameLen) : null;

        const materialNameLen = this.reader.readU32();
        const materialName = materialNameLen > 0 ? this.readCleanString(materialNameLen) : null;

        return { color, alpha, shading, useAlias, textureName, materialName };
    }

    parseTextureInfo() {
        const numTextures = this.reader.readU32();
        const skipTextures = this.reader.readU32();
        const textures = [];

        for (let i = 0; i < numTextures; i++) {
            const nameLen = this.reader.readU32();
            let name = this.readCleanString(nameLen).toLowerCase();

            // Handle '^' prefix (hi-res/lo-res pair)
            let hasHighRes = false;
            if (name.startsWith('^')) {
                name = name.substring(1);
                hasHighRes = true;
                // Read hi-res texture
                const hiRes = this.parseLegoImage();
                // Skip lo-res texture
                this.skipLegoImage();
                textures.push({ name, ...hiRes });
            } else {
                textures.push({ name, ...this.parseLegoImage() });
            }
        }

        return textures;
    }

    parseLegoImage() {
        const width = this.reader.readU32();
        const height = this.reader.readU32();
        const paletteSize = this.reader.readU32();

        const palette = [];
        for (let i = 0; i < paletteSize; i++) {
            palette.push({
                r: this.reader.readU8(),
                g: this.reader.readU8(),
                b: this.reader.readU8()
            });
        }

        const pixels = new Uint8Array(this.reader.slice(width * height));

        return { width, height, paletteSize, palette, pixels };
    }

    skipLegoImage() {
        const width = this.reader.readU32();
        const height = this.reader.readU32();
        const paletteSize = this.reader.readU32();
        this.reader.skip(paletteSize * 3); // palette
        this.reader.skip(width * height); // pixels
    }
}

/**
 * Helper to find an ROI by name in a hierarchy
 * @param {object} roi - Root ROI
 * @param {string} name - Name to find (case-insensitive)
 * @returns {object|null}
 */
export function findRoi(roi, name) {
    if (roi.name.toLowerCase() === name.toLowerCase()) {
        return roi;
    }
    for (const child of roi.children || []) {
        const found = findRoi(child, name);
        if (found) return found;
    }
    return null;
}
