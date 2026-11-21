import { useState } from 'react';
import { BadgeCheck, ExternalLink, Gamepad2 } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExperienceArtwork } from './ExperienceArtwork';

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
        </DialogContent>
      )}
    </Dialog>
  );
}
