<script>
    import { onMount } from 'svelte';
    import { debugEnabled, soundEnabled } from '../stores.js';
    import { getInstallAudio, toggleInstallAudio } from '../core/audio.js';

    let debugTapCount = 0;
    let debugTapTimeout = null;

    onMount(() => {
        const audio = getInstallAudio();
        if (audio) {
            audio.addEventListener('play', () => soundEnabled.set(true));
            audio.addEventListener('pause', () => soundEnabled.set(false));
        }
    });

    function celebratePizza(originElement) {
        const rect = originElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const sliceCount = 12;

        for (let i = 0; i < sliceCount; i++) {
            const slice = document.createElement('div');
            slice.className = 'pizza-slice';
            slice.textContent = '🍕';

            const angle = (i / sliceCount) * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const rotation = (Math.random() - 0.5) * 720;

            slice.style.left = centerX + 'px';
            slice.style.top = centerY + 'px';
            slice.style.setProperty('--tx', tx + 'px');
            slice.style.setProperty('--ty', ty + 'px');
            slice.style.setProperty('--rot', rotation + 'deg');
            slice.style.animationDelay = (Math.random() * 0.2) + 's';

            document.body.appendChild(slice);

            setTimeout(() => slice.remove(), 1700);
        }
    }

    function handleLogoClick(event) {
        const imgElement = event.currentTarget.querySelector('img');

        if ($debugEnabled) {
            celebratePizza(imgElement);
            return;
        }

        debugTapCount++;
        clearTimeout(debugTapTimeout);

        if (debugTapCount >= 5) {
            debugEnabled.set(true);
            celebratePizza(imgElement);
        } else {
            debugTapTimeout = setTimeout(() => {
                debugTapCount = 0;
            }, 1000);
        }
    }
</script>

<div id="top-content">
    <div class="video-container">
        <img id="install-video" width="300" height="300" fetchpriority="high" src="images/install.webp" alt="Install Game">
        <span
            id="sound-toggle-emoji"
            title={$soundEnabled ? 'Pause Audio' : 'Play Audio'}
            onclick={toggleInstallAudio}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && toggleInstallAudio()}
        >
            {$soundEnabled ? '🔊' : '🔇'}
        </span>
    </div>
    <button type="button" class="img-button" onclick={handleLogoClick}>
        <img
            id="island-logo-img"
            width="567"
            height="198"
            src={$debugEnabled ? 'images/ogel.webp' : 'images/island.webp'}
            alt={$debugEnabled ? 'OGEL Mode Enabled' : 'Lego Island Logo'}
        >
    </button>
</div>
