export type SceneEffect = {
  id: string;
  effectId: string;
};

export default function SceneEffects({ effects }: { effects: SceneEffect[] }) {
  return (
    <div className="scene-effects" aria-hidden="true">
      {effects.map((effect) => (
        <div
          className={`scene-effect scene-${effect.effectId.replaceAll('.', '-')}`}
          key={effect.id}
        >
          {effect.effectId === 'board.switch-wipe' ? (
            <>
              <i />
              <i />
              <i />
              <span>SWITCH!</span>
            </>
          ) : effect.effectId === 'board.turn-indicator' ? (
            <>
              <i />
              <i />
              <i />
              <span>OPPONENT&apos;S TURN</span>
            </>
          ) : (
            <>
              <i />
              <i />
              <i />
              <i />
              <span>MAGMA BASIN</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
