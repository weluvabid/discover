import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GenreFilters } from './GenreFilters';

describe('GenreFilters', () => {
  it('exposes the selected genre as the active tab', () => {
    render(<GenreFilters selected="All" onSelect={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reports the selected genre when a tab is activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<GenreFilters selected="All" onSelect={onSelect} />);

    await user.click(screen.getByRole('tab', { name: 'Horror' }));

    expect(onSelect).toHaveBeenCalledWith('Horror');
  });
});
