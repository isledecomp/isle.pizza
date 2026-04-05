export const walkOptions = [
    { emoji: '\u{1F6B6}', label: 'Normal', id: 0 },
    { emoji: '\u{1F3C3}', label: 'Charging', id: 3 },
    { emoji: '\u{1F57A}', label: 'Joyful', id: 1 },
    { emoji: '\u{1F327}\u{FE0F}', label: 'Gloomy', id: 2 },
    { emoji: '\u{1F648}', label: 'Scared', id: 4 },
    { emoji: '\u{26A1}', label: 'Hyper', id: 5 }
];

export const idleOptions = [
    { emoji: '\u{1F343}', label: 'Sway', id: 0 },
    { emoji: '\u{1FAA9}', label: 'Groove', id: 1 },
    { emoji: '\u{1F64C}', label: 'Excited', id: 2 },
    { emoji: '\u{1F974}', label: 'Wobbly', id: 3 },
    { emoji: '\u{1F929}', label: 'Peppy', id: 4 },
    { emoji: '\u{1F9B9}', label: 'Brickster', id: 5 }
];

export const emoteOptions = [
    { emoji: '\u{1F44B}', label: 'Wave' },
    { emoji: '\u{1F3A9}', label: 'Hat' },
    { emoji: '\u{1F9E9}', label: 'Morph' },
    { emoji: '\u{1F440}', label: 'Look' },
    { emoji: '\u{1F939}', label: 'Headless' },
    { emoji: '\u{1F355}', label: 'Toss' }
];

// Pick the Scene/Act tab with the most relevant activity.
// Priority: playing > countdown > gathering > joinable > eligible.
export function bestAnimTab(sceneAnims, npcAnims, currentTab) {
    function score(list) {
        const active = list.find(x => x.localInSession && x.sessionState >= 1);
        if (active) return active.sessionState + 2;
        if (list.find(x => x.sessionState >= 1 && x.canJoin)) return 2;
        if (list.find(x => x.eligible && x.sessionState === 0)) return 1;
        return 0;
    }
    const s = score(sceneAnims), a = score(npcAnims);
    if (s === a) return currentTab;
    return s > a ? 'scene' : 'act';
}

export const settingsItems = [
    {
        icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
        label: 'Third-person camera',
        key: 'thirdPersonCam',
        toggle: () => { window.Module?._mp_toggle_third_person(); },
    },
    {
        icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        label: 'Name bubbles',
        key: 'showNameBubbles',
        toggle: () => { window.Module?._mp_toggle_name_bubbles(); },
    },
    {
        icon: '<path d="M3 21l10-10"/><path d="M13 11l2.5-2.5a1.5 1.5 0 0 1 2 0l.5.5a1.5 1.5 0 0 1 0 2L15.5 13.5"/><path d="M7 3l.5 1.5L9 5l-1.5.5L7 7l-.5-1.5L5 5l1.5-.5z" fill="currentColor" stroke="none"/><path d="M17 2l.4 1.1L18.5 3.5l-1.1.4L17 5l-.4-1.1L15.5 3.5l1.1-.4z" fill="currentColor" stroke="none"/><path d="M21 8l.4 1.1L22.5 9.5l-1.1.4L21 11l-.4-1.1L19.5 9.5l1.1-.4z" fill="currentColor" stroke="none"/>',
        label: 'Allow customization',
        key: 'allowCustomize',
        toggle: () => { window.Module?._mp_toggle_allow_customize(); },
    },
];
