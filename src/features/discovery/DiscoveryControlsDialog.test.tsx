import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_RANKING_CONFIGURATION, type RankingConfiguration } from './engine/ranking';
import { DiscoveryControlsDialog } from './DiscoveryControlsDialog';

afterEach(() => cleanup());

describe('DiscoveryControlsDialog', () => {
  it('calls onClose from the library dialog close control', () => {
    const onClose = vi.fn();

    render(
      <DiscoveryControlsDialog
        open
        configuration={DEFAULT_RANKING_CONFIGURATION}
        onClose={onClose}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close discovery controls' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles a ranking signal through the Base UI switch', () => {
    const onApply = vi.fn<(configuration: RankingConfiguration) => void>();

    render(
      <DiscoveryControlsDialog
        open
        configuration={DEFAULT_RANKING_CONFIGURATION}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    const affinitySwitch = screen.getByRole('switch', { name: 'User affinity' });

    expect(affinitySwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(affinitySwitch);
    fireEvent.click(screen.getByRole('button', { name: /Apply configuration/ }));

    expect(
      onApply.mock.calls[0]?.[0].signals.find((signal) => signal.id === 'affinity')?.enabled,
    ).toBe(false);
  });

  it('applies the selected ranking strategy and closes the dialog', async () => {
    const onApply = vi.fn<(configuration: RankingConfiguration) => void>();
    const onClose = vi.fn();

    render(
      <DiscoveryControlsDialog
        open
        configuration={DEFAULT_RANKING_CONFIGURATION}
        onClose={onClose}
        onApply={onApply}
      />,
    );

    const user = userEvent.setup();
    const strategySelect = screen.getByRole('combobox', { name: 'Ranking strategy' });

    // Base UI Select responds to the complete pointer interaction sequence;
    // fireEvent.click / synthetic keydown do not model that interaction.
    await user.click(strategySelect);
    await user.click(await screen.findByRole('option', { name: /Popularity-first/ }));
    fireEvent.click(screen.getByRole('button', { name: /Apply configuration/ }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0].strategy).toBe('popularity');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
