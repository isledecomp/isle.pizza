// Web Worker that renders building and actor thumbnails off the main thread.
// Uses OffscreenCanvas + OGL Renderer — no DOM required.
import { BuildingRenderer } from './rendering/BuildingRenderer.js';
import { ActorRenderer } from './rendering/ActorRenderer.js';
import { ActorInfoInit } from './savegame/actorConstants.js';
import { WdbParser, buildPartsMap, buildGlobalPartsMap, collectAllRois } from './formats/WdbParser.js';

const LOCATION_BUILDINGS = {
    'Bank': 'bank',
    'Beach': 'beach',
    'Gas Station': 'gas',
    'Hospital': 'medcntr',
    'Island': 'haus6',
    'Jail': 'jail',
    'Police Station': 'policsta',
    'Pizzeria': 'pizza',
    'Racetrack': 'races'
};

async function canvasToDataURL(canvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new FileReaderSync().readAsDataURL(blob);
}

async function renderBuildings(wdbParser, wdbData, globalTextures) {
    const neededModels = new Set(Object.values(LOCATION_BUILDINGS));
    const modelsMap = new Map();

    for (const world of wdbData.worlds) {
        let worldPartsMap = null;
        for (const model of world.models) {
            const modelKey = model.name.toLowerCase();
            if (!neededModels.has(modelKey) || modelsMap.has(modelKey)) continue;

            const modelData = wdbParser.parseModelData(model.dataOffset);
            if (!modelData.roi) continue;

            if (!worldPartsMap) {
                worldPartsMap = buildPartsMap(wdbParser, world.parts);
            }

            const rois = collectAllRois(modelData.roi, worldPartsMap);

            if (rois.length > 0) {
                modelsMap.set(modelKey, {
                    rois,
                    textures: [...globalTextures, ...(modelData.textures || [])]
                });
            }
        }
    }

    const canvas = new OffscreenCanvas(256, 256);
    const renderer = new BuildingRenderer(canvas, { preserveDrawingBuffer: true });

    const result = {};
    for (const [label, modelName] of Object.entries(LOCATION_BUILDINGS)) {
        const data = modelsMap.get(modelName);
        if (data) {
            renderer.loadBuilding(data.rois, data.textures);
            result[label] = await canvasToDataURL(canvas);
        }
    }

    renderer.dispose();
    return result;
}

async function renderActors(wdbData, globalTextures, actorIndices) {
    if (!actorIndices || actorIndices.length === 0) return {};

    const globalPartsMap = buildGlobalPartsMap(wdbData.globalParts);
    const defaultCharacters = new Array(ActorInfoInit.length).fill(null);

    const canvas = new OffscreenCanvas(256, 256);
    const renderer = new ActorRenderer(canvas, { preserveDrawingBuffer: true });
    renderer.skipAnimations = true;

    const result = {};
    for (const i of actorIndices) {
        try {
            renderer.loadActor(i, defaultCharacters, globalPartsMap, globalTextures, null, null, null);

            // Reposition camera to frame the head for a portrait thumbnail
            renderer.camera.position.set(0.6, 0.9, 1.2);
            renderer.camera.lookAt([0, 0.7, 0]);
            renderer.glRenderer.render({ scene: renderer.scene, camera: renderer.camera });

            result[i] = await canvasToDataURL(canvas);
        } catch (e) {
            // Skip actors that fail to render
        }
    }

    renderer.dispose();
    return result;
}

self.onmessage = async (e) => {
    try {
        const response = await fetch('/LEGO/data/WORLD.WDB');
        if (!response.ok) return;

        const buffer = await response.arrayBuffer();
        const wdbParser = new WdbParser(buffer);
        const wdbData = wdbParser.parse();

        const globalTextures = [
            ...(wdbData.globalTextures || []),
            ...(wdbData.globalParts?.textures || [])
        ];

        if (!e.data.skipBuildings) {
            const buildings = await renderBuildings(wdbParser, wdbData, globalTextures);
            self.postMessage({ type: 'buildings', thumbnails: buildings });
        }

        const actors = await renderActors(wdbData, globalTextures, e.data.actorIndices);
        self.postMessage({ type: 'actors', thumbnails: actors });
    } catch (e) {
        self.postMessage({ type: 'error', message: e.message });
    }
};
