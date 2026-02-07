<script>
    import { showUpdatePopup } from '../stores.js';

    function reload() {
        window.location.reload();
    }

    function dismiss() {
        showUpdatePopup.set(false);
    }
</script>

{#if $showUpdatePopup}
<div id="update-popup" class="notification-popup">
    <div class="notification-popup-content">
        <button class="update-dismiss-btn" aria-label="Dismiss" onclick={dismiss}>×</button>
        <div class="update-speech-bubble">
            <p class="update-message">A new version just arrived!</p>
            <button class="update-reload-btn" onclick={reload}>Reload Now</button>
        </div>
    </div>
    <img src="images/bonus.webp" alt="Pepper" class="update-character" width="150" height="187">
</div>
{/if}
