import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { experiences } from '@/data/mocks/experiences';
import { DEFAULT_RANKING_CONFIGURATION, rankForContext } from '../engine/ranking';
import { RankingWhyPopover } from './RankingWhyPopover';

afterEach(() => cleanup());

const ranked = rankForContext(experiences, DEFAULT_RANKING_CONFIGURATION, 'recommended', {
  now: new Date('2026-11-21T00:00:00.000Z'),
  limit: 2,
});

describe('RankingWhyPopover', () => {
  it('shows the score explanation without expanding the result row', () => {
    const item = ranked[0];

    if (!item) throw new Error('Expected a ranked fixture.');

    render(<RankingWhyPopover ranking={item} />);
    fireEvent.click(screen.getByRole('button', { name: /why this result/i }));
    expect(
      screen.getByRole('dialog', { name: `Why ${item.experience.title} ranked here` }),
    ).toBeTruthy();
    expect(screen.getByText('RANKING EXPLANATION')).toBeTruthy();
    expect(screen.getByText('Weighted signals')).toBeTruthy();
    expect(screen.getByText('Final Score')).toBeTruthy();
  });

  it('keeps only one explanation open and restores focus on Escape', async () => {
    const first = ranked[0];
    const second = ranked[1];

    if (!first || !second) throw new Error('Expected two ranked fixtures.');

    render(
      <>
        <RankingWhyPopover ranking={first} />
        <RankingWhyPopover ranking={second} />
      </>,
    );
    const triggers = screen.getAllByRole('button', { name: /why this result/i });
    const firstTrigger = triggers[0];
    const secondTrigger = triggers[1];

    if (!firstTrigger || !secondTrigger)
      throw new Error('Expected two ranking explanation triggers.');

    fireEvent.click(firstTrigger);
    fireEvent.click(secondTrigger);

    // Base UI keeps the exiting popup mounted while its close animation runs.
    // Count only popups in the open state, not transition-retained DOM nodes.
    await waitFor(() => {
      expect(
        screen.queryAllByRole('dialog').filter((dialog) => dialog.hasAttribute('data-open')),
      ).toHaveLength(1);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(
        screen.queryAllByRole('dialog').filter((dialog) => dialog.hasAttribute('data-open')),
      ).toHaveLength(0);
    });
    expect(document.activeElement).toBe(secondTrigger);
  });
});
