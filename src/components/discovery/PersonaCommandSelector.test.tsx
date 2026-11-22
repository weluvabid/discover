import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('selects a persona and closes the command palette', () => {
    const onSelect = vi.fn();

    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));
    fireEvent.click(screen.getByText('Social explorer'));

    expect(onSelect).toHaveBeenCalledWith('social-explorer');
    expect(screen.queryByRole('dialog', { name: 'Choose a play style' })).not.toBeInTheDocument();
  });

  it('explains the completed ranking fixes inside the palette', () => {
    render(<PersonaCommandSelector personas={personas} selectedPersonaId="" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose a play style' }));

    expect(screen.getByText(/diversity now follows its slider/)).toBeInTheDocument();
    expect(screen.getByText(/relevance no longer rewards longer descriptions/)).toBeInTheDocument();
  });
});
