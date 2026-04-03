<script>
    import { currentPage } from '../stores.js';

    function goBack() {
        // If there's a prior app page in history, go back to it.
        // Otherwise (direct landing on a deep link), navigate home.
        if (history.state?.fromApp) {
            history.back();
        } else {
            currentPage.set('main');
            history.pushState({ page: 'main', fromApp: true }, '', '/');
        }
    }
</script>

<span class="page-back-button" role="button" aria-label="Go back to main menu" onclick={goBack} onkeydown={(e) => e.key === 'Enter' && goBack()} tabindex="0">
    ← Back
</span>
