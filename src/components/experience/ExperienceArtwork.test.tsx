import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExperienceArtwork } from './ExperienceArtwork';

afterEach(() => cleanup());

describe('ExperienceArtwork', () => {
  it('renders a consistent skeleton until the image has loaded', () => {
    const { container } = render(
      <ExperienceArtwork src="https://example.com/artwork.webp" alt="Game artwork" />,
    );

    expect(screen.getByRole('img', { name: 'Game artwork' })).toHaveAttribute(
      'src',
      'https://example.com/artwork.webp',
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    fireEvent.load(screen.getByRole('img', { name: 'Game artwork' }));

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
  });

  it('does not render an image when the source is empty', () => {
    const { container } = render(<ExperienceArtwork src="" alt="Missing artwork" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Missing artwork unavailable' })).toBeInTheDocument();
  });

  it('shows the same fallback when an image fails', () => {
    render(<ExperienceArtwork src="https://example.com/broken.webp" alt="Broken artwork" />);

    fireEvent.error(screen.getByRole('img', { name: 'Broken artwork' }));

    expect(screen.getByRole('img', { name: 'Broken artwork unavailable' })).toBeInTheDocument();
  });
});
