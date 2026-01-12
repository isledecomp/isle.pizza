<script>
    export let tabs = [];
    export let activeTab = '';
    export let onTabChange = () => {};
    export let buttonClass = 'tab-btn';
</script>

<div class="tab-buttons">
    {#each tabs as tab}
        <button
            class={buttonClass}
            class:active={activeTab === tab.id}
            onclick={() => onTabChange(tab)}
        >
            {tab.label}
        </button>
    {/each}
</div>
