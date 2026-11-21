import { Gamepad2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface ExperiencePlayButtonProps { onClick: () => void; label?: string; className?: string }
export function ExperiencePlayButton({ onClick, label = 'Play on Roblox', className = '' }: ExperiencePlayButtonProps) {
  return <Button className={`h-10 gap-2 rounded-xl bg-[var(--roblox-blue)] px-4 font-semibold text-white hover:bg-[color-mix(in_srgb,var(--roblox-blue)_88%,black)] ${className}`.trim()} onClick={onClick}><Gamepad2 size={16} aria-hidden="true"/>{label}<Play size={13} fill="currentColor" aria-hidden="true"/></Button>;
}
