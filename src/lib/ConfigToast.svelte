<script>
    import { configToastVisible, configToastMessage } from '../stores.js';
    import { toastError as configToastError } from '../core/toast.js';
    import { keepVisible } from '../core/keep-visible.js';
</script>

<div id="config-toast" class="config-toast" class:show={$configToastVisible} class:error={$configToastError} use:keepVisible>
    {$configToastMessage}
</div>

<style>
.config-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--gradient-panel);
    border: 1px solid var(--color-primary);
    border-radius: 8px;
    padding: 12px 24px;
    color: var(--color-text-light);
    font-size: 0.9em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 10000;
}

.config-toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
    visibility: visible;
}

.config-toast.error {
    border-color: #ff6b6b;
    color: #ff6b6b;
}
</style>
