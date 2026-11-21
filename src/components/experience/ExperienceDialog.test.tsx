import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getMockExperience } from '@/data/mocks/catalog';
import { ExperienceDialog } from './ExperienceDialog';

describe('ExperienceDialog', () => {
  it('renders experience details in an accessible dialog', () => {
    const experience = getMockExperience('deep-descent');

    render(<ExperienceDialog experience={experience} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: experience.title })).toBeInTheDocument();
    expect(screen.getByText(experience.description)).toBeInTheDocument();
  });

  it('notifies the owner when the dialog is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ExperienceDialog experience={getMockExperience('deep-descent')} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the sample launch notice after the play action', async () => {
    const user = userEvent.setup();

    render(
      <ExperienceDialog experience={getMockExperience('deep-descent')} onClose={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /play on roblox/i }));

    expect(
      screen.getByText('This sample experience does not have a Roblox launch URL yet.'),
    ).toBeInTheDocument();
  });
});
