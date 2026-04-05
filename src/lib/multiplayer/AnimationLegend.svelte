<script>
    export let onDismiss = () => {};
</script>

<div class="legend">
    <div class="legend-body">
        <div class="legend-header">
            <img class="legend-avatar" src="images/infoface.webp" alt="Infomaniac" />
            <span class="legend-intro">Animations are scenes you perform with other players. Completed ones are saved to <a href="#memories" target="_blank" class="legend-link">Nick Brick's Memories</a> &mdash; the progress bar tracks your area completion.</span>
        </div>

        <div class="legend-section desktop-only">
            <div class="legend-row">
                <span class="row-desc">Tabs: <strong>area</strong> = location scenes, <strong>act</strong> = character interactions.</span>
            </div>
        </div>

        <div class="legend-section">
            <div class="legend-row eligible-ex">
                <span class="row-bar eligible-bar"></span>
                <span class="row-desc"><strong>Green</strong> &mdash; You can start this</span>
            </div>
            <div class="legend-row joinable-ex">
                <span class="row-bar joinable-bar"></span>
                <span class="row-desc"><strong>Blue pulse</strong> &mdash; Someone started it, join in</span>
            </div>
            <div class="legend-row gathering-ex">
                <span class="row-bar gathering-bar"></span>
                <span class="row-desc"><strong>Yellow</strong> &mdash; You joined, waiting for others</span>
            </div>
            <div class="legend-divider"></div>
            <div class="legend-row">
                <span class="dots-example">
                    <span class="dot"></span>
                    <span class="dot filled"></span>
                </span>
                <span class="row-desc">Dots = roles. <span class="dot-filled-text">Green</span> = a player can fill it</span>
            </div>
            <div class="legend-row">
                <span class="checkmark">&#10003;</span>
                <span class="row-desc">You've completed this before</span>
            </div>
        </div>
    </div>

    <button class="dismiss-btn" onclick={onDismiss}>Got it!</button>
</div>

<style>
    .legend {
        padding: 8px 10px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        color: var(--color-text-muted);
        flex: 1;
        min-height: 0;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
    }

    .legend-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 0;
    }

    .legend-header {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 7px;
    }

    .legend-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
        border: 1.5px solid rgba(255, 215, 0, 0.25);
        flex-shrink: 0;
    }

    .legend-intro {
        font-size: 10px;
        font-weight: 600;
        line-height: 1.3;
    }

    .legend-link {
        color: var(--color-primary);
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    .legend-section {
        margin-bottom: 5px;
    }


    @media (max-width: 480px) {
        .legend {
            padding: 4px 10px;
        }

        .desktop-only {
            display: none;
        }
    }

    .legend-divider {
        height: 6px;
    }

    .legend-row {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 2px 0;
    }

    .row-bar {
        width: 3px;
        height: 14px;
        border-radius: 1px;
        flex-shrink: 0;
    }

    .eligible-bar { background: rgba(76, 175, 80, 0.7); }
    .joinable-bar { background: rgba(100, 181, 246, 0.85); }
    .gathering-bar { background: rgba(255, 193, 7, 0.75); }

    .joinable-ex {
        animation: legend-joinable-pulse 2s ease-in-out infinite;
    }

    @keyframes legend-joinable-pulse {
        0%, 100% { background: rgba(100, 181, 246, 0.04); }
        50% { background: rgba(100, 181, 246, 0.1); }
    }

    .row-desc {
        font-size: 10px;
        line-height: 1.3;
    }

    .row-desc strong {
        font-weight: 700;
    }

    .dots-example {
        display: flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .dot.filled {
        background: rgba(76, 175, 80, 0.7);
        border-color: rgba(76, 175, 80, 0.85);
    }

    .dot-filled-text {
        color: rgba(76, 175, 80, 0.85);
        font-weight: 600;
    }

    .checkmark {
        color: rgba(76, 175, 80, 0.7);
        font-size: 11px;
        flex-shrink: 0;
        width: 14px;
        text-align: center;
    }

    .dismiss-btn {
        display: block;
        width: 100%;
        margin-top: auto;
        padding: 6px 0;
        border: none;
        border-radius: 7px;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        font-size: 11px;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s ease;
        outline: none;
    }

    @media (hover: hover) {
        .dismiss-btn:hover {
            background: var(--color-surface-hover);
        }
    }
</style>
