<script>
    export let title;
    export let sectionId;
    export let isOpen = false;
    export let onToggle = () => {};
</script>

<div class="config-section-card">
    <button type="button" class="config-card-header" onclick={() => onToggle(sectionId)}>
        {title}
    </button>
    <div class="config-card-content" class:open={isOpen}>
        <slot></slot>
    </div>
</div>
