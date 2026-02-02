<script>
    export let text = '';
</script>

<div class="editor-tooltip-wrapper">
    <span class="tooltip-trigger">?
        <span class="tooltip-content">{text}</span>
    </span>
    <div class="editor-tooltip-content">
        <slot />
    </div>
</div>

<style>
    .editor-tooltip-wrapper {
        position: relative;
        width: 100%;
    }

    .tooltip-trigger {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
    }

    .editor-tooltip-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
