import { useEffect, useState } from 'react';
import { BadgeCheck, ExternalLink, Gamepad2, X } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExperienceArtwork } from './ExperienceArtwork';

interface ExperienceDialogProps {
  experience: Experience | null;
  onClose: () => void;
}

export function ExperienceDialog({ experience, onClose }: ExperienceDialogProps) {
  const [launchNoticeFor, setLaunchNoticeFor] = useState<string | null>(null);

  useEffect(() => {
    if (!experience) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [experience, onClose]);

  if (!experience) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="experience-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button className="dialog-close" onClick={onClose} aria-label="Close experience details">
          <X size={19} />
        </button>
        <ExperienceArtwork
          src={experience.artwork.hero ?? experience.artwork.thumbnail}
          alt={experience.artwork.alt}
          className="dialog-art"
          loading="eager"
        />
        <div className="dialog-body">
          <span className="dialog-genre">
            {experience.genre} <span>·</span> {experience.subgenre}
          </span>
          <h2 id="dialog-title">{experience.title}</h2>
          <p className="dialog-creator">
            By {experience.creator} {experience.creatorVerified && <BadgeCheck size={15} />}
          </p>
          <p className="dialog-description">{experience.description}</p>
          <div className="dialog-stats">
            <span>
              <strong>{formatCount(experience.metrics.activePlayers)}</strong> playing now
            </span>
            <span>
              <strong>{experience.metrics.rating}%</strong> positive
            </span>
            <span>
              <strong>{experience.metrics.averagePlaytimeMinutes}m</strong> avg. session
            </span>
          </div>
          <div className="dialog-tags">
            {experience.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <Button
            className="primary-button dialog-play"
            onClick={() => setLaunchNoticeFor(experience.id)}
          >
            <Gamepad2 size={17} /> Play on Roblox <ExternalLink size={14} />
          </Button>
          {launchNoticeFor === experience.id ? (
            <p className="dialog-note" role="status">
              This sample experience does not have a Roblox launch URL yet.
            </p>
          ) : (
            <p className="dialog-note">Preview experience · Sample discovery data</p>
          )}
        </div>
      </section>
    </div>
  );
}
