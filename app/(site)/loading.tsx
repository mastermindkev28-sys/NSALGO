import { Container } from "@/components/marketing/section";
import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <Container className="space-y-6 py-12" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-2/3" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </Container>
  );
}
