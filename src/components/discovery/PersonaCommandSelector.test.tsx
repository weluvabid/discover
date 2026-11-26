import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { PersonaCommandSelector } from './PersonaCommandSelector';
import type { DiscoveryPersona } from '@/types/experience';

afterEach(() => cleanup());

const personas: DiscoveryPersona[] = [
  {
    id: 'competitive-climber',
    label: 'Competitive climber',
    description: 'Competitive progression and skill mastery.',
    preferences: ['Action RPG', 'Racing'],
  },
  {
    id: 'social-explorer',
    label: 'Social explorer',
    description: 'Shared experiences and exploration.',
    preferences: ['Co-op', 'Exploration'],
  },
];

describe('PersonaCommandSelector', () => {
  it('shows only the selected persona avatar and opens the searchable command palette', () => {
    render(
      <PersonaCommandSelector
        personas={personas}
        selectedPersonaId="competitive-climber"
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Play style: Competitive climber/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Choose a play style' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Play style: Competitive climber/ }));

    expect(screen.getByRole('dialog', { name: 'Choose a play style' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search play styles...')).toBeInTheDocument();
    expect(screen.getByText('Social explorer')).toBeInTheDocument();
  });

  it('selects a persona and closes the command palette', async () => {
    const onSelect = vi.fn();

    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose a play style' });

    fireEvent.click(screen.getByText('Social explorer'));

    expect(onSelect).toHaveBeenCalledWith('social-explorer');
    await waitForElementToBeRemoved(dialog);
  });

  it('visibly highlights the active option during keyboard navigation', () => {
    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));

    const input = screen.getByPlaceholderText('Search play styles...');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const activeOption = screen
      .getAllByRole('option')
      .find((option) => option.getAttribute('aria-selected') === 'true');

    expect(activeOption).toBeDefined();
    expect(activeOption).toHaveClass('aria-selected:bg-accent');
    expect(activeOption).toHaveClass('aria-selected:text-accent-foreground');
  });

  it('does not leave the search input focused while scrolling persona options on touch', () => {
    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));

    const input = screen.getByPlaceholderText('Search play styles...');
    const list = screen.getByRole('listbox');

    input.focus();
    expect(input).toHaveFocus();

    fireEvent.touchMove(list);

    expect(input).not.toHaveFocus();
  });

  it('keeps the persona list scrollable while the footer remains in the bounded dialog', () => {
    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));

    const dialog = screen.getByRole('dialog', { name: 'Choose a play style' });
    const command = document.querySelector('[data-slot="command"]');
    const list = screen.getByRole('listbox');
    const footer = document.querySelector('[data-slot="persona-command-footer"]');

    expect(dialog).toHaveClass('h-[min(42rem,calc(100dvh-2rem))]');
    expect(command).toHaveClass('min-h-0', 'flex-1');
    expect(list).toHaveClass('min-h-0', 'flex-1', 'max-h-none');
    expect(footer).toHaveClass('shrink-0');
  });

  it('shows the all-play-styles option and device-persistence explanation', () => {
    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));

    expect(screen.getByText('All play styles')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your selected play style is saved on this device and used across discovery.',
      ),
    ).toBeInTheDocument();
  });
});
