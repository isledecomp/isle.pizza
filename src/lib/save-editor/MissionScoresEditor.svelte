<script>
    import ScoreColorButton from './ScoreColorButton.svelte';
    import { Actor, ActorNames, MissionNames } from '../../core/savegame/constants.js';

    export let slot;
    export let onUpdate = () => {};

    const missions = [
        { key: 'pizza', name: MissionNames.pizza, icon: 'pizza.webp' },
        { key: 'carRace', name: MissionNames.carRace, icon: 'race.webp' },
        { key: 'jetskiRace', name: MissionNames.jetskiRace, icon: 'boat.webp' },
        { key: 'towTrack', name: MissionNames.towTrack, icon: 'gas.webp' },
        { key: 'ambulance', name: MissionNames.ambulance, icon: 'med.webp' }
    ];

    const actors = [
        { id: Actor.PEPPER, name: ActorNames[Actor.PEPPER] },
        { id: Actor.MAMA, name: ActorNames[Actor.MAMA] },
        { id: Actor.PAPA, name: ActorNames[Actor.PAPA] },
        { id: Actor.NICK, name: ActorNames[Actor.NICK] },
        { id: Actor.LAURA, name: ActorNames[Actor.LAURA] }
    ];

    // Reactive mission data - re-evaluated when slot changes
    $: missionData = slot?.missions || {};

    function handleScoreChange(missionKey, actorId, scoreType, newColor) {
        onUpdate({
            missionType: missionKey,
            actorId,
            scoreType,
            value: newColor
        });
    }

    function getScore(missionKey, actorId, scoreType) {
        const data = missionData[missionKey];
        if (!data) return 0;

        if (scoreType === 'score') {
            return data.scores?.[actorId] ?? 0;
        } else {
            return data.highScores?.[actorId] ?? 0;
        }
    }
</script>

<div class="scores-table-wrapper">
    {#key missionData}
    <div class="scores-table">
        <div class="scores-header">
            <div class="mission-col"></div>
            {#each actors as actor}
                <div class="actor-col">{actor.name}</div>
            {/each}
        </div>

        {#each missions as mission}
            <div class="scores-row">
                <div class="mission-col">
                    <img src={mission.icon} alt={mission.name} class="mission-icon" title={mission.name} />
                </div>
                {#each actors as actor}
                    <div class="actor-col">
                        <ScoreColorButton
                            color={getScore(mission.key, actor.id, 'score')}
                            onChange={(c) => handleScoreChange(mission.key, actor.id, 'score', c)}
                            title="Score"
                        />
                        <ScoreColorButton
                            color={getScore(mission.key, actor.id, 'highScore')}
                            onChange={(c) => handleScoreChange(mission.key, actor.id, 'highScore', c)}
                            title="High Score"
                            isHighScore={true}
                        />
                    </div>
                {/each}
            </div>
        {/each}
    </div>
    {/key}
</div>

<div class="scores-legend">
    <span class="legend-item">
        <span class="legend-color grey"></span> Grey
    </span>
    <span class="legend-item">
        <span class="legend-color yellow"></span> Yellow
    </span>
    <span class="legend-item">
        <span class="legend-color blue"></span> Blue
    </span>
    <span class="legend-item">
        <span class="legend-color red"></span> Red
    </span>
    <span class="legend-divider">|</span>
    <span class="legend-note">H = High Score</span>
</div>

<style>
    .scores-table-wrapper {
        overflow-x: auto;
    }

    .scores-table {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 500px;
    }

    .scores-header,
    .scores-row {
        display: grid;
        grid-template-columns: 50px repeat(5, 1fr);
        gap: 8px;
        align-items: center;
    }

    .scores-header {
        font-weight: bold;
        color: var(--color-text-light);
        font-size: 0.8em;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--color-border-dark);
    }

    .mission-col {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mission-icon {
        width: 32px;
        height: 32px;
        image-rendering: pixelated;
    }

    .actor-col {
        display: flex;
        gap: 4px;
        justify-content: center;
    }

    .scores-header .actor-col {
        font-size: 0.75em;
        text-align: center;
    }

    .scores-legend {
        display: flex;
        gap: 12px;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border-dark);
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-muted);
        font-size: 0.8em;
    }

    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .legend-color.grey { background: #808080; }
    .legend-color.yellow { background: #FFD700; }
    .legend-color.blue { background: #4169E1; }
    .legend-color.red { background: #DC143C; }

    .legend-divider {
        color: var(--color-border-medium);
    }

    .legend-note {
        color: var(--color-text-muted);
        font-size: 0.8em;
    }

    @media (max-width: 600px) {
        .scores-header,
        .scores-row {
            grid-template-columns: 40px repeat(5, 1fr);
        }

        .scores-header .actor-col {
            font-size: 0.65em;
        }

        .mission-icon {
            width: 28px;
            height: 28px;
        }
    }
</style>
