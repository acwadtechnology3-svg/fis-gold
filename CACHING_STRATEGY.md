# Caching Strategy Documentation

## Cache-Aside Pattern Implementation

This application uses the **cache-aside** (lazy loading) pattern for optimal performance and data consistency.

### How Cache-Aside Works

1. **Check Cache First**: React Query checks the in-memory cache before making any API calls
2. **Cache Hit**: Return cached data immediately (no network request)
3. **Cache Miss**: Fetch from database, then store in cache
4. **Cache Invalidation**: On mutations (create/update/delete), invalidate related cache entries

### Cache Configuration

#### Global Settings (`src/lib/queryClient.ts`)

- **staleTime**: 30 seconds (default) - Data is considered fresh for 30 seconds
- **gcTime**: 5 minutes - Unused data stays in cache for 5 minutes
- **refetchOnWindowFocus**: false - Don't refetch when user returns to tab (saves bandwidth)
- **retry**: 1 - Retry failed requests once with exponential backoff

#### Metal Prices Cache

- **staleTime**: 2 minutes - Prices are fresh for 2 minutes
- **gcTime**: 10 minutes - Keep prices in cache for 10 minutes
- **refetchInterval**: 5 minutes - Background refetch every 5 minutes
- **Reason**: Prices change frequently but don't need real-time updates

#### Portfolio Data Cache

- **staleTime**: 1 minute - User data is fresh for 1 minute
- **gcTime**: 5 minutes - Keep in cache for 5 minutes
- **Reason**: User transactions need more frequent updates

### Cache Invalidation Strategy

Cache is invalidated (cleared) when:

1. **User creates a deposit** → Invalidates `deposits` and `portfolio-summary` cache
2. **User creates a withdrawal** → Invalidates `withdrawals` and `portfolio-summary` cache
3. **Admin approves/rejects deposit** → Invalidates `deposits`, `portfolio-summary`, and `admin-deposits` cache
4. **Admin approves/rejects withdrawal** → Invalidates `withdrawals`, `portfolio-summary`, and `admin-withdrawals` cache
5. **Admin updates metal prices** → Invalidates `metal-prices` cache globally
6. **Admin approves user** → Invalidates `users` cache

### Performance Benefits

1. **Reduced API Calls**: Cached data doesn't require database queries
2. **Faster Load Times**: Instant data retrieval from cache
3. **Better UX**: No loading spinners for cached data
4. **Bandwidth Savings**: Fewer network requests
5. **Offline Resilience**: Cached data available even with poor connectivity

### Cache Keys Organization

All cache keys are centralized in `src/lib/queryClient.ts`:

```typescript
queryKeys.metalPrices          // ['metal-prices']
queryKeys.deposits(userId)     // ['deposits', userId]
queryKeys.withdrawals(userId)  // ['withdrawals', userId]
queryKeys.portfolioSummary(userId) // ['portfolio-summary', userId]
```

This ensures consistent cache key usage across the application.

### Best Practices

1. **Use queryKeys**: Always import and use keys from `queryKeys` object
2. **Invalidate on Mutations**: Always invalidate related cache when data changes
3. **Appropriate staleTime**: Balance between freshness and performance
4. **Monitor Cache Size**: Keep gcTime reasonable to avoid memory issues

### Future Enhancements

- [ ] Add localStorage persistence for offline support
- [ ] Implement service worker for additional caching
- [ ] Add cache analytics/monitoring
- [ ] Implement optimistic updates for better UX

