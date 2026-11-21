import type { ReactNode } from 'react';
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}
export function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 h-7 w-1 shrink-0 rounded-full bg-muted-foreground" />
        <div className="min-w-0 space-y-1">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
