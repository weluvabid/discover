import { useEffect, useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    const closeWhenAnotherOpens = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;

      if (detail !== popoverId) setOpen(false);
    };

    window.addEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);

    return () => {
      window.removeEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);
    };
  }, [open, popoverId]);

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
    <div className="ranking-inspector">
      <div
        className="ranking-score"
        aria-label={`Rank score ${ranking.score.toFixed(1)} out of 100`}
      >
        <strong>{ranking.score.toFixed(1)}</strong>
        <span>RANK SCORE</span>
      </div>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            window.dispatchEvent(
              new CustomEvent('discover:ranking-popover-open', { detail: popoverId }),
            );
          }

          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger
          render={
            <Button
              className="ranking-why-trigger"
              variant="outline"
              size="sm"
              aria-label="Why this result?"
            />
          }
        >
          <Info size={13} />
          Why this result?
          <ChevronDown size={14} className={open ? 'is-open' : ''} />
        </PopoverTrigger>
          <PopoverContent
            className="ranking-why-popover"
            align="end"
            side="bottom"
            sideOffset={8}
            role="dialog"
            aria-label={`Why ${ranking.experience.title} ranked here`}
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
          </PopoverContent>
      </Popover>
    </div>
  );
}
