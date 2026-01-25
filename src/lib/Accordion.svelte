<script>
    export let items = [];
    export let openItem = null;
    export let onToggle = () => {};
    export let titleKey = 'title';
    export let idKey = 'id';
</script>

{#each items as item}
    <div class="accordion-item">
        <button type="button" class="accordion-header" onclick={() => onToggle(item[idKey])}>
            {item[titleKey]}
        </button>
        <div class="accordion-content" class:open={openItem === item[idKey]}>
            <div>
                <slot {item}></slot>
            </div>
        </div>
    </div>
{/each}
