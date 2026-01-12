// WebGL detection and capability querying

let cachedGL = null;

function getWebGL2Context() {
    if (!cachedGL) {
        cachedGL = document.createElement('canvas').getContext('webgl2');
    }
    return cachedGL;
}

export function getMsaaSamples() {
    const gl = getWebGL2Context();
    if (!gl) return null;

    const samples = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES);
    if (!samples || samples.length === 0 || Math.max(...samples) <= 1) {
        return null;
    }

    return Array.from(samples).filter(s => s > 1).sort((a, b) => a - b);
}

export function getMaxAnisotropy() {
    const gl = getWebGL2Context();
    if (!gl) return null;

    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (!ext) return null;

    return gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
}

export function populateMsaaSelect(selectElement, samples) {
    if (!selectElement || !samples) return;

    selectElement.innerHTML = '';

    const offOption = document.createElement('option');
    offOption.value = '1';
    offOption.textContent = 'Off';
    selectElement.appendChild(offOption);

    samples.forEach(sampleCount => {
        const option = document.createElement('option');
        option.value = sampleCount;
        option.textContent = `${sampleCount}x`;
        selectElement.appendChild(option);
    });
}

export function populateAfSelect(selectElement, maxAnisotropy) {
    if (!selectElement || !maxAnisotropy) return;

    selectElement.innerHTML = '';

    const offOption = document.createElement('option');
    offOption.value = '1';
    offOption.textContent = 'Off';
    selectElement.appendChild(offOption);

    const defaultAniso = Math.min(maxAnisotropy, 16);

    for (let i = 2; i <= maxAnisotropy; i *= 2) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}x`;
        option.selected = defaultAniso === i;
        selectElement.appendChild(option);
    }
}
