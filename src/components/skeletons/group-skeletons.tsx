import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export function ExpenseCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-6 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
        <Skeleton className="h-px w-full my-3" />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-10 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChatMessageSkeleton({ isMe = false }: { isMe?: boolean }) {
  return (
    <div
      className={`flex w-full gap-2 ${isMe ? "justify-end" : "justify-start"}`}
    >
      {!isMe && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
      <div
        className={`flex flex-col max-w-[70%] ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <Skeleton
          className={`h-16 w-48 ${
            isMe ? "rounded-tr-none" : "rounded-tl-none"
          } rounded-2xl`}
        />
        <Skeleton className="h-3 w-24 mt-1" />
      </div>
      {isMe && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}
