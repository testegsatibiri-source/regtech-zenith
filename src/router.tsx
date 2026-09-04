import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Perf audit (2026-09-04), finding P1-1: without defaults every navigation and
  // every tab focus refetched the full screen dataset. Mutations already
  // invalidate their own keys explicitly, so a 5 min staleTime is safe.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // P2-6: preload on hover/focus, and treat preloaded data as fresh briefly
    // so the real navigation does not refetch immediately.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
