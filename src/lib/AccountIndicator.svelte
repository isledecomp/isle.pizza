<script>
    import { tick } from 'svelte';
    import { computePosition, flip, shift, offset } from '@floating-ui/dom';
    import { authSession, signInWithDiscord, signOut } from '../core/auth.js';
    import { clearLocalMemories } from '../core/memories.js';
    import { API_URL } from '../core/config.js';
    import { showToast } from '../core/toast.js';
    import { currentPage } from '../stores.js';
    import { navigateTo, navigateToMultiplayer, navigateToLatestMemories } from '../core/navigation.js';
    import SignInModal from './SignInModal.svelte';
    import DiscordIcon from './icons/DiscordIcon.svelte';

    let openMenu = null; // null | 'nav' | 'account'
    let showSignInModal = false;
    let showDeleteDialog = false;
    let deleteConfirmText = '';
    let deleting = false;

    let navButtonEl, navDropdownEl;
    let accountButtonEl, accountDropdownEl;

    const menuConfig = {
        nav:     () => [navButtonEl, navDropdownEl],
        account: () => [accountButtonEl, accountDropdownEl],
    };

    async function positionDropdown(reference, floating) {
        // Keep invisible during measurement to prevent jerk on open
        floating.style.visibility = 'hidden';
        const { x, y } = await computePosition(reference, floating, {
            placement: 'bottom-end',
            middleware: [offset(6), flip(), shift({ padding: 8 })]
        });
        Object.assign(floating.style, { left: `${x}px`, top: `${y}px`, visibility: '' });
    }

    async function toggleMenu(name) {
        openMenu = openMenu === name ? null : name;
        if (openMenu) {
            await tick();
            const [button, dropdown] = menuConfig[name]();
            if (button && dropdown) positionDropdown(button, dropdown);
        }
    }

    function closeMenus() {
        openMenu = null;
    }

    function handleAuthClick() {
        if ($authSession === undefined) return;
        if ($authSession === null) {
            showSignInModal = true;
        } else {
            toggleMenu('account');
        }
    }

    function handleClickOutside(event) {
        if (!openMenu) return;
        const wrapperClass = openMenu === 'nav' ? '.nav-menu-wrapper' : '.account-menu-wrapper';
        if (!event.target.closest(wrapperClass)) closeMenus();
    }

    function navAction(fn) {
        closeMenus();
        fn();
    }

    function handleDeleteKeydown(e) {
        if (showDeleteDialog && e.key === 'Escape') {
            closeDeleteDialog();
        }
    }

    function handleDeleteBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeDeleteDialog();
        }
    }

    function openDeleteDialog() {
        closeMenus();
        showDeleteDialog = true;
        deleteConfirmText = '';
    }

    function closeDeleteDialog() {
        showDeleteDialog = false;
        deleteConfirmText = '';
    }

    async function handleDeleteAccount() {
        if (deleteConfirmText !== 'DELETE') return;
        deleting = true;
        try {
            const res = await fetch(`${API_URL}/api/account`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                await clearLocalMemories();
                await signOut();
                showToast('Account deleted');
            } else {
                showToast('Failed to delete account', { error: true });
            }
        } catch {
            showToast('Failed to delete account', { error: true });
        } finally {
            deleting = false;
            closeDeleteDialog();
        }
    }

    $: $currentPage, closeMenus();
    $: $authSession, closeMenus();

    $: if ($authSession && showSignInModal) {
        showSignInModal = false;
    }

    $: displayName = $authSession?.user?.isAnonymous
        ? 'Guest'
        : ($authSession?.user?.name || 'Player');
    $: userImage = $authSession?.user?.image || null;
    $: isGuest = $authSession?.user?.isAnonymous === true;

    let imgLoaded = false;
    let imgFailed = false;
    $: { userImage; imgLoaded = false; imgFailed = false; }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleDeleteKeydown} />

