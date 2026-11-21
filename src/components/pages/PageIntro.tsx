import type { ReactNode } from 'react';
interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
}
export function PageIntro({ eyebrow, title, description, icon }: PageIntroProps) {
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-muted-foreground">
        {icon}
        {eyebrow}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </p>
    </div>
  );
}
