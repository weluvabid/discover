import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExperienceArtwork } from './ExperienceArtwork';
import { ExperiencePlayButton } from './ExperiencePlayButton';

interface ExperienceDialogProps {
  experience: Experience | null;
  onClose: () => void;
}

export function ExperienceDialog({ experience, onClose }: ExperienceDialogProps) {
  const [launchNoticeFor, setLaunchNoticeFor] = useState<string | null>(null);

  return (
    <Dialog
      open={experience !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {experience && (
        <DialogContent className="experience-dialog" aria-describedby="experience-description">
          <ExperienceArtwork
            src={experience.artwork.hero ?? experience.artwork.thumbnail}
            alt={experience.artwork.alt}
            className="dialog-art"
            loading="eager"
          />
          <div className="dialog-body">
            <DialogHeader className="experience-dialog-header">
              <span className="dialog-genre">
                {experience.genre} <span>·</span> {experience.subgenre}
              </span>
              <DialogTitle id="dialog-title">{experience.title}</DialogTitle>
              <DialogDescription className="dialog-creator">
                By {experience.creator} {experience.creatorVerified && <BadgeCheck size={15} />}
              </DialogDescription>
            </DialogHeader>
            <p id="experience-description" className="dialog-description">
              {experience.description}
            </p>
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
                <Badge key={tag} variant="outline" className="dialog-tag">
                  {tag}
                </Badge>
              ))}
            </div>
            <ExperiencePlayButton
              className="dialog-play"
              onClick={() => setLaunchNoticeFor(experience.id)}
              label="Play on Roblox"
            />
            {launchNoticeFor === experience.id ? (
              <p className="dialog-note" role="status">
                This sample experience does not have a Roblox launch URL yet.
              </p>
            ) : (
              <p className="dialog-note">Preview experience · Sample discovery data</p>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
