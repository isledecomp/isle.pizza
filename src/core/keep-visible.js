// Svelte action: prevents the game engine from hiding overlay elements.
// The engine sets display:none on DOM elements — this observer forces them back.
export function keepVisible(node) {
    const observer = new MutationObserver(() => {
        if (node.style.display === 'none') {
            node.style.setProperty('display', 'block', 'important');
        }
    });
    observer.observe(node, { attributes: true, attributeFilter: ['style'] });

    return {
        destroy() {
            observer.disconnect();
        }
    };
}