<div class="nav-bar">
    <button class="nav-circle memories-nav" onclick={navigateToLatestMemories} title="Latest Memories">
        <img class="memories-nav-img" src="images/nick_closeup.webp" alt="Latest Memories" />
    </button>

    <div class="nav-menu-wrapper">
        <button class="nav-circle" bind:this={navButtonEl} onclick={() => toggleMenu('nav')} title="Menu">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" stroke-linecap="round">
                <line x1="4" y1="6" x2="16" y2="6"/>
                <line x1="4" y1="10" x2="16" y2="10"/>
                <line x1="4" y1="14" x2="16" y2="14"/>
            </svg>
        </button>

        {#if openMenu === 'nav'}
            <div class="dropdown" bind:this={navDropdownEl}>
                <button class="dropdown-item" onclick={() => navAction(() => navigateTo('save-editor'))}>Save Editor</button>
                <button class="dropdown-item" onclick={() => navAction(navigateToMultiplayer)}>Multiplayer</button>
                <button class="dropdown-item" onclick={() => navAction(() => navigateTo('memories'))}>Nick Brick's Memories</button>
            </div>
        {/if}
    </div>

    <div class="account-menu-wrapper">
        <button
            class="nav-circle"
            bind:this={accountButtonEl}
            onclick={handleAuthClick}
            disabled={$authSession === undefined}
            title={$authSession ? displayName : ($authSession === null ? 'Sign in' : '')}
            aria-label={$authSession ? displayName : 'Sign in'}
        >
            <svg class="avatar-placeholder" class:hidden={imgLoaded} class:signed-out={!$authSession} viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="12" r="5" fill="currentColor"/>
                <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="currentColor"/>
            </svg>
            {#if $authSession && userImage && !imgFailed}
                <img class="avatar-img" class:loaded={imgLoaded} src={userImage} alt="" crossorigin="anonymous"
                    onload={() => imgLoaded = true} onerror={() => imgFailed = true} />
            {/if}
        </button>

        {#if openMenu === 'account'}
            <div class="dropdown" bind:this={accountDropdownEl}>
                <div class="dropdown-header">
                    {isGuest ? 'Guest' : displayName}
                </div>

                {#if isGuest}
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-sublabel">Link an account to save across devices</div>
                    <button class="dropdown-item link-discord" onclick={() => navAction(signInWithDiscord)}>
                        <DiscordIcon size={16} />
                        Link with Discord
                    </button>
                {/if}

                <div class="dropdown-divider"></div>
                <button class="dropdown-item delete-account" onclick={openDeleteDialog}>Delete Account</button>
                <button class="dropdown-item signout" onclick={() => navAction(signOut)}>Sign out</button>
            </div>
        {/if}
    </div>
</div>

<SignInModal open={showSignInModal} onClose={() => showSignInModal = false} />

{#if showDeleteDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={handleDeleteBackdropClick}>
        <div class="modal-panel delete-panel">
            <button class="modal-close" onclick={closeDeleteDialog} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>

            <h2 class="delete-title">Delete Account</h2>
            <p class="delete-body">This will permanently delete your account and all associated data (saves, settings, memories). Crash reports will be anonymized. This cannot be undone.</p>
            <p class="delete-body">Type <strong>DELETE</strong> to confirm:</p>
            <input
                type="text"
                class="delete-input"
                bind:value={deleteConfirmText}
                placeholder="Type DELETE"
            />
            <div class="delete-actions">
                <button class="delete-cancel-btn" onclick={closeDeleteDialog}>Cancel</button>
                <button
                    class="delete-confirm-btn"
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                    onclick={handleDeleteAccount}
                >{deleting ? 'Deleting...' : 'Delete my account'}</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .nav-bar {
        position: absolute;
        top: 12px;
        right: 16px;
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .nav-menu-wrapper,
    .account-menu-wrapper {
        position: relative;
    }

    .nav-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        background: var(--color-surface-hover);
        cursor: pointer;
        padding: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: border-color 0.15s;
    }

    .nav-circle:hover {
        border-color: rgba(255, 255, 255, 0.35);
    }

    .nav-circle:disabled {
        pointer-events: none;
    }

    .memories-nav-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        transform: scale(1.6);
    }

    .avatar-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        opacity: 0;
    }

    .avatar-img.loaded {
        opacity: 1;
    }

    .avatar-placeholder {
        width: 20px;
        height: 20px;
        margin-top: -2px;
        color: rgba(255, 255, 255, 0.5);
    }

    .avatar-placeholder.signed-out {
        color: rgba(255, 255, 255, 0.25);
    }

    .avatar-placeholder.hidden {
        visibility: hidden;
    }

    /* Dropdowns — positioned dynamically by floating-ui */
    .dropdown {
        position: absolute;
        width: max-content;
        min-width: 220px;
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        font-family: Arial, sans-serif;
    }

    .dropdown-header {
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.85);
    }

    .dropdown-sublabel {
        padding: 2px 14px 8px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        line-height: 1.3;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 9px 14px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
    }

    .dropdown-item:hover {
        background: rgba(255, 255, 255, 0.06);
    }

    .dropdown-item.link-discord {
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
    }

    .dropdown-item.delete-account {
        color: #ff6b6b;
    }

    .dropdown-item.signout {
        color: rgba(255, 255, 255, 0.5);
    }

    .dropdown-divider {
        height: 1px;
        background: var(--color-surface-hover);
        margin: 2px 0;
    }

    /* Delete account dialog — mirrors SignInModal structure */
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

    .modal-panel.delete-panel {
        border-color: rgba(255, 80, 80, 0.2);
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

    .delete-title {
        font-size: 20px;
        font-weight: 600;
        color: #ff6b6b;
        margin: 0 0 12px;
    }

    .delete-body {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.5;
        margin: 0 0 10px;
    }

    .delete-input {
        width: 100%;
        box-sizing: border-box;
        background: var(--color-bg-input);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.9);
        padding: 11px 16px;
        font-size: 14px;
        font-family: inherit;
        margin-bottom: 16px;
    }

    .delete-input:focus {
        outline: none;
        border-color: rgba(255, 80, 80, 0.4);
    }

    .delete-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
    }

    .delete-cancel-btn {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.5);
        padding: 11px 16px;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }

    .delete-cancel-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7);
    }

    .delete-cancel-btn:active {
        transform: scale(0.98);
    }

    .delete-confirm-btn {
        background: rgba(255, 60, 60, 0.15);
        border: 1px solid rgba(255, 60, 60, 0.3);
        border-radius: 8px;
        color: #ff6b6b;
        padding: 11px 16px;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;
    }

    .delete-confirm-btn:hover:not(:disabled) {
        background: rgba(255, 60, 60, 0.25);
    }

    .delete-confirm-btn:active:not(:disabled) {
        transform: scale(0.98);
    }

    .delete-confirm-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>
