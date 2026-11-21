import { Skeleton } from '@/components/ui/skeleton';

export function ExperienceCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-3/5" />
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
    </article>
  );
}
