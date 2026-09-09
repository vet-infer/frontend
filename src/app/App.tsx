import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Skeleton } from "../components/common/Skeleton";

function RouteLoadingFallback() {
  return (
    <div className="space-y-4 p-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Outlet />
    </Suspense>
  );
}
