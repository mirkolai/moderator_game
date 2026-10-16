import { getAnimalImageForNode } from '../config/animals';
import { CATEGORY_CONFIG, POST_HIGHLIGHT_COLORS } from '../config/categories';
import type { TutorialPhase } from '../hooks/useTutorial';

interface TutorialGuideProps {
  round: number;
  totalRounds: number;
  nodeId: number;
  phase: TutorialPhase;
  hint: string | null;
  flippedCount: number;
  winImage: string;
  loseImage: string;
  disabled: boolean;
  onNext: () => void;
  onRewind: () => void;
  onFinish: () => void;
}

const PHASE_STEP: Record<TutorialPhase, number> = {
  node: 0,
  post: 1,
  debunk: 2,
  ok: 3,
  bad: 3,
  won: 3,
  lost: 3,
};

export function TutorialGuide({
  round,
  totalRounds,
  nodeId,
  phase,
  hint,
  flippedCount,
  winImage,
  loseImage,
  disabled,
  onNext,
  onRewind,
  onFinish,
}: TutorialGuideProps) {
  const activeStep = PHASE_STEP[phase];
  const { gamma } = CATEGORY_CONFIG;

  const bullets = [
    <>
      Click the <strong>{gamma.label}</strong> animal{' '}
      <img className="tutorial-guide__avatar" src={getAnimalImageForNode(nodeId)} alt={`Animal ${nodeId}`} /> marked
      with a <strong style={{ color: '#7c3aed' }}>purple ring</strong> to open its feed.
    </>,
    <>
      Click a post in the feed: animals with a{' '}
      <strong style={{ color: POST_HIGHLIGHT_COLORS.seenBy }}>solid orange ring</strong> have already seen it, those
      with a <strong style={{ color: POST_HIGHLIGHT_COLORS.potentialRecipients }}>dashed orange ring</strong> could see
      it tomorrow.
    </>,
    <>
      Press <strong>Debunk</strong> on the <strong style={{ color: gamma.color }}>pink {gamma.label}</strong> post that
      is still spreading: the one with the most potential recipients tomorrow.
    </>,
  ];

  return (
    <section className="tutorial-guide card" aria-live="polite">
      <div className="tutorial-guide__header">
        <p className="eyebrow">
          Tutorial · Part {round + 1}/{totalRounds}
        </p>
      </div>

      <ol className="tutorial-guide__bullets">
        {bullets.map((bullet, index) => (
          <li
            key={index}
            className={
              index < activeStep ? 'is-done' : index === activeStep ? 'is-current' : 'is-pending'
            }
          >
            {bullet}
          </li>
        ))}
      </ol>

      {hint ? <p className="tutorial-guide__hint">{hint}</p> : null}

      {phase === 'ok' ? (
        <div className="tutorial-guide__result is-good">
          <p>
            <strong>Well done!</strong> The false post stopped spreading: none of the animals with a dashed ring turned{' '}
            {gamma.label}.
          </p>
          <button type="button" className="primary-button" disabled={disabled} onClick={onNext}>
            Next animal
          </button>
        </div>
      ) : null}

      {phase === 'bad' ? (
        <div className="tutorial-guide__result is-bad">
          <p>
            <strong>Not the right post.</strong> The false post kept spreading and{' '}
            {flippedCount === 1 ? '1 animal' : `${flippedCount} animals`} turned {gamma.label} (purple rings). Press{' '}
            <strong>Rewind</strong> and try again.
          </p>
          <button type="button" className="primary-button" disabled={disabled} onClick={onRewind}>
            Rewind
          </button>
        </div>
      ) : null}

      {phase === 'lost' ? (
        <div className="tutorial-guide__result is-bad">
          <img className="tutorial-guide__image" src={loseImage} alt="You lose illustration" />
          <p>
            <strong>You lose.</strong> That was not the false {gamma.label} post: the propaganda kept spreading and the
            bulldozers won. Only debunk false {gamma.label} posts! Press <strong>Rewind</strong> and try again.
          </p>
          <button type="button" className="primary-button" disabled={disabled} onClick={onRewind}>
            Rewind
          </button>
        </div>
      ) : null}

      {phase === 'won' ? (
        <div className="tutorial-guide__result is-good">
          <img className="tutorial-guide__image" src={winImage} alt="You win illustration" />
          <p>
            <strong>You win!</strong> Tutorial finished: you can start playing.
          </p>
          <button type="button" className="primary-button" disabled={disabled} onClick={onFinish}>
            Start playing
          </button>
        </div>
      ) : null}
    </section>
  );
}
