/**
 * URL-safe base64 encoding/decoding (RFC 4648 §5).
 * Standard btoa() produces +, /, = which break in URL path segments.
 */

export function toUrlSafeBase64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromUrlSafeBase64(encoded) {
    let s = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
}
