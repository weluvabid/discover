import './styles/controls.css';
import './styles/controls-responsive.css';
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
        className="discovery-controls-dialog"
        overlayClassName="discovery-controls-overlay"
        showCloseButton={false}
        aria-labelledby="discovery-controls-title"
        aria-describedby="discovery-controls-description"
      >
        <section className="discovery-controls">
          <header className="controls-header">
            <div className="controls-heading">
              <span className="controls-icon">
                <SlidersHorizontal size={19} />
              </span>
              <div>
                <div className="controls-title-line">
                  <DialogTitle className="controls-dialog-title" id="discovery-controls-title">
                    Discovery Controls
                  </DialogTitle>
                  <span className="draft-status" data-dirty={dirty}>
                    <i /> {dirty ? 'Draft modified' : 'Current configuration'}
                  </span>
                </div>
                <DialogDescription
                  className="controls-dialog-description"
                  id="discovery-controls-description"
                >
                  Configure the signals that shape your recommendations across Discover.
                </DialogDescription>
              </div>
            </div>
            <div className="controls-header-actions">
              <DialogClose
                render={
                  <Button
                    className="controls-close"
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

          <div className="controls-workspace controls-workspace-single">
            <div className="controls-config-panel">
              <div className="controls-panel-heading">
                <div>
                  <span className="controls-eyebrow">RANKING STRATEGIES</span>
                  <small>Choose a starting point</small>
                </div>
                <span className="baseline-label">Presets apply across all Explore sections</span>
              </div>
              <div className="strategy-grid" role="group" aria-label="Ranking strategies">
                {strategyOptions.map((option) => {
                  const selected = draft.strategy === option.id;

                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={selected ? 'secondary' : 'outline'}
                      className={`strategy-option ${selected ? 'is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => selectStrategy(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                      {selected && <i aria-hidden="true" />}
                    </Button>
                  );
                })}
              </div>

              <div className="signals-heading">
                <div>
                  <span className="controls-eyebrow">RANKING SIGNALS</span>
                  <small>Adjust the influence of each signal</small>
                </div>
                <span className="weight-total">
                  Total: <strong>{totalWeight}%</strong>
                </span>
              </div>
              <div className="signal-list">
                {signalOrder.map((id) => {
                  const signal = draft.signals.find((item) => item.id === id);

                  if (!signal) return null;

                  const enabledCount = draft.signals.filter((item) => item.enabled).length;
                  const switchId = `signal-enabled-${signal.id}`;

                  return (
                    <div
                      className={`signal-card ${signal.enabled ? '' : 'is-disabled'}`}
                      key={signal.id}
                    >
                      <div className="signal-card-heading">
                        <div className="signal-label">
                          <Switch
                            id={switchId}
                            className="signal-switch"
                            checked={signal.enabled}
                            disabled={signal.enabled && enabledCount === 1}
                            aria-labelledby={`${switchId}-label`}
                            aria-describedby={`${switchId}-description`}
                            onCheckedChange={(checked) => toggleDraftSignal(signal.id, checked)}
                          />
                          <div className="signal-copy">
                            <strong id={`${switchId}-label`}>{signal.label}</strong>
                            <small id={`${switchId}-description`}>{signal.description}</small>
                          </div>
                        </div>
                        <output>{signal.weight}%</output>
                      </div>
                      <Slider
                        className="signal-range"
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
              <div className="controls-note">
                <Info size={14} />
                <span>
                  Enabled signals are normalized to 100%. These preferences influence ordering
                  within each section without changing its eligibility rules.
                </span>
              </div>
            </div>
          </div>

          <footer className="controls-footer">
            <p>
              <Info size={14} /> Apply changes to refresh your Explore recommendations.
            </p>
            <div className="controls-footer-actions">
              <Button className="reset-controls" variant="ghost" onClick={resetDraft}>
                <RotateCcw size={13} /> Reset defaults
              </Button>
              <Button className="discard-controls" variant="outline" onClick={onClose}>
                Discard draft
              </Button>
              <Button className="apply-controls" onClick={handleApply}>
                Apply configuration <Check size={15} />
              </Button>
            </div>
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
}
