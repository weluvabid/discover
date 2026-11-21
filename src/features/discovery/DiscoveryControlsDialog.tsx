import { Check, Info, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
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
    totalWeight,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
  } = useRankingDraft(configuration);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] w-[min(72rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none"
        overlayClassName="bg-background/85 backdrop-blur-sm"
        showCloseButton={false}
        aria-labelledby="discovery-controls-title"
        aria-describedby="discovery-controls-description"
      >
        <section className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          <header className="flex items-center justify-between gap-4 border-b border-border p-4 md:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-foreground">
                <SlidersHorizontal size={19} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-bold tracking-tight" id="discovery-controls-title">
                    Discovery Controls
                  </DialogTitle>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground" data-dirty={dirty}>
                    <i className="size-1.5 rounded-full bg-muted-foreground" /> {dirty ? 'Draft modified' : 'Current configuration'}
                  </span>
                </div>
                <DialogDescription
                  className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground"
                  id="discovery-controls-description"
                >
                  Configure the signals that shape your recommendations across Discover.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DialogClose
                render={
                  <Button
                    className="size-8"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close discovery controls"
                  />
                }
              >
                <X size={18} />
              </DialogClose>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold tracking-wider text-muted-foreground">RANKING STRATEGIES</span>
                  <small className="block text-sm text-muted-foreground">Choose a starting point</small>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">Presets apply across all Explore sections</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Ranking strategies">
                {strategyOptions.map((option) => {
                  const selected = draft.strategy === option.id;

                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={selected ? 'secondary' : 'outline'}
                      className="relative h-auto min-h-16 flex-col items-start justify-center gap-1 rounded-xl p-3 text-left"
                      aria-pressed={selected}
                      onClick={() => selectStrategy(option.id)}
                    >
                      <strong className="text-sm">{option.label}</strong>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                      {selected && <span aria-hidden="true" className="absolute right-3 top-3 size-1.5 rounded-full bg-foreground" />}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold tracking-wider text-muted-foreground">RANKING SIGNALS</span>
                  <small className="block text-sm text-muted-foreground">Adjust the influence of each signal</small>
                </div>
                <span className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                  Total: <strong className="text-foreground">{totalWeight}%</strong>
                </span>
              </div>
              <div className="grid gap-3">
                {signalOrder.map((id) => {
                  const signal = draft.signals.find((item) => item.id === id);

                  if (!signal) return null;

                  const enabledCount = draft.signals.filter((item) => item.enabled).length;
                  const switchId = `signal-enabled-${signal.id}`;

                  return (
                    <div
                      className={`rounded-xl border border-border bg-background p-4 ${signal.enabled ? '' : 'opacity-55'}`}
                      key={signal.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
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
                            <small className="text-xs leading-relaxed text-muted-foreground" id={`${switchId}-description`}>{signal.description}</small>
                          </div>
                        </div>
                        <output className="text-sm font-semibold tabular-nums">{signal.weight}%</output>
                      </div>
                      <Slider
                        className="mt-4"
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
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
                <Info size={14} />
                <span>
                  Enabled signals are normalized to 100%. These preferences influence ordering
                  within each section without changing its eligibility rules.
                </span>
              </div>
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t border-border p-4 md:flex-row md:items-center md:justify-between md:px-6">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info size={14} /> Apply changes to refresh your Explore recommendations.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button className="w-full" variant="ghost" onClick={resetDraft}>
                <RotateCcw size={13} /> Reset defaults
              </Button>
              <Button className="w-full" variant="outline" onClick={onClose}>
                Discard draft
              </Button>
              <Button className="w-full" onClick={handleApply}>
                Apply configuration <Check size={15} />
              </Button>
            </div>
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
}
