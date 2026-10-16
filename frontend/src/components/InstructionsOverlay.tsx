import { useState, type ReactNode } from 'react';

import { CATEGORY_CONFIG, POST_HIGHLIGHT_COLORS } from '../config/categories';
import { LEVELS } from '../config/levels';

interface InstructionsOverlayProps {
  onClose: () => void;
}

interface InstructionsStep {
  title: string;
  content: ReactNode;
}

const { alpha, beta, gamma } = CATEGORY_CONFIG;

function Swatch({ color, edge = false }: { color: string; edge?: boolean }) {
  return (
    <span
      className={`instructions-swatch ${edge ? 'instructions-swatch--edge' : ''}`}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

function RingSwatch({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <span
      className="instructions-swatch instructions-swatch--ring"
      style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
      aria-hidden="true"
    />
  );
}

const STEPS: InstructionsStep[] = [
  {
    title: 'The forest social network',
    content: (
      <>
        <p>
          The simulation shows the social network of the animals living in the forest. Every{' '}
          <strong>circle is a node</strong>: an animal with an account. Every <strong>line is an edge</strong>: a
          friendship between two animals.
        </p>
        <p>Animals read the posts published by their friends and can be influenced by them.</p>
      </>
    ),
  },
  {
    title: 'Colors are opinions',
    content: (
      <>
        <p>The color of a node is the animal&apos;s position on the topic:</p>
        <ul>
          <li>
            <Swatch color={gamma.color} />
            <strong>{gamma.label}</strong>: in favor of the zoo.
          </li>
          <li>
            <Swatch color={beta.color} />
            <strong>{beta.label}</strong>: not convinced yet.
          </li>
          <li>
            <Swatch color={alpha.color} />
            <strong>{alpha.label}</strong>: in favor of protecting the forest.
          </li>
        </ul>
        <p>
          The humans want to convince the animals to favor the zoo using misleading posts and propaganda. Your goal
          is to keep the forest ahead until the bulldozers arrive.
        </p>
      </>
    ),
  },
  {
    title: 'Friendships change',
    content: (
      <>
        <p>
          If two friends&apos; opinions drift too far apart, the friendship can end: the edge is drawn in{' '}
          <Swatch color="#ff9a8f" edge /> <strong>red</strong> and then removed.
        </p>
        <p>
          If two animals who are not friends hold similar opinions, they may become friends: the new edge is drawn in{' '}
          <Swatch color="#ffd166" edge /> <strong>yellow</strong>.
        </p>
      </>
    ),
  },
  {
    title: 'Polarization',
    content: (
      <p>
        Because friendships form between similar animals and break between different ones, the network can split into
        two communities, each following its own bias, that barely talk to each other. In a polarized network, opinions
        stop mixing and each side becomes more extreme.
      </p>
    ),
  },
  {
    title: 'Your tool: debunking',
    content: (
      <>
        <p>
          You are the moderator. You can <strong>debunk</strong> posts that are false and misleading, so they are not
          spread across the network and cannot push animals towards the zoo.
        </p>
        <p>
          You have a limited number of debunking attempts per day. When they run out, or when you press{' '}
          <em>Skip to next day</em>, the day advances.
        </p>
      </>
    ),
  },
  {
    title: 'How the game ends',
    content: (
      <>
        <p>The game ends in one of these ways:</p>
        <ul>
          <li>
            <strong>You win</strong> if {alpha.label} reaches the win threshold (a super-majority of the animals,
            e.g. 80% in Easy level) at any time, or if on the last day, when the bulldozers arrive, {alpha.label}{' '}
            animals outnumber {gamma.label} animals.
          </li>
          <li>
            <strong>You lose</strong> if {gamma.label} reaches the win threshold at any time, or if on the last
            day {alpha.label} animals do not outnumber {gamma.label} animals.
          </li>
        </ul>
        <p>
          The percentages of each group and the days left before the bulldozers arrive are always shown at the top.
        </p>
      </>
    ),
  },
  {
    title: 'Inspecting animals and posts',
    content: (
      <>
        <p>
          <strong>Click a node</strong> to see its feed. Nodes that are not its friends become transparent, so you
          can focus on the animal&apos;s neighborhood.
        </p>
        <p>
          <strong>Select a post</strong> in the feed to see how it spreads:
        </p>
        <ul>
          <li>
            <RingSwatch color={POST_HIGHLIGHT_COLORS.seenBy} />
            <strong>Solid orange ring</strong>: animals that have already seen the post, and may already be
            influenced by it.
          </li>
          <li>
            <RingSwatch color={POST_HIGHLIGHT_COLORS.potentialRecipients} dashed />
            <strong>Dashed orange ring</strong>: animals that could see the post if you do not debunk it, and
            could be influenced next.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Strategy',
    content: (
      <>
        <ul>
          <li>
            Look for <strong>{gamma.label}</strong> animals: their feeds are likely to contain pro-zoo posts, which
            are the ones that influenced them and that they will keep sharing.
          </li>
          <li>
            Among their posts, debunk first those that, on the next day, could reach the{' '}
            <strong>largest number of animals who have not seen them yet</strong>.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Debunk only what is false',
    content: (
      <>
        <p>Not every post is a threat:</p>
        <ul>
          <li>
            <strong>{gamma.label} posts</strong> are false and misleading: debunk them.
          </li>
          <li>
            <strong>{alpha.label} posts</strong> push animals to protect the forest: if they spread, they help you.
          </li>
          <li>
            <strong>Neutral posts</strong> do not influence anyone.
          </li>
        </ul>
        <p>
          <strong>Careful:</strong> debunking {alpha.label} or neutral posts wastes your attempts and is
          counterproductive.
        </p>
      </>
    ),
  },
  {
    title: 'Difficulty levels',
    content: (
      <>
        <p>You can play at different levels, each with its own game parameters:</p>
        <ul>
          <li>
            <strong>{LEVELS.easy.label}</strong>: {LEVELS.easy.description}
          </li>
          <li>
            <strong>{LEVELS.normal.label}</strong>: {LEVELS.normal.description}
          </li>
          <li>
            <strong>{LEVELS.advanced.label}</strong>: {LEVELS.advanced.description}
          </li>
          <li>
            <strong>{LEVELS.custom.label}</strong>: for expert users, who can set the game parameters by hand from
            the Parameters panel.
          </li>
        </ul>
        <p>Switching level restarts the game.</p>
      </>
    ),
  },
];

export function InstructionsOverlay({ onClose }: InstructionsOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="instructions-overlay" role="dialog" aria-modal="true" aria-labelledby="instructions-title">
      <div className="instructions-card card">
        <div className="instructions-card__header">
          <div>
            <p className="eyebrow">Instructions · {index + 1}/{STEPS.length}</p>
            <h2 id="instructions-title">{step.title}</h2>
          </div>
          <button type="button" className="instructions-close" aria-label="Close instructions" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="instructions-step">{step.content}</div>

        <div className="instructions-card__footer">
          <button
            type="button"
            className="ghost-button"
            disabled={index === 0}
            onClick={() => setIndex((current) => current - 1)}
          >
            Back
          </button>
          <div className="instructions-progress" aria-hidden="true">
            {STEPS.map((item, stepIndex) => (
              <span key={item.title} className={stepIndex === index ? 'is-active' : ''} />
            ))}
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => (isLast ? onClose() : setIndex((current) => current + 1))}
          >
            {isLast ? 'Start playing' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
