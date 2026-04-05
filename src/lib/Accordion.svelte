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

<style>
/* Accordion (slide-animated details replacement) */
.accordion-item {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border-dark);
    border-radius: 8px;
    margin-bottom: 10px;
}

.accordion-header {
    width: 100%;
    padding: 20px;
    cursor: pointer;
    font-weight: bold;
    color: #e0e0e0;
    font-size: 1.1em;
    background: none;
    border: none;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.accordion-header::after {
    content: '+';
    font-size: 1.5em;
    color: var(--color-primary);
    transition: transform 0.2s ease-in-out;
}

.accordion-item:has(.accordion-content.open) .accordion-header::after {
    transform: rotate(45deg);
}

.accordion-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
}

.accordion-content.open {
    grid-template-rows: 1fr;
}

.accordion-content > div {
    overflow: hidden;
}

/* Slotted content — :global() needed because p/ul/li are rendered by the parent */
.accordion-content :global(p) {
    padding: 0 20px 20px 20px;
    margin: 0;
    color: #b0b0b0;
    font-size: 0.9em;
    line-height: 1.5;
}

.accordion-content :global(ul) {
    padding: 0 20px 20px 40px;
    margin: 0;
}

.accordion-content :global(li) {
    color: #b0b0b0;
    font-size: 0.9em;
    line-height: 1.6;
    margin-bottom: 8px;
}

.accordion-content :global(li:last-child) {
    margin-bottom: 0;
}

.accordion-content :global(li strong) {
    color: var(--color-primary);
}


</style>
