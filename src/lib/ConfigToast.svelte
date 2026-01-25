<script>
    import { configToastVisible, configToastMessage } from '../stores.js';
</script>

<div id="config-toast" class="config-toast" class:show={$configToastVisible}>
    {$configToastMessage}
</div>
