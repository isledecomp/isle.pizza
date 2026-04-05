<script>
    export let options = [];
    export let selected = 0;
    export let onSelect;
</script>

<div class="style-grid">
    {#each options as opt, i}
        <button class="style-btn" class:selected={selected === i}
            onclick={() => onSelect(i)}>
            <span class="style-emoji">{opt.emoji}</span>
            <span class="style-label">{opt.label}</span>
        </button>
    {/each}
</div>

<style>
    .style-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
    }

    .style-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 4px;
        height: 56px;
        min-width: 0;
        overflow: hidden;
        background: var(--color-surface-subtle);
        border: 1.5px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
        box-sizing: border-box;
        outline: none;
    }

    @media (hover: hover) {
        .style-btn:hover {
            background: var(--color-surface-hover);
        }
    }

    .style-btn:active {
        transform: scale(0.95);
    }

    .style-btn.selected {
        background: var(--color-primary-surface);
        border-color: var(--color-primary);
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.1);
    }

    .style-emoji {
        font-size: 22px;
        line-height: 1;
    }

    .style-label {
        font-size: 0.7em;
        color: var(--color-text-muted);
        line-height: 1;
    }

    .style-btn.selected .style-label {
        color: var(--color-primary);
    }
</style>
