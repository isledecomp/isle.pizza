<script>
    import { parseBackgroundColor, formatBackgroundColor, hsvToHex } from '../../core/savegame/colorUtils.js';

    export let slot;
    export let onUpdate = () => {};

    // Default sky color values
    const DEFAULT_HUE = 56;
    const DEFAULT_SATURATION = 54;
    const DEFAULT_BRIGHTNESS = 68;

    // Get initial HSV from slot's backgroundcolor variable
    $: bgVar = slot?.variables?.get('backgroundcolor');
    $: initialHsv = bgVar ? parseBackgroundColor(bgVar.value) : { h: DEFAULT_HUE, s: DEFAULT_SATURATION, v: DEFAULT_BRIGHTNESS };

    // Local state for sliders
    let hue = DEFAULT_HUE;
    let saturation = DEFAULT_SATURATION;
    let brightness = DEFAULT_BRIGHTNESS;
    let initialized = false;

    // Initialize from slot data when it becomes available
    $: if (initialHsv && !initialized) {
        hue = initialHsv.h;
        saturation = initialHsv.s;
        brightness = initialHsv.v;
        initialized = true;
    }

    // Reset initialized flag when slot changes
    $: if (slot?.slotNumber !== undefined) {
        initialized = false;
    }

    // Computed preview color
    $: previewColor = hsvToHex(hue, saturation, brightness);

    function handleChange() {
        onUpdate({
            variable: {
                name: 'backgroundcolor',
                value: formatBackgroundColor(hue, saturation, brightness)
            }
        });
    }

    function handleReset() {
        hue = DEFAULT_HUE;
        saturation = DEFAULT_SATURATION;
        brightness = DEFAULT_BRIGHTNESS;
        handleChange();
    }

    $: isDefault = hue === DEFAULT_HUE && saturation === DEFAULT_SATURATION && brightness === DEFAULT_BRIGHTNESS;
</script>

<div class="sky-color-editor">
    <div class="editor-content">
        <div class="color-preview" style="background-color: {previewColor}"></div>
        <div class="sliders">
            <label class="slider-row">
                <span class="slider-label">Hue</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    bind:value={hue}
                    onchange={handleChange}
                    class="slider hue-slider"
                />
                <span class="slider-value">{hue}</span>
            </label>
            <label class="slider-row">
                <span class="slider-label">Saturation</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    bind:value={saturation}
                    onchange={handleChange}
                    class="slider"
                />
                <span class="slider-value">{saturation}</span>
            </label>
            <label class="slider-row">
                <span class="slider-label">Brightness</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    bind:value={brightness}
                    onchange={handleChange}
                    class="slider"
                />
                <span class="slider-value">{brightness}</span>
            </label>
        </div>
    </div>
    <p class="color-hint">Changes the sky/background color in the game.</p>
    {#if !isDefault}
        <button type="button" class="reset-btn" onclick={handleReset}>Reset to default</button>
    {/if}
</div>

<style>
    .sky-color-editor {
        padding-top: 4px;
    }

    .editor-content {
        display: flex;
        gap: 16px;
        align-items: flex-start;
    }

    .color-preview {
        width: 60px;
        height: 60px;
        border-radius: 6px;
        border: 2px solid var(--color-border-medium);
        flex-shrink: 0;
    }

    .sliders {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
    }

    .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .slider-label {
        width: 70px;
        font-size: 0.85em;
        color: var(--color-text-muted);
        flex-shrink: 0;
    }

    .slider {
        flex: 1;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: var(--color-bg-input);
        border-radius: 3px;
        outline: none;
        min-width: 0;
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        border: 2px solid var(--color-bg-dark);
    }

    .slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        border: 2px solid var(--color-bg-dark);
    }

    .hue-slider {
        background: linear-gradient(to right,
            hsl(0, 70%, 50%),
            hsl(60, 70%, 50%),
            hsl(120, 70%, 50%),
            hsl(180, 70%, 50%),
            hsl(240, 70%, 50%),
            hsl(300, 70%, 50%),
            hsl(360, 70%, 50%)
        );
    }

    .slider-value {
        width: 28px;
        text-align: right;
        font-size: 0.85em;
        color: var(--color-text-light);
        font-family: monospace;
        flex-shrink: 0;
    }

    .color-hint {
        margin: 10px 0 0 0;
        font-size: 0.8em;
        color: var(--color-text-muted);
    }

    .reset-btn {
        display: block;
        margin-top: 8px;
        font-size: 0.8em;
        color: var(--color-text-muted);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        text-decoration: underline;
    }

    .reset-btn:hover {
        color: var(--color-text-light);
    }

    @media (max-width: 400px) {
        .editor-content {
            flex-direction: column;
            align-items: stretch;
        }

        .color-preview {
            width: 100%;
            height: 40px;
        }

        .slider-label {
            width: 60px;
            font-size: 0.8em;
        }
    }
</style>
