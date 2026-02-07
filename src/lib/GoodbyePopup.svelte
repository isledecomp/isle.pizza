<script>
    import { showGoodbyePopup, goodbyeProgress } from '../stores.js';

    let timeout = null;
    let interval = null;

    $: if ($showGoodbyePopup) {
        startCountdown();
    }

    function startCountdown() {
        const duration = 4000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            goodbyeProgress.set(progress * 100);

            if (progress < 1) {
                interval = requestAnimationFrame(animate);
            }
        }

        interval = requestAnimationFrame(animate);

        timeout = setTimeout(() => {
            window.location.href = 'https://legoisland.org';
        }, duration);
    }

    function cancel() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        if (interval) {
            cancelAnimationFrame(interval);
            interval = null;
        }
        goodbyeProgress.set(0);
        showGoodbyePopup.set(false);
    }
</script>

{#if $showGoodbyePopup}
    <div id="goodbye-popup" class="notification-popup">
        <div class="notification-popup-content">
            <button class="update-dismiss-btn" aria-label="Cancel" onclick={cancel}>×</button>
            <div class="update-speech-bubble">
                <p class="update-message">See you later, Brickulator!</p>
                <div class="goodbye-progress">
                    <div class="goodbye-progress-bar" style="width: {$goodbyeProgress}%"></div>
                </div>
            </div>
        </div>
        <img src="images/later.webp" alt="Goodbye" class="update-character" width="150" height="187">
    </div>
{/if}
