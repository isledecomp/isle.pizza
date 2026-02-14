<script>
    import { onMount } from 'svelte';
    import NavButton from './NavButton.svelte';

    export let gap = 10;

    // Optional selection-based navigation. When provided, nav buttons
    // change the selected item instead of scrolling.
    export let onPrev = null;
    export let onNext = null;
    export let hasPrev = undefined;
    export let hasNext = undefined;

    let trackRef;
    let canScrollLeft = false;
    let canScrollRight = false;
    let isDragging = false;
    let dragStartX = 0;
    let scrollStartLeft = 0;

    // Exposed so parent can check if a drag occurred (to prevent click handling)
    export let hasDragged = false;

    $: leftDisabled = hasPrev !== undefined ? !hasPrev : !canScrollLeft;
    $: rightDisabled = hasNext !== undefined ? !hasNext : !canScrollRight;

    function updateArrows() {
        if (!trackRef) return;
        const { scrollLeft, scrollWidth, clientWidth } = trackRef;
        canScrollLeft = scrollLeft > 0;
        canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
    }

    function handleLeft() {
        if (onPrev) {
            onPrev();
        } else {
            trackRef?.scrollBy({ left: -200, behavior: 'smooth' });
        }
    }

    function handleRight() {
        if (onNext) {
            onNext();
        } else {
            trackRef?.scrollBy({ left: 200, behavior: 'smooth' });
        }
    }

    function scrollChildIntoView(child) {
        const trackRect = trackRef.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        const isFullyVisible = childRect.left >= trackRect.left && childRect.right <= trackRect.right;

        if (!isFullyVisible) {
            const scrollTarget = childRect.left < trackRect.left
                ? trackRef.scrollLeft - (trackRect.left - childRect.left)
                : trackRef.scrollLeft + (childRect.right - trackRect.right);
            trackRef.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }
    }

    /** Scroll the nth child (0-indexed) into view */
    export function scrollToIndex(index) {
        if (!trackRef) return;
        const child = trackRef.children[index];
        if (child) scrollChildIntoView(child);
    }

    function handleMouseDown(e) {
        if (e.button !== 0) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = e.pageX;
        scrollStartLeft = trackRef.scrollLeft;
        trackRef.style.scrollBehavior = 'auto';
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.pageX - dragStartX;
        if (Math.abs(dx) > 5) {
            hasDragged = true;
        }
        trackRef.scrollLeft = scrollStartLeft - dx;
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        trackRef.style.scrollBehavior = 'smooth';
    }

    function handleClick(e) {
        const clickedCard = e.target.closest('.carousel-track > *');
        if (!clickedCard || hasDragged) return;
        scrollChildIntoView(clickedCard);
    }

    onMount(() => {
        updateArrows();

        const resizeObserver = new ResizeObserver(updateArrows);
        resizeObserver.observe(trackRef);

        return () => resizeObserver.disconnect();
    });
</script>

<div class="carousel">
    <NavButton direction="left" onclick={handleLeft} disabled={leftDisabled} />
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
    <div
        class="carousel-track"
        class:dragging={isDragging}
        style="gap: {gap}px"
        bind:this={trackRef}
        role="group"
        onscroll={updateArrows}
        onclick={handleClick}
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        onmouseleave={handleMouseUp}
    >
        <slot />
    </div>
    <NavButton direction="right" onclick={handleRight} disabled={rightDisabled} />
</div>

<style>
    .carousel {
        display: flex;
        align-items: center;
        gap: 8px;
        contain: inline-size;
    }

    .carousel-track {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
        flex: 1;
        min-width: 0;
    }

    .carousel-track::-webkit-scrollbar {
        display: none;
    }

    .carousel-track.dragging {
        cursor: grabbing;
        user-select: none;
    }

    .carousel-track:not(.dragging) {
        cursor: grab;
    }
</style>
