<script>
    export let id = '';
    export let offSrc;
    export let onSrc;
    export let alt;
    export let width = undefined;
    export let height = undefined;
    export let onclick = () => {};

    let hovered = false;
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<img
    class="control-img"
    {id}
    {width}
    {height}
    src={hovered ? onSrc : offSrc}
    {alt}
    tabindex="0"
    onmouseenter={() => hovered = true}
    onmouseleave={() => hovered = false}
    {onclick}
    onkeydown={(e) => e.key === 'Enter' && onclick()}
/>
