<script>
    export let emoji;
    export let label;
    export let active = false;
    export let onclick;
</script>

<button class="emote-btn" class:active onclick={onclick} title={label}>
    <span class="emote-emoji" class:bounce={active}>{emoji}</span>
    <span class="emote-label">{label}</span>
</button>

<style>
    .emote-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        background: var(--color-surface-subtle);
        border: 1.5px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 6px 4px;
        font-family: inherit;
        box-sizing: border-box;
        outline: none;
    }

    @media (hover: hover) {
        .emote-btn:hover {
            background: var(--color-surface-hover);
        }
    }

    .emote-btn:active, .emote-btn.active {
        background: rgba(255, 215, 0, 0.25);
        border-color: var(--color-primary);
        transform: scale(0.95);
    }

    .emote-emoji {
        font-size: 22px;
        line-height: 1;
    }

    .emote-emoji.bounce {
        animation: emote-bounce 0.3s ease;
    }

    @keyframes emote-bounce {
        0% { transform: scale(1); }
        30% { transform: scale(0.85); }
        60% { transform: scale(1.15); }
        100% { transform: scale(1); }
    }

    .emote-label {
        font-size: 0.65em;
        color: var(--color-text-muted);
        line-height: 1;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

</style>
