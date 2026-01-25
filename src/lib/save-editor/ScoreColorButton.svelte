<script>
    import { ScoreColor, ScoreColorCSS, ScoreColorNames } from '../../core/savegame/constants.js';

    export let color = 0;
    export let onChange = () => {};
    export let title = '';
    export let isHighScore = false;

    function handleClick() {
        // Cycle through colors: 0 -> 1 -> 2 -> 3 -> 0
        const nextColor = (color + 1) % 4;
        onChange(nextColor);
    }

    $: colorName = ScoreColorNames[color] || 'Unknown';
    $: bgColor = ScoreColorCSS[color] || '#808080';
    $: tooltipText = title ? `${title}: ${colorName}` : colorName;
</script>

<button
    class="score-color-button"
    class:high-score={isHighScore}
    style="background-color: {bgColor}"
    onclick={handleClick}
    title="{tooltipText} - Click to change"
    type="button"
>
    {#if isHighScore}
        <span class="high-score-indicator">H</span>
    {/if}
</button>

<style>
    .score-color-button {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .score-color-button:hover {
        transform: scale(1.15);
        border-color: rgba(255, 255, 255, 0.6);
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    .score-color-button:active {
        transform: scale(0.95);
    }

    .high-score-indicator {
        font-size: 10px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.6);
        text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
    }
</style>
