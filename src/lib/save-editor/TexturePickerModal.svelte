<script>
    import { onMount } from 'svelte';
    import { quantizeImage, squareTexture } from '../../core/savegame/imageQuantizer.js';
    import { saveCustomTexture, listCustomTextures, deleteCustomTexture } from '../../core/savegame/textureStorage.js';
    import Carousel from '../Carousel.svelte';

    export let textureInfo;
    export let palette = null;
    export let defaults = null;
    export let onSelect = () => {};
    export let onClose = () => {};

    let defaultTextures = [];
    let customTextures = [];
    let fileInput;
    let activeTab = 'default';
    let selectedCustomId = null;

    // Dimensions from the first loaded default texture
    let targetWidth = 128;
    let targetHeight = 128;

    onMount(async () => {
        initDefaults();
        await loadCustomTextures();
    });

    function initDefaults() {
        const source = defaults || [];
        defaultTextures = source.map(tex => ({
            ...tex,
            dataUrl: textureToDataUrl(tex)
        }));
        if (defaultTextures.length > 0) {
            targetWidth = defaultTextures[0].width;
            targetHeight = defaultTextures[0].height;
        }
    }

    async function loadCustomTextures() {
        try {
            const stored = await listCustomTextures(textureInfo.textureName);
            customTextures = stored.map(tex => ({
                ...tex,
                dataUrl: textureToDataUrl(tex)
            }));
        } catch (e) {
            console.error('Failed to load custom textures:', e);
            customTextures = [];
        }
    }

    function textureToDataUrl(tex) {
        const canvas = document.createElement('canvas');
        canvas.width = tex.width;
        canvas.height = tex.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(tex.width, tex.height);

        for (let i = 0; i < tex.pixels.length; i++) {
            const colorIdx = tex.pixels[i];
            const color = tex.palette[colorIdx] || { r: 0, g: 0, b: 0 };
            imageData.data[i * 4 + 0] = color.r;
            imageData.data[i * 4 + 1] = color.g;
            imageData.data[i * 4 + 2] = color.b;
            imageData.data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }

    function selectDefault(tex) {
        onSelect({
            width: tex.width,
            height: tex.height,
            palette: tex.palette,
            pixels: tex.pixels,
            paletteSize: tex.palette.length
        });
    }

    function selectCustom(tex) {
        selectedCustomId = tex.id;
    }

    function applyCustom() {
        const tex = customTextures.find(t => t.id === selectedCustomId);
        if (!tex) return;
        onSelect({
            width: tex.width,
            height: tex.height,
            palette: tex.palette,
            pixels: tex.pixels,
            paletteSize: tex.paletteSize
        });
    }

    function handleUploadClick() {
        fileInput?.click();
    }

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Use the WDB palette (passed as prop) — this is the palette the game's
        // DirectDraw surface actually uses. Fall back to first default's palette.
        const targetPalette = palette || defaultTextures[0]?.palette;
        if (!targetPalette) return;

        const img = new Image();
        img.onload = async () => {
            const result = quantizeImage(img, targetWidth, targetHeight, targetPalette);
            const textureData = squareTexture({
                width: targetWidth,
                height: targetHeight,
                palette: result.palette,
                pixels: result.pixels,
                paletteSize: result.palette.length
            });

            // Persist to IndexedDB and refresh the carousel
            try {
                const id = await saveCustomTexture(textureData, textureInfo.textureName);
                await loadCustomTextures();
                selectedCustomId = id;
            } catch (e) {
                console.error('Failed to save custom texture:', e);
            }

            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);

        // Reset file input so re-uploading the same file triggers change
        e.target.value = '';
    }

    async function handleDelete() {
        if (!selectedCustomId) return;

        try {
            await deleteCustomTexture(selectedCustomId);
            selectedCustomId = null;
            await loadCustomTextures();
        } catch (e) {
            console.error('Failed to delete custom texture:', e);
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            onClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal-panel">
        <div class="modal-header">
            <span class="modal-title">Select Texture</span>
            <button type="button" class="modal-close" onclick={onClose}>&times;</button>
        </div>

        <div class="modal-tabs">
            <button
                type="button"
                class="config-tab-btn"
                class:active={activeTab === 'default'}
                onclick={() => activeTab = 'default'}
            >Default</button>
            <button
                type="button"
                class="config-tab-btn"
                class:active={activeTab === 'custom'}
                onclick={() => activeTab = 'custom'}
            >Custom</button>
        </div>

        <div class="modal-body">
            {#if activeTab === 'default'}
                    <div class="texture-grid">
                        {#each defaultTextures as tex}
                            <button
                                type="button"
                                class="texture-thumb"
                                onclick={() => selectDefault(tex)}
                                title={tex.name}
                            >
                                <img src={tex.dataUrl} alt={tex.name} />
                            </button>
                        {/each}
                    </div>
            {:else}
                {#if customTextures.length > 0}
                    <div class="custom-carousel">
                        <Carousel gap={8}>
                            {#each customTextures as tex}
                                <button
                                    type="button"
                                    class="texture-thumb carousel-item"
                                    class:selected={selectedCustomId === tex.id}
                                    onclick={() => selectCustom(tex)}
                                >
                                    <img src={tex.dataUrl} alt="Custom texture" />
                                </button>
                            {/each}
                        </Carousel>
                    </div>
                {:else}
                    <div class="empty-state">No custom textures yet</div>
                {/if}

                <input
                    type="file"
                    accept="image/*"
                    class="hidden-input"
                    bind:this={fileInput}
                    onchange={handleFileChange}
                />
                <button type="button" class="upload-btn" onclick={handleUploadClick}>
                    Upload Image
                </button>

                {#if selectedCustomId}
                    <div class="custom-actions">
                        <button type="button" class="apply-btn" onclick={applyCustom}>
                            Apply
                        </button>
                        <button type="button" class="delete-btn" onclick={handleDelete}>
                            Delete
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-panel {
        background: var(--color-bg-panel);
        border: 1px solid var(--color-border-medium);
        border-radius: 8px;
        max-width: 320px;
        width: 90%;
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid var(--color-border-dark);
    }

    .modal-title {
        color: var(--color-text-light);
        font-size: 0.9em;
        font-weight: bold;
    }

    .modal-close {
        background: none;
        border: none;
        color: var(--color-text-muted);
        font-size: 1.4em;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .modal-close:hover {
        color: var(--color-text-light);
    }

    .modal-tabs {
        display: flex;
        gap: 5px;
        border-bottom: 1px solid var(--color-border-dark);
        padding: 0 14px;
    }

    .modal-body {
        padding: 14px;
    }

    .texture-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;
    }

    .texture-thumb {
        background: var(--color-bg-input);
        border: 2px solid var(--color-border-medium);
        border-radius: 6px;
        padding: 4px;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .texture-thumb:hover {
        border-color: var(--color-primary);
    }

    .texture-thumb.selected {
        border-color: var(--color-primary);
        box-shadow: 0 0 6px var(--color-primary-glow);
    }

    .texture-thumb img {
        display: block;
        width: 100%;
        height: auto;
        image-rendering: pixelated;
    }

    .texture-thumb.carousel-item {
        flex: 0 0 80px;
    }

    .texture-thumb.carousel-item img {
        width: 80px;
        height: 80px;
    }

    .custom-carousel {
        margin-bottom: 12px;
    }

    .empty-state {
        color: var(--color-text-muted);
        font-size: 0.85em;
        text-align: center;
        padding: 20px 0;
    }

    .hidden-input {
        display: none;
    }

    .upload-btn {
        display: block;
        width: 100%;
        padding: 8px 0;
        font-size: 0.85em;
        font-family: inherit;
        color: var(--color-text-light);
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .upload-btn:hover {
        background: var(--gradient-hover);
        border-color: var(--color-border-light);
    }

    .custom-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .apply-btn {
        flex: 1;
        padding: 8px 0;
        font-size: 0.85em;
        font-family: inherit;
        color: var(--color-text-light);
        background: var(--gradient-panel);
        border: 1px solid var(--color-primary);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .apply-btn:hover {
        background: var(--gradient-hover);
        color: var(--color-primary);
    }

    .delete-btn {
        flex: 1;
        padding: 8px 0;
        font-size: 0.85em;
        font-family: inherit;
        color: var(--color-error, #e74c3c);
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .delete-btn:hover {
        border-color: var(--color-error, #e74c3c);
    }
</style>
