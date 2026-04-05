<script>
    import { onMount, onDestroy } from 'svelte';

    export let src;
    export let alt = '';
    /** Full cycle duration in seconds (left-to-right-to-left) */
    export let duration = 45;

    let imgEl;
    let animationId;
    let startTime = null;

    function animate(timestamp) {
        if (!imgEl) return;
        if (startTime === null) startTime = timestamp;

        const elapsed = (timestamp - startTime) / 1000;
        // Ping-pong: 0→1→0 over `duration` seconds
        const phase = (elapsed % duration) / duration;
        const pct = phase < 0.5
            ? phase * 2
            : 2 - phase * 2;

        imgEl.style.objectPosition = `${pct * 100}% 50%`;
        animationId = requestAnimationFrame(animate);
    }

    onMount(() => {
        animationId = requestAnimationFrame(animate);
    });

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
    });
</script>

<img bind:this={imgEl} {src} {alt} class="panning-image" />

<style>
    .panning-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 0% 50%;
        display: block;
    }
</style>
