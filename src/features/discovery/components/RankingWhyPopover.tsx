import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
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
  showScore?: boolean;
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

export function RankingWhyPopover({ ranking, showScore = true }: RankingWhyPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    const closeWhenAnotherOpens = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;

      if (detail !== popoverId) setOpen(false);
    };

    window.addEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);

    return () => window.removeEventListener('discover:ranking-popover-open', closeWhenAnotherOpens);
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
  const displayedAdjustment = Number((displayedFinalScore - displayedWeightedScore).toFixed(1));
  const penalty = Number(ranking.explanation.diversityPenalty.toFixed(1));
  const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      {showScore && (
        <div
          className="flex items-baseline gap-2"
          aria-label={`Rank score ${ranking.score.toFixed(1)} out of 100`}
        >
          <strong className="text-lg font-bold tabular-nums text-foreground">
            {ranking.score.toFixed(1)}
          </strong>
          <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
            RANK SCORE
          </span>
        </div>
      )}
      <Popover
        open={open}
        onOpenChange={(nextOpen, eventDetails) => {
          if (nextOpen) {
            window.dispatchEvent(
              new CustomEvent('discover:ranking-popover-open', { detail: popoverId }),
            );
          }

          setOpen(nextOpen);

          if (!nextOpen && eventDetails.reason === 'escape-key') {
            triggerRef.current?.focus();
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              className="size-7 rounded-full text-muted-foreground"
              variant="ghost"
              size="icon-sm"
              aria-label="Why this result?"
              aria-expanded={open}
              ref={triggerRef}
            />
          }
        >
          <Info size={16} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          className="max-h-[min(80dvh,48rem)] w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] gap-4 overflow-y-auto overscroll-contain border border-border bg-popover p-4 text-popover-foreground shadow-xl sm:w-[28rem]"
          align="end"
          side="bottom"
          sideOffset={8}
          role="dialog"
          aria-label={`Why ${ranking.experience.title} ranked here`}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-muted-foreground">
              RANKING EXPLANATION
            </span>
            <strong className="text-base leading-snug">
              {CONTEXT_LABELS[ranking.explanation.context]} ·{' '}
              {STRATEGY_LABELS[ranking.explanation.strategy]}
            </strong>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {ranking.explanation.context === 'recommended'
              ? 'This experience qualified for recommendations and was scored using your active discovery preferences.'
              : `This experience qualified for ${CONTEXT_LABELS[ranking.explanation.context]} and was ranked using your active discovery preferences.`}
          </p>
          <dl
            className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/50 p-4 text-sm"
            aria-label="Score breakdown"
          >
            <div className="flex items-center justify-between gap-6">
              <dt className="text-muted-foreground">Weighted signals</dt>
              <dd className="shrink-0 font-bold tabular-nums">
                {displayedWeightedScore.toFixed(1)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6">
              <dt className="text-muted-foreground">Reranking penalty</dt>
              <dd className="shrink-0 font-bold tabular-nums">{formatSigned(penalty)}</dd>
            </div>
            <div className="flex items-center justify-between gap-6">
              <dt className="text-muted-foreground">Applied adjustment</dt>
              <dd className="shrink-0 font-bold tabular-nums">
                {formatSigned(displayedAdjustment)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-border pt-3">
              <dt className="font-semibold">Final Score</dt>
              <dd className="shrink-0 text-lg font-bold tabular-nums">
                {displayedFinalScore.toFixed(1)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-4">
            {signals.map((signal) => (
              <div
                className={`flex flex-col gap-2 ${signal.enabled ? '' : 'opacity-50'}`}
                key={signal.id}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {signal.label}
                    {signal.enabled ? '' : ' · disabled'}
                  </span>
                  <strong className="tabular-nums">
                    {(displayedContributions.get(signal.id) ?? 0).toFixed(1)} pts
                  </strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <i
                    className="block h-full rounded-full bg-muted-foreground"
                    style={{ width: `${Math.max(0, Math.min(100, signal.contribution))}%` }}
                  />
                </div>
                <small className="text-xs leading-relaxed text-muted-foreground">
                  {signal.normalizedScore.toFixed(0)} signal ×{' '}
                  {(signal.configuredWeight * 100).toFixed(0)}% preference ×{' '}
                  {signal.contextMultiplier.toFixed(2)} context factor →{' '}
                  {(signal.effectiveWeight * 100).toFixed(1)}% effective weight
                </small>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
            <strong className="font-semibold">Eligibility</strong>
            {ranking.explanation.eligibilityReasons.map((reason) => (
              <span key={reason} className="text-muted-foreground">
                ✓ {reason}
              </span>
            ))}
          </div>
          {ranking.explanation.reasons.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
              <strong className="font-semibold">Top contributors</strong>
              {ranking.explanation.reasons.map((reason) => (
                <span key={reason} className="text-muted-foreground">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
