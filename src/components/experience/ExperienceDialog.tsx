import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { Experience } from '@/types/experience';
import { formatCount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExperienceArtwork } from './ExperienceArtwork';
import { ExperiencePlayButton } from './ExperiencePlayButton';

interface ExperienceDialogProps {
  experience: Experience | null;
  onClose: () => void;
}

export function ExperienceDialog({ experience, onClose }: ExperienceDialogProps) {
  const [launchNoticeFor, setLaunchNoticeFor] = useState<string | null>(null);

  return (
    <Dialog open={experience !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {experience && (
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-0"
          aria-describedby="experience-description"
        >
          <ExperienceArtwork
            src={experience.artwork.hero ?? experience.artwork.thumbnail}
            alt={experience.artwork.alt}
            className="aspect-video w-full"
            loading="eager"
          />
          <div className="flex flex-col gap-6 p-5 md:p-7">
            <DialogHeader className="gap-3">
              <span className="text-xs text-muted-foreground">
                {experience.genre} · {experience.subgenre}
              </span>
              <DialogTitle className="text-2xl font-bold">{experience.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                By {experience.creator}
                {experience.creatorVerified && <BadgeCheck size={15} />}
              </DialogDescription>
            </DialogHeader>

            <p id="experience-description" className="text-sm leading-relaxed text-muted-foreground">
              {experience.description}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{formatCount(experience.metrics.activePlayers)}</strong> playing now</span>
              <span><strong className="text-foreground">{experience.metrics.rating}%</strong> positive</span>
              <span><strong className="text-foreground">{experience.metrics.averagePlaytimeMinutes}m</strong> avg. session</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {experience.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>

            <div className="flex flex-col gap-3">
              <ExperiencePlayButton
                className="w-full"
                onClick={() => setLaunchNoticeFor(experience.id)}
                label="Play on Roblox"
              />
              <p
                className="text-xs text-muted-foreground"
                role={launchNoticeFor === experience.id ? 'status' : undefined}
              >
                {launchNoticeFor === experience.id
                  ? 'This sample experience does not have a Roblox launch URL yet.'
                  : 'Preview experience · Sample discovery data'}
              </p>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
