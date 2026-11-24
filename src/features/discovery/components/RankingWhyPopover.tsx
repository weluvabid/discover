import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRankScoreClass } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RankedExperience } from '@/features/discovery/engine/ranking';
import { DISCOVERY_CONTEXT_LABELS, DISCOVERY_STRATEGY_LABELS } from '@/config/discovery';

const CONTEXT_LABELS = DISCOVERY_CONTEXT_LABELS;
const STRATEGY_LABELS = DISCOVERY_STRATEGY_LABELS;

interface RankingWhyPopoverProps {
  ranking: RankedExperience;
  showScore?: boolean;
}

function getSignalColor(id: string): string {
  switch (id) {
    case 'quality':
      return 'bg-blue-500';
    case 'relevance':
      return 'bg-violet-500';
    case 'affinity':
      return 'bg-emerald-500';
    case 'diversity':
      return 'bg-amber-500';
    case 'freshness':
      return 'bg-cyan-500';
    case 'popularity':
      return 'bg-slate-500';
    default:
      return 'bg-muted-foreground';
  }
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
          <strong className={`text-lg font-bold tabular-nums ${getRankScoreClass(ranking.score)}`}>
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
              <dd
                className={`shrink-0 text-lg font-bold tabular-nums ${getRankScoreClass(ranking.score)}`}
              >
                {displayedFinalScore.toFixed(1)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <strong className="text-sm font-semibold">Signal composition</strong>
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label="Effective ranking signal weights"
              >
                {signals
                  .filter((signal) => signal.enabled && signal.effectiveWeight > 0)
                  .map((signal) => {
                    const width = Math.max(0, Math.min(100, signal.effectiveWeight * 100));

                    return (
                      <span
                        key={signal.id}
                        className={`h-full ${getSignalColor(signal.id)}`}
                        style={{ width: `${width}%` }}
                      />
                    );
                  })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {signals.map((signal) => (
                <div
                  className={`flex items-center gap-2 ${signal.enabled ? '' : 'opacity-45'}`}
                  key={signal.id}
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${getSignalColor(signal.id)}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                    {signal.label}
                  </span>
                  <strong className="shrink-0 text-sm tabular-nums">
                    {(signal.effectiveWeight * 100).toFixed(1)}%
                  </strong>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`How ${signal.label} is calculated`}
                        />
                      }
                    >
                      <Info size={14} aria-hidden="true" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-[min(20rem,calc(100vw-2rem))] gap-2 text-sm"
                    >
                      <strong className="font-semibold">{signal.label}</strong>
                      <p className="text-muted-foreground">
                        {signal.normalizedScore.toFixed(0)} signal ×{' '}
                        {(signal.configuredWeight * 100).toFixed(0)}% preference ×{' '}
                        {signal.contextMultiplier.toFixed(2)} context factor
                      </p>
                      <p className="font-medium tabular-nums">
                        {(signal.effectiveWeight * 100).toFixed(1)}% effective weight
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
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
