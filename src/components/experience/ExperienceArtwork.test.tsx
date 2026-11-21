import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExperienceArtwork } from './ExperienceArtwork';

afterEach(() => cleanup());

describe('ExperienceArtwork', () => {
  it('does not render an image when the source is empty', () => {
    const { container } = render(<ExperienceArtwork src="" alt="Missing artwork" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Artwork unavailable')).toBeInTheDocument();
  });

  it('renders a valid artwork source', () => {
    render(<ExperienceArtwork src="https://example.com/artwork.webp" alt="Game artwork" />);

    expect(screen.getByRole('img', { name: 'Game artwork' })).toHaveAttribute(
      'src',
      'https://example.com/artwork.webp',
    );
  });
});
