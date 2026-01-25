<script>
    export let id;
    export let name;
    export let label;
    export let checked = false;
    export let disabled = false;
    export let badge = '';
    export let tooltip = '';
    export let notIni = false;
    export let onchange = undefined;
</script>

{#if tooltip}
    <div class="toggle-switch">
        <label>
            <input
                type="checkbox"
                {id}
                {name}
                {checked}
                {disabled}
                data-not-ini={notIni || undefined}
                {onchange}
            >
            <span class="toggle-slider"></span>
            <span class="toggle-label">
                {label}
                {#if badge}
                    <span class="toggle-badge">{badge}</span>
                {/if}
            </span>
        </label>
        <span class="tooltip-trigger">?<span class="tooltip-content">{tooltip}</span></span>
    </div>
{:else}
    <label class="toggle-switch">
        <input
            type="checkbox"
            {id}
            {name}
            {checked}
            {disabled}
            data-not-ini={notIni || undefined}
            {onchange}
        >
        <span class="toggle-slider"></span>
        <span class="toggle-label">{label}</span>
    </label>
{/if}
