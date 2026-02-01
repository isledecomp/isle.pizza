<script>
    export let onclick = () => {};
</script>

<button type="button" class="reset-btn" {onclick}>Reset to default</button>

<style>
    .reset-btn {
        display: block;
        margin-top: 8px;
        font-size: 0.8em;
        color: var(--color-text-muted);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        text-decoration: underline;
    }

    .reset-btn:hover {
        color: var(--color-text-light);
    }
</style>
