import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export function PageIntro({ eyebrow, title, description, icon }: PageIntroProps) {
  return (
    <div className="page-intro">
      <span className="page-eyebrow">
        {icon}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
