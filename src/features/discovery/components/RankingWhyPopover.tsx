import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { RankedExperience } from '@/features/discovery/engine/ranking';

const CONTEXT_LABELS = {
  featured: 'Featured',
  trending: 'Trending',
  recommended: 'Recommended',
  'hidden-gems': 'Hidden Gems',
  'recently-launched': 'Recently Launched',
} as const;

const STRATEGY_LABELS = {
  balanced: 'Balanced',
  popularity: 'Popularity-first',
  personalized: 'Personalized',
  discovery: 'Discovery-first',
} as const;

interface RankingWhyPopoverProps {
  ranking: RankedExperience;
}

interface PopoverPosition {
  top: number;
  left: number;
}

function getDisplayedContributions(
  signals: RankedExperience['explanation']['signals'],
  weightedScore: number,
): Map<string, number> {
  const displayed = new Map<string, number>(
    signals.map((signal) => [signal.id, Number(signal.contribution.toFixed(1))]),
  );
  const targetTotal = Number(weightedScore.toFixed(1));
  const displayedTotal = [...displayed.values()].reduce((sum, value) => sum + value, 0);
  const correction = Number((targetTotal - displayedTotal).toFixed(1));
  const strongest = signals
    .filter((signal) => signal.enabled)
    .reduce<RankedExperience['explanation']['signals'][number] | undefined>(
      (best, signal) => (!best || signal.contribution > best.contribution ? signal : best),
      undefined,
    );

  if (strongest && correction !== 0) {
    displayed.set(
      strongest.id,
      Number(((displayed.get(strongest.id) ?? 0) + correction).toFixed(1)),
    );
  }

  return displayed;
}

export function RankingWhyPopover({ ranking }: RankingWhyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelId = useId();

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!rect) return;

    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - width - 16, rect.right - width));
    const panelHeight = panelRef.current?.offsetHeight ?? 380;
    const below = rect.bottom + 10;
    const top =
      below + panelHeight <= window.innerHeight - 16
        ? below
        : Math.max(16, rect.top - panelHeight - 10);

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    const closeWhenAnotherOpens = () => setOpen(false);
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;

      const insideTrigger = rootRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);

      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const signals = [...ranking.explanation.signals].sort(
    (a, b) => Number(b.enabled) - Number(a.enabled) || b.contribution - a.contribution,
  );
  const displayedContributions = getDisplayedContributions(
    signals,
    ranking.explanation.weightedScore,
  );
  const displayedWeightedScore = Number(ranking.explanation.weightedScore.toFixed(1));
  const displayedFinalScore = Number(ranking.score.toFixed(1));
  const displayedDiversityAdjustment = Number(
    (displayedFinalScore - displayedWeightedScore).toFixed(1),
  );

  return (
    <div className="ranking-inspector" ref={rootRef}>
      <div
        className="ranking-score"
        aria-label={`Rank score ${ranking.score.toFixed(1)} out of 100`}
      >
        <strong>{ranking.score.toFixed(1)}</strong>
        <span>RANK SCORE</span>
      </div>
      <button
        ref={triggerRef}
        className="ranking-why-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            updatePosition();
            window.dispatchEvent(new Event('discover:ranking-popover-open'));
            setOpen(true);
          }
        }}
      >
        <Info size={13} />
        Why this result?
        <ChevronDown size={14} className={open ? 'is-open' : ''} />
      </button>
      {open &&
        createPortal(
          <section
            ref={panelRef}
            className="ranking-why-popover"
            id={panelId}
            role="dialog"
            tabIndex={-1}
            aria-label={`Why ${ranking.experience.title} ranked here`}
            style={{ top: position.top, left: position.left }}
          >
            <div className="ranking-popover-heading">
              <div>
                <span>RANKING EXPLANATION</span>
                <strong>
                  {CONTEXT_LABELS[ranking.explanation.context]} ·{' '}
                  {STRATEGY_LABELS[ranking.explanation.strategy]}
                </strong>
              </div>
              <b>
                {ranking.score.toFixed(1)}
                <small> / 100</small>
              </b>
            </div>
            <p className="ranking-popover-summary">
              {ranking.explanation.context === 'recommended'
                ? 'This experience qualified for recommendations and was scored using your active discovery preferences.'
                : `This experience qualified for ${CONTEXT_LABELS[ranking.explanation.context]} and was ranked using your active discovery preferences.`}
            </p>
            <div className="ranking-score-reconciliation">
              <span>
                Weighted signals <strong>{displayedWeightedScore.toFixed(1)}</strong>
              </span>
              <span>
                Reranking penalty{' '}
                <strong>
                  {ranking.explanation.diversityPenalty > 0 ? '+' : ''}
                  {ranking.explanation.diversityPenalty.toFixed(1)}
                </strong>
              </span>
              <span>
                Applied score adjustment{' '}
                <strong>
                  {displayedDiversityAdjustment > 0 ? '+' : ''}
                  {displayedDiversityAdjustment.toFixed(1)}
                </strong>
              </span>
              <span>
                Final score <strong>{displayedFinalScore.toFixed(1)}</strong>
              </span>
            </div>
            <div className="ranking-contributions">
              {signals.map((signal) => (
                <div
                  className={`ranking-contribution ${signal.enabled ? '' : 'is-disabled'}`}
                  key={signal.id}
                >
                  <div>
                    <span>
                      {signal.label}
                      {signal.enabled ? '' : ' · disabled'}
                    </span>
                    <strong>{(displayedContributions.get(signal.id) ?? 0).toFixed(1)} pts</strong>
                  </div>
                  <div className="ranking-contribution-track">
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, signal.contribution))}%`,
                      }}
                    />
                  </div>
                  <small>
                    {signal.normalizedScore.toFixed(0)} signal ×{' '}
                    {(signal.configuredWeight * 100).toFixed(0)}% preference ×{' '}
                    {signal.contextMultiplier.toFixed(2)} context factor →{' '}
                    {(signal.effectiveWeight * 100).toFixed(1)}% effective weight
                  </small>
                </div>
              ))}
            </div>
            <div className="ranking-eligibility">
              <strong>Eligibility</strong>
              {ranking.explanation.eligibilityReasons.map((reason) => (
                <span key={reason}>✓ {reason}</span>
              ))}
            </div>
            {ranking.explanation.reasons.length > 0 && (
              <div className="ranking-reasons">
                <strong>Top contributors</strong>
                {ranking.explanation.reasons.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            )}
          </section>,
          document.body,
        )}
    </div>
  );
}
