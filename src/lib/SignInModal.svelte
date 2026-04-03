<script>
    import { signInWithDiscord, signInAnonymously } from '../core/auth.js';
    import DiscordIcon from './icons/DiscordIcon.svelte';

    export let open = false;
    export let onClose = () => {};

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function handleKeydown(e) {
        if (open && e.key === 'Escape') {
            onClose();
        }
    }

    function handleDiscord() {
        onClose();
        signInWithDiscord();
    }

    async function handleGuest() {
        await signInAnonymously();
        onClose();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={handleBackdropClick}>
        <div class="modal-panel">
            <button class="modal-close" onclick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>

            <div class="modal-header">
                <img class="character-avatar" src="images/register.webp" alt="Infomaniac" />
                <h2>Sign in to LEGO Island</h2>
                <p>Keep everything synced across devices</p>
                <div class="benefits-chips">
                    <span class="benefit-chip">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 13V3h8v10H4z"/><path d="M7 3V1h2v2"/><path d="M6 6h4M6 8.5h4"/>
                        </svg>
                        Saves
                    </span>
                    <span class="benefit-chip">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Settings
                    </span>
                    <span class="benefit-chip">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="6" cy="6.5" r="3"/><circle cx="10.5" cy="9" r="3"/>
                        </svg>
                        Multiplayer
                    </span>
                    <span class="benefit-chip">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 1.5l1.8 3.7 4 .6-2.9 2.8.7 4L8 10.8l-3.6 1.8.7-4-2.9-2.8 4-.6z"/>
                        </svg>
                        Memories
                    </span>
                </div>
            </div>

            <div class="modal-body">
                <button class="provider-button discord" onclick={handleDiscord}>
                    <DiscordIcon fill="#fff" />
                    Continue with Discord
                </button>

                <div class="divider">
                    <span>or</span>
                </div>

                <button class="guest-button" onclick={handleGuest}>
                    Continue as Guest
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        backdrop-filter: blur(2px);
    }

    .modal-panel {
        position: relative;
        box-sizing: border-box;
        background: var(--color-bg-dark);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 32px 28px;
        width: 340px;
        max-width: calc(100vw - 48px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    }

    .modal-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
    }

    .modal-close:hover {
        color: rgba(255, 255, 255, 0.8);
    }

    .modal-header {
        text-align: center;
        margin-bottom: 24px;
    }

    .modal-header h2 {
        font-size: 20px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 6px;
    }

    .modal-header p {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.4);
        margin: 0;
    }

    .character-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
        margin: 0 auto 14px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(255, 215, 0, 0.25);
    }

    .benefits-chips {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 12px;
    }

    .benefit-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 3px 9px;
        background: rgba(255, 215, 0, 0.08);
        border: 1px solid rgba(255, 215, 0, 0.15);
        border-radius: 10px;
        font-size: 11px;
        color: rgba(255, 215, 0, 0.7);
        white-space: nowrap;
    }

    .benefit-chip svg {
        flex-shrink: 0;
        stroke: rgba(255, 215, 0, 0.6);
    }

    .modal-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .provider-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 11px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
    }

    .provider-button:hover {
        opacity: 0.9;
    }

    .provider-button:active {
        transform: scale(0.98);
    }

    .provider-button.discord {
        background: #5865F2;
        color: #fff;
    }

    .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 6px 0;
    }

    .divider::before,
    .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
    }

    .divider span {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
    }

    .guest-button {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 11px 16px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }

    .guest-button:hover {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7);
    }
</style>
