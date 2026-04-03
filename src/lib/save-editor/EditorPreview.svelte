<script>
    import { onMount } from 'svelte';
    import NavButton from '../NavButton.svelte';
    import ResetButton from '../ResetButton.svelte';
    import EditorTooltip from '../EditorTooltip.svelte';
    import './editor-common.css';

    export let tooltipText;
    export let onResetCamera = () => {};
    export let onCanvasReady = () => {};
    export let loading = true;
    export let error = null;
    export let secondaryError = null;
    export let onCanvasClick = () => {};
    export let canvasLabel = '';
    export let onPrev = () => {};
    export let onNext = () => {};
    export let indexDisplay = '';
    export let nameDisplay = '';
    export let showReset = false;
    export let onReset = () => {};

    let canvas;

    onMount(() => {
        if (canvas) onCanvasReady(canvas);
    });
</script>

<EditorTooltip text={tooltipText} {onResetCamera}>
    <div class="preview-container">
        <canvas
            bind:this={canvas}
            width="285"
            height="285"
            class:hidden={loading || error}
            onclick={onCanvasClick}
            role="button"
            tabindex="0"
            aria-label={canvasLabel}
        ></canvas>

        {#if loading}
            <div class="preview-overlay">
                <div class="spinner"></div>
            </div>
        {:else if error}
            <div class="preview-overlay error">{error}</div>
        {:else if secondaryError}
            <div class="preview-overlay error">{secondaryError}</div>
        {/if}
    </div>

    <div class="part-nav-wrapper">
        <div class="part-nav">
            <NavButton direction="left" onclick={onPrev} />
            <div class="part-info">
                <span class="nav-index">{indexDisplay}</span>
                <span class="nav-name">{nameDisplay}</span>
            </div>
            <NavButton direction="right" onclick={onNext} />
        </div>
        <slot name="side-buttons" />
    </div>

    <div class="reset-container">
        {#if showReset}
            <ResetButton onclick={onReset} />
        {/if}
    </div>
</EditorTooltip>
