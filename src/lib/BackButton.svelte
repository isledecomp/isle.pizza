<script>
    function goBack() {
        history.back();
    }
</script>

<span class="page-back-button" role="button" aria-label="Go back to main menu" onclick={goBack} onkeydown={(e) => e.key === 'Enter' && goBack()} tabindex="0">
    ← Back
</span>
