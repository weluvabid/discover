import './styles/controls.css';
import './styles/controls-responsive.css';
import { useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Info, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useRankingDraft } from '@/features/discovery/hooks/use-ranking-draft';
import {
  type RankingConfiguration,
  type RankingSignalId,
  type RankingStrategyId,
} from './engine/ranking';

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
const signalLabels: Record<RankingSignalId, string> = {
  affinity: 'Affinity',
  quality: 'Quality',
  relevance: 'Relevance',
  freshness: 'Freshness',
  popularity: 'Popularity',
  diversity: 'Diversity',
};

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
    mobileTab,
    setMobileTab,
    expandedId,
    setExpandedId,
    preview,
    baselinePositions,
    totalWeight,
    distribution,
    selectStrategy,
    toggleDraftSignal,
    updateDraftSignalWeight,
    resetDraft,
  } = useRankingDraft(configuration);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!open || !dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleClose = () => onClose();

    dialog.addEventListener('close', handleClose);

    return () => {
      dialog.removeEventListener('close', handleClose);

      if (dialog.open) {
        dialog.close();
      }
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

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
                  <i /> {dirty ? 'Draft modified' : 'Draft simulation'}
                </span>
              </div>
              <p>Tune how experiences are discovered, weighted and dynamically ranked.</p>
            </div>
          </div>
          <div className="controls-header-actions">
            <div className="strategy-select-label">
              <label htmlFor="discovery-ranking-strategy">Strategy</label>
              <select
                id="discovery-ranking-strategy"
                value={draft.strategy}
                onChange={(event) => {
                  const strategy = event.target.value as RankingStrategyId;

                  selectStrategy(strategy);
                }}
                aria-label="Ranking strategy"
              >
                {strategyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="controls-close"
              onClick={onClose}
              aria-label="Close discovery controls"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="mobile-controls-tabs" role="tablist" aria-label="Discovery controls panels">
          <button
            role="tab"
            aria-selected={mobileTab === 'signals'}
            className={mobileTab === 'signals' ? 'is-active' : ''}
            onClick={() => setMobileTab('signals')}
          >
            Ranking Signals
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={mobileTab === 'preview' ? 'is-active' : ''}
            onClick={() => setMobileTab('preview')}
          >
            Live Preview <span>5</span>
          </button>
        </div>

        <div className="controls-workspace">
          <div
            className={`controls-config-panel ${mobileTab === 'preview' ? 'mobile-hidden' : ''}`}
          >
            <div className="controls-panel-heading">
              <div>
                <span className="controls-eyebrow">RANKING STRATEGIES</span>
                <small>Choose a starting point</small>
              </div>
              <span className="baseline-label">Default baseline</span>
            </div>
            <div className="strategy-grid">
              {strategyOptions.map((option) => (
                <button
                  key={option.id}
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
                <small>Adjust factor weights to recalculate rankings</small>
              </div>
              <span className="weight-total">
                Total: <strong>{totalWeight}%</strong>
              </span>
            </div>
            <div className="signal-list">
              {draft.signals.map((signal) => (
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
                        disabled={
                          signal.enabled &&
                          draft.signals.filter((item) => item.enabled).length === 1
                        }
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
                    disabled={
                      !signal.enabled || draft.signals.filter((item) => item.enabled).length === 1
                    }
                    aria-label={`${signal.label} weight`}
                    onChange={(event) =>
                      updateDraftSignalWeight(signal.id, Number(event.target.value))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="controls-note">
              <Info size={14} />
              <span>
                Enabled signals are automatically normalized to 100%. Disabled signals contribute
                nothing.
              </span>
            </div>
          </div>

          <div
            className={`controls-preview-panel ${mobileTab === 'signals' ? 'mobile-hidden' : ''}`}
          >
            <div className="preview-heading">
              <div>
                <div className="preview-title-line">
                  <span className="controls-eyebrow">RANKING PREVIEW</span>
                  <span className="model-tag">Deterministic model</span>
                </div>
                <small>Top 5 experiences re-ranked using active weights</small>
              </div>
              <div className="distribution-chips">
                {distribution.map(([label, percentage]) => (
                  <span key={label}>
                    {label} {percentage}%
                  </span>
                ))}
              </div>
            </div>
            <div className="ranked-preview-list">
              {preview.map((item) => {
                const previous = baselinePositions.get(item.experience.id) ?? item.position;
                const movement = previous - item.position;
                const expanded = expandedId === item.experience.id;

                return (
                  <article
                    className={`ranked-preview-card ${expanded ? 'is-expanded' : ''}`}
                    key={item.experience.id}
                  >
                    <div className="ranked-preview-main">
                      <div className="rank-position">
                        <strong>#{item.position}</strong>
                        <span
                          className={
                            movement > 0 ? 'movement-up' : movement < 0 ? 'movement-down' : ''
                          }
                        >
                          {movement > 0 ? `↑ +${movement}` : movement < 0 ? `↓ ${movement}` : '—'}
                        </span>
                      </div>
                      <img src={item.experience.artwork.thumbnail} alt="" />
                      <div className="ranked-experience-copy">
                        <strong>{item.experience.title}</strong>
                        <span>
                          {item.experience.subgenre} ·{' '}
                          {formatActive(item.experience.metrics.activePlayers)} active
                        </span>
                      </div>
                      <div className="rank-score">
                        <strong>{item.score.toFixed(1)}</strong>
                        <small>RANK SCORE</small>
                      </div>
                      <button
                        className="why-button"
                        onClick={() => setExpandedId(expanded ? null : item.experience.id)}
                        aria-expanded={expanded}
                      >
                        {expanded ? 'Hide details' : 'Why this result?'}{' '}
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                    {expanded && (
                      <div className="score-breakdown">
                        <div className="breakdown-heading">
                          <strong>Signal contribution breakdown</strong>
                          <span>Weight × normalized signal</span>
                        </div>
                        <div className="breakdown-grid">
                          {signalOrder.map((id) => (
                            <div className="breakdown-cell" key={id}>
                              <span>{signalLabels[id]}</span>
                              <strong>{item.factors[id].toFixed(1)}</strong>
                            </div>
                          ))}
                        </div>
                        <p>
                          Score is calculated from the same weighted factors used to order this
                          preview.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="preview-footer">
              <span>
                <i /> {preview.length} experiences ranked
              </span>
              <span>Distribution updates with ranking</span>
            </div>
          </div>
        </div>

        <footer className="controls-footer">
          <p>
            <Info size={14} /> Changes update your Discover recommendations immediately when
            applied.
          </p>
          <div className="controls-footer-actions">
            <button className="reset-controls" onClick={resetDraft}>
              <RotateCcw size={13} /> Reset defaults
            </button>
            <button className="discard-controls" onClick={onClose}>
              Discard draft
            </button>
            <button className="apply-controls" onClick={handleApply}>
              Apply configuration <Check size={15} />
            </button>
          </div>
        </footer>
      </section>
    </dialog>
  );
}

function formatActive(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}
