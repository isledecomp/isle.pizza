/**
 * Shared Lambert shading GLSL for all renderers.
 *
 * OGL automatically provides these uniforms when rendering with a camera:
 *   modelViewMatrix (mat4), projectionMatrix (mat4), normalMatrix (mat3),
 *   modelMatrix (mat4), viewMatrix (mat4), cameraPosition (vec3)
 */

export const LAMBERT_VERTEX = /* glsl */ `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;

    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const LAMBERT_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uAmbientColor;
    uniform vec3 uLightDirection;
    uniform vec3 uLightColor;
    uniform sampler2D tMap;
    uniform vec3 uColor;
    uniform float uUseTexture;
    uniform float uOpacity;

    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
        vec3 baseColor = uUseTexture > 0.5 ? texture2D(tMap, vUv).rgb : uColor;
        float diff = max(dot(normalize(vNormal), uLightDirection), 0.0);
        vec3 color = baseColor * (uAmbientColor + uLightColor * diff);
        gl_FragColor = vec4(color, uOpacity);
    }
`;

// Shared lighting uniform values:
//   Ambient intensity 0.8, directional intensity 0.6, direction (1, 2, 3) normalized
const _lightDir = [1, 2, 3];
const _len = Math.sqrt(_lightDir[0] ** 2 + _lightDir[1] ** 2 + _lightDir[2] ** 2);

export const LIGHT_UNIFORMS = {
    uAmbientColor: { value: [0.8, 0.8, 0.8] },
    uLightDirection: { value: [_lightDir[0] / _len, _lightDir[1] / _len, _lightDir[2] / _len] },
    uLightColor: { value: [0.6, 0.6, 0.6] },
};
