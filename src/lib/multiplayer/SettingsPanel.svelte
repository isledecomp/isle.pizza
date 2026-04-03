<script>
    import ShareButton from './ShareButton.svelte';

    export let settingsItems = [];
    export let settingsState = {};
    export let shareFeedback = '';
    export let onShare;
</script>

<div class="settings">
    {#each settingsItems as item}
        <button class="setting-row" onclick={item.toggle}>
            <svg class="setting-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                {@html item.icon}
            </svg>
            <span class="setting-label">{item.label}</span>
            <span class="toggle-switch" class:on={settingsState[item.key]}>
                <span class="toggle-knob"></span>
            </span>
        </button>
    {/each}
    <div class="setting-divider"></div>
    <ShareButton {shareFeedback} {onShare} />
</div>

<style>
    .settings {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .setting-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        text-align: left;
        font-family: inherit;
        box-sizing: border-box;
        outline: none;
    }

    @media (hover: hover) {
        .setting-row:hover {
            background: rgba(255, 255, 255, 0.07);
        }

        .setting-row:active {
            background: rgba(255, 255, 255, 0.1);
        }
    }

    .setting-icon {
        flex-shrink: 0;
        color: var(--color-text-muted);
    }

    .setting-label {
        flex: 1;
        color: var(--color-text-light);
        font-size: 0.8em;
    }

    .setting-divider {
        flex: 1;
        min-height: 4px;
    }

    .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
        border-radius: 24px;
        background: var(--color-border-dark);
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }

    .toggle-switch.on {
        background-color: #3a5f3a;
    }

    .toggle-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-text-muted);
        transition: all 0.2s ease;
    }

    .toggle-switch.on .toggle-knob {
        left: 23px;
        background: var(--color-primary);
    }
</style>
