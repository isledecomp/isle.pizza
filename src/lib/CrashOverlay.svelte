<script>
    import { gameCrashed } from '../stores.js';

    function reload() {
        window.location.reload();
    }
</script>

{#if $gameCrashed}
<div class="crash-overlay">
    <div class="crash-card">
        <img src="images/callfail.webp" alt="Crash" class="crash-image" width="150" height="187">
        <div class="crash-body">
            <h2 class="crash-title">Uh oh! The game crashed.</h2>
            <p class="crash-message">Sorry about that! Something went wrong and LEGO Island had to stop. You can try reloading the page to get back to the action.</p>
            <button class="crash-reload-btn" onclick={reload}>Reload Page</button>
            <p class="crash-report">If this keeps happening, please <a href="https://github.com/isledecomp/isle-portable/issues" target="_blank" rel="noopener noreferrer">report the issue</a> so we can fix it.</p>
        </div>
    </div>
</div>
{/if}

<style>
.crash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    animation: crash-fade-in 0.4s ease-out;
    padding: 20px;
    box-sizing: border-box;
}

@keyframes crash-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.crash-card {
    background: var(--gradient-panel);
    border: 1px solid var(--color-border-medium);
    border-radius: 16px;
    padding: 32px 28px;
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.crash-image {
    width: 110px;
    height: auto;
    border-radius: 12px;
    border: 2px solid var(--color-border-medium);
    box-shadow: var(--shadow-md);
    margin-bottom: 24px;
}

.crash-body {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.crash-title {
    color: #ff6b6b;
    font-size: 1.15em;
    font-weight: bold;
    margin: 0 0 12px 0;
}

.crash-message {
    color: var(--color-text-medium);
    font-size: 0.9em;
    margin: 0 0 20px 0;
    line-height: 1.5;
}

.crash-reload-btn {
    width: 100%;
    padding: 12px 20px;
    background-color: var(--color-primary);
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 0.95em;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.25);
}

.crash-reload-btn:hover {
    background-color: #fff;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.crash-reload-btn:active {
    transform: scale(0.98);
}

.crash-report {
    color: var(--color-text-muted);
    font-size: 0.8em;
    margin: 16px 0 0 0;
    line-height: 1.4;
    border-top: 1px solid var(--color-border-dark);
    padding-top: 16px;
    width: 100%;
}

.crash-report a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
}

.crash-report a:hover {
    text-decoration: underline;
    color: #fff;
}

@media (max-width: 480px) {
    .crash-card {
        padding: 24px 20px;
    }

    .crash-image {
        width: 90px;
        margin-bottom: 20px;
    }

    .crash-title {
        font-size: 1.05em;
    }

    .crash-message {
        font-size: 0.85em;
    }
}
</style>
