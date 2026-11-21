import { useEffect, useRef } from 'react';
import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRankingDraft } from '@/features/discovery/hooks/use-ranking-draft';
import type { RankingConfiguration, RankingSignalId, RankingStrategyId } from './engine/ranking';

interface DiscoveryControlsDialogProps {
  open: boolean;
  configuration: RankingConfiguration;
  onClose: () => void;
  onApply: (configuration: RankingConfiguration) => void;
}

const strategyOptions: { id: RankingStrategyId; label: string; description: string }[] = [
  { id: 'balanced', label: 'Balanced', description: 'Even distribution' },
  { id: 'popularity', label: 'Popularity-first', description: 'Trending and active players' },
  { id: 'personalized', label: 'Personalized', description: 'Player affinity focus' },
  { id: 'discovery', label: 'Discovery-first', description: 'Hidden gems and novelty' },
];

const signalOrder: RankingSignalId[] = [
  'affinity',
  'quality',
  'relevance',
  'freshness',
  'popularity',
  'diversity',
];

export function DiscoveryControlsDialog({
  open,
  configuration,
  onClose,
  onApply,
}: DiscoveryControlsDialogProps) {
  const {
    draft,
    dirty,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
    discardDraft,
  } = useRankingDraft(configuration);
  const strategyListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const selected = strategyListRef.current?.querySelector<HTMLElement>('[data-selected-strategy="true"]');
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [draft.strategy, open]);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleDiscard = () => {
    discardDraft();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleDiscard();
      }}
    >
      <DialogContent
        className="flex h-[min(92dvh,56rem)] max-h-[calc(100dvh-1rem)] w-[min(72rem,calc(100vw-1rem))] max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:h-[min(88dvh,56rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(72rem,calc(100vw-2rem))]"
        overlayClassName="bg-background/85 backdrop-blur-sm"
        showCloseButton={false}
        aria-labelledby="discovery-controls-title"
        aria-describedby="discovery-controls-description"
      >
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          <header className="flex shrink-0 flex-col gap-3 border-b border-border p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                <SlidersHorizontal className="block" size={19} aria-hidden="true" />
              </span>
              <DialogClose
                render={
                  <Button
                    className="size-9"
                    variant="ghost"
                    size="icon"
                    aria-label="Close discovery controls"
                  />
                }
              >
                <X size={18} />
              </DialogClose>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <DialogTitle className="text-lg font-bold tracking-tight" id="discovery-controls-title">
                Discovery Controls
              </DialogTitle>
              <span
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground"
                data-dirty={dirty}
              >
                <i className="size-1.5 rounded-full bg-muted-foreground" />
                {dirty ? 'Draft modified' : 'Current configuration'}
              </span>
            </div>
            <DialogDescription
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground"
              id="discovery-controls-description"
            >
              Configure the signals that shape your recommendations across Discover.
            </DialogDescription>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
              <section className="flex flex-col gap-3" aria-labelledby="ranking-strategies-heading">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="ranking-strategies-heading" className="text-xs font-bold tracking-wider text-muted-foreground">
                      RANKING STRATEGIES
                    </h3>
                    <p className="text-sm text-muted-foreground">Choose a starting point</p>
                  </div>
                </div>
                <div ref={strategyListRef} className="min-w-0 max-w-full">
                  <Tabs
                    value={draft.strategy}
                    onValueChange={(value) => {
                      if (strategyOptions.some((option) => option.id === value)) {
                        selectStrategy(value as RankingStrategyId);
                      }
                    }}
                    className="min-w-0 max-w-full"
                  >
                    <TabsList
                      aria-label="Ranking strategies"
                      className="flex h-auto w-full max-w-full justify-start gap-2 overflow-x-auto rounded-xl bg-transparent p-0"
                    >
                      {strategyOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          data-selected-strategy={draft.strategy === option.id ? 'true' : 'false'}
                          className="h-auto min-h-12 w-56 max-w-[80vw] min-w-0 flex-none flex-col items-start gap-1 overflow-hidden rounded-xl border border-border bg-secondary px-3 py-2 text-left whitespace-normal data-active:bg-accent data-active:text-foreground"
                        >
                          <strong className="block w-full truncate text-sm">{option.label}</strong>
                          <span className="block w-full min-w-0 truncate text-xs text-muted-foreground">{option.description}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </section>

              <section className="flex flex-col gap-3" aria-labelledby="ranking-signals-heading">
                <h3 id="ranking-signals-heading" className="text-xs font-bold tracking-wider text-muted-foreground">
                  RANKING SIGNALS
                </h3>

                <div className="grid gap-3">
                  {signalOrder.map((id) => {
                    const signal = draft.signals.find((item) => item.id === id);
                    if (!signal) return null;

                    const enabledCount = draft.signals.filter((item) => item.enabled).length;
                    const switchId = `signal-enabled-${signal.id}`;

                    return (
                      <div
                        className={`grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-background p-4 ${signal.enabled ? '' : 'opacity-55'}`}
                        key={signal.id}
                      >
                        <div className="col-span-2 flex min-w-0 items-start gap-3">
                          <Switch
                            id={switchId}
                            className="mt-0.5 shrink-0"
                            checked={signal.enabled}
                            disabled={signal.enabled && enabledCount === 1}
                            aria-labelledby={`${switchId}-label`}
                            aria-describedby={`${switchId}-description`}
                            onCheckedChange={(checked) => toggleDraftSignal(signal.id, checked)}
                          />
                          <div className="grid min-w-0 gap-1">
                            <strong className="text-sm" id={`${switchId}-label`}>{signal.label}</strong>
                            <small
                              className="text-xs leading-relaxed text-muted-foreground"
                              id={`${switchId}-description`}
                            >
                              {signal.description}
                            </small>
                          </div>
                        </div>
                        <div className="col-span-2 flex min-w-0 items-center gap-4">
                          <Slider
                            className="min-w-0 flex-1"
                            min={0}
                            max={100}
                            step={1}
                            value={[signal.weight]}
                            disabled={!signal.enabled || enabledCount === 1}
                            aria-label={`${signal.label} weight`}
                            onValueChange={(values) => {
                              const nextWeight = values[0];
                              if (nextWeight !== undefined) {
                                updateDraftSignalWeight(signal.id, nextWeight);
                              }
                            }}
                          />
                          <output className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                            {signal.weight}%
                          </output>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-3 md:p-4">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    onClick={resetDraft}
                    aria-label="Reset defaults"
                  />
                }
              >
                <RotateCcw size={17} />
              </TooltipTrigger>
              <TooltipContent>Reset defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={handleDiscard}
                    aria-label="Discard draft"
                  />
                }
              >
                <X size={17} />
              </TooltipTrigger>
              <TooltipContent>Discard draft</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    className="size-10 !bg-[var(--roblox-blue)] !text-white hover:!bg-[color-mix(in_srgb,var(--roblox-blue)_88%,black)]"
                    onClick={handleApply}
                    aria-label="Apply configuration"
                  >
                    <Check size={18} aria-hidden="true" />
                  </Button>
                }
              />
              <TooltipContent>Apply configuration</TooltipContent>
            </Tooltip>
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
}
