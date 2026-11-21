import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedExperienceSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
    >
      <Skeleton className="aspect-video w-full self-center rounded-none" />
      <div className="flex min-w-0 flex-col justify-center gap-3 p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="size-10 rounded-xl" />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
    </section>
  );
}
