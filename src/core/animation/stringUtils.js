/**
 * Shared string utilities for animation and model name handling.
 */

/**
 * Strip trailing LOD suffix (digits and underscores) from a model name.
 * Mirrors Multiplayer::TrimLODSuffix from isle-portable.
 * Example: "bird01" -> "bird", "jail_01" -> "jail"
 */
export function trimLODSuffix(name) {
    let s = name;
    while (s.length > 1 && (s[s.length - 1] >= '0' && s[s.length - 1] <= '9' || s[s.length - 1] === '_')) {
        s = s.slice(0, -1);
    }
    return s;
}

/**
 * Strip leading '*' prefix from animation actor names.
 * In the backend, '*' marks actors resolved against extra ROIs rather than the root.
 */
export function stripStar(name) {
    return name.startsWith('*') ? name.slice(1) : name;
}
