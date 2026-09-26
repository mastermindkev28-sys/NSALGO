import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-56" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    </div>
  );
}
