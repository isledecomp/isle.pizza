<script>
    import { opfsDisabled } from '../stores.js';
</script>

{#if $opfsDisabled}
    <blockquote class="error-box">
        <p>OPFS is disabled in this browser. This feature is unavailable. If you are using a
            Private/Incognito window, please change to a regular window instead.</p>
    </blockquote>
{/if}

<style>
.error-box {
    padding: 15px 20px;
    margin-bottom: 25px;
    border-left: 3px solid #ff0011;
    background-color: var(--color-bg-card);
    border-radius: 0 8px 8px 0;
}

.error-box p {
    font-style: italic;
    color: #e0e0e0;
    margin: 0;
    font-size: 1em;
}
</style>
