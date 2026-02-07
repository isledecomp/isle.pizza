<script>
    import { showGoodbyePopup } from '../stores.js';
    import { startGame } from '../core/emscripten.js';
    import { pauseInstallAudio } from '../core/audio.js';
    import { navigateTo } from '../core/navigation.js';
    import ImageButton from './ImageButton.svelte';

    let rendererValue = "0 0x682656f3 0x0 0x0 0x4000000"; // WebGL default

    const buttons = [
        { id: 'run-game-btn', off: 'images/run_game_off.webp', on: 'images/run_game_on.webp', alt: 'Run Game', width: 135, height: 164, action: handleRunGame },
        { id: 'configure-btn', off: 'images/configure_off.webp', on: 'images/configure_on.webp', alt: 'Configure', width: 130, height: 147, action: () => navigateTo('configure') },
        { id: 'free-stuff-btn', off: 'images/free_stuff_off.webp', on: 'images/free_stuff_on.webp', alt: 'Free Stuff', width: 134, height: 149, action: () => navigateTo('free-stuff') },
        { id: 'read-me-btn', off: 'images/read_me_off.webp', on: 'images/read_me_on.webp', alt: 'Read Me', width: 134, height: 149, action: () => navigateTo('read-me') },
        { id: 'cancel-btn', off: 'images/cancel_off.webp', on: 'images/cancel_on.webp', alt: 'Cancel', width: 93, height: 145, action: () => showGoodbyePopup.set(true) }
    ];

    function handleRunGame() {
        pauseInstallAudio();

        // Get current renderer value from select
        const rendererSelect = document.getElementById('renderer-select');
        if (rendererSelect) {
            rendererValue = rendererSelect.value;
        }

        startGame(rendererValue);
    }
</script>

<div id="controls-wrapper">
    {#each buttons as btn}
        <ImageButton
            id={btn.id}
            offSrc={btn.off}
            onSrc={btn.on}
            alt={btn.alt}
            width={btn.width}
            height={btn.height}
            onclick={btn.action}
        />
    {/each}
</div>
