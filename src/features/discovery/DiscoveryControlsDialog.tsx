import './styles/controls.css';
import './styles/controls-responsive.css';
import { useEffect, useRef } from 'react';
import { Check, Info, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    draft,
    dirty,
    totalWeight,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
  } = useRankingDraft(configuration);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!open || !dialog) return;

    if (!dialog.open) dialog.showModal();

    const handleClose = () => onClose();

    dialog.addEventListener('close', handleClose);

    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose, open]);

  if (!open) return null;

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="discovery-controls-dialog"
      aria-labelledby="discovery-controls-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <section className="discovery-controls">
        <header className="controls-header">
          <div className="controls-heading">
            <span className="controls-icon">
              <SlidersHorizontal size={19} />
            </span>
            <div>
              <div className="controls-title-line">
                <h2 id="discovery-controls-title">Discovery Controls</h2>
                <span className="draft-status">
                  <i /> {dirty ? 'Draft modified' : 'Current configuration'}
                </span>
              </div>
              <p>Configure the signals that shape your recommendations across Discover.</p>
            </div>
          </div>
          <div className="controls-header-actions">
            <button
              className="controls-close"
              type="button"
              onClick={onClose}
              aria-label="Close discovery controls"
            >
              <X size={18} />
            </button>
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
            <div className="strategy-grid">
              {strategyOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`strategy-option ${draft.strategy === option.id ? 'is-selected' : ''}`}
                  onClick={() => selectStrategy(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                  {draft.strategy === option.id && <i />}
                </button>
              ))}
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

                return (
                  <div
                    className={`signal-card ${signal.enabled ? '' : 'is-disabled'}`}
                    key={signal.id}
                  >
                    <div className="signal-card-heading">
                      <div className="signal-label">
                        <input
                          id={`signal-enabled-${signal.id}`}
                          type="checkbox"
                          checked={signal.enabled}
                          disabled={signal.enabled && enabledCount === 1}
                          onChange={(event) => toggleDraftSignal(signal.id, event.target.checked)}
                        />
                        <label htmlFor={`signal-enabled-${signal.id}`}>
                          <strong>{signal.label}</strong>
                          <small>{signal.description}</small>
                        </label>
                      </div>
                      <output>{signal.weight}%</output>
                    </div>
                    <input
                      className="signal-range"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={signal.weight}
                      disabled={!signal.enabled || enabledCount === 1}
                      aria-label={`${signal.label} weight`}
                      onChange={(event) =>
                        updateDraftSignalWeight(signal.id, Number(event.target.value))
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className="controls-note">
              <Info size={14} />
              <span>
                Enabled signals are normalized to 100%. These preferences influence ordering within
                each section without changing its eligibility rules.
              </span>
            </div>
          </div>
        </div>

        <footer className="controls-footer">
          <p>
            <Info size={14} /> Apply changes to refresh your Explore recommendations.
          </p>
          <div className="controls-footer-actions">
            <button className="reset-controls" type="button" onClick={resetDraft}>
              <RotateCcw size={13} /> Reset defaults
            </button>
            <button className="discard-controls" type="button" onClick={onClose}>
              Discard draft
            </button>
            <button className="apply-controls" type="button" onClick={handleApply}>
              Apply configuration <Check size={15} />
            </button>
          </div>
        </footer>
      </section>
    </dialog>
  );
}
