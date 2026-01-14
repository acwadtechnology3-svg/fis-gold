import { QueryClient } from "@tanstack/react-query";

/**
 * Optimized QueryClient with cache-aside pattern implementation
 * 
 * Cache-aside pattern:
 * 1. Check cache first (React Query handles this)
 * 2. On cache miss, fetch from database
 * 3. Store result in cache for future requests
 * 4. On mutations, invalidate related cache
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache settings - balance between freshness and performance
      staleTime: 30 * 1000, // Consider data fresh for 30 seconds (default)
      gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes (garbage collection)
      
      // Performance optimizations
      refetchOnWindowFocus: false, // Don't refetch on window focus to reduce unnecessary requests
      refetchOnReconnect: true, // Refetch when connection is restored
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      
      // Network optimizations
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      networkMode: 'online',
    },
  },
});

/**
 * Cache keys for organized cache management
 */
export const queryKeys = {
  metalPrices: ['metal-prices'] as const,
  portfolio: (userId: string) => ['portfolio', userId] as const,
  deposits: (userId: string) => ['deposits', userId] as const,
  withdrawals: (userId: string) => ['withdrawals', userId] as const,
  portfolioSummary: (userId: string) => ['portfolio-summary', userId] as const,
  users: ['users'] as const,
  adminDeposits: ['admin-deposits'] as const,
  adminWithdrawals: ['admin-withdrawals'] as const,
  products: (goldsmithId?: string) => goldsmithId ? ['products', goldsmithId] : ['products'] as const,
  goldsmiths: ['goldsmiths'] as const,
  reviews: (goldsmithId: string) => ['reviews', goldsmithId] as const,
  activityLog: ['activity-log'] as const,
  systemSettings: ['system-settings'] as const,
};

