import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface MetalPrice {
  price_per_gram: number; // Backward compatibility
  buy_price_per_gram: number;
  sell_price_per_gram: number;
  price_per_ounce: number; // Backward compatibility
  buy_price_per_ounce: number;
  sell_price_per_ounce: number;
  source: string;
  updated_at: string;
}

export interface MetalPricesResponse {
  gold: MetalPrice | null;
  silver: MetalPrice | null;
  is_cached: boolean;
}

/**
 * Cache-aside pattern for metal prices:
 * - React Query checks cache first
 * - On cache miss, fetches from database
 * - Stores result in cache for 2 minutes
 * - Refetches in background every 5 minutes
 */
export const useMetalPrices = () => {
  return useQuery({
    queryKey: queryKeys.metalPrices,
    queryFn: async (): Promise<MetalPricesResponse> => {
      // Fetch directly from database using RPC function
      const { data: pricesData, error } = await supabase.rpc("get_latest_metal_prices");
      
      if (error) {
        console.error("Error fetching metal prices:", error);
        throw error;
      }
      
      if (!pricesData || pricesData.length === 0) {
        return {
          gold: null,
          silver: null,
          is_cached: false,
        };
      }
      
      // Transform database results to match expected format
      const goldPrice = pricesData.find((p: any) => p.metal_type === 'gold');
      const silverPrice = pricesData.find((p: any) => p.metal_type === 'silver');
      
      return {
        gold: goldPrice ? {
          price_per_gram: Number(goldPrice.buy_price_per_gram || goldPrice.price_per_gram),
          buy_price_per_gram: Number(goldPrice.buy_price_per_gram),
          sell_price_per_gram: Number(goldPrice.sell_price_per_gram),
          price_per_ounce: Number(goldPrice.buy_price_per_ounce || goldPrice.price_per_ounce),
          buy_price_per_ounce: Number(goldPrice.buy_price_per_ounce),
          sell_price_per_ounce: Number(goldPrice.sell_price_per_ounce),
          source: goldPrice.source,
          updated_at: goldPrice.updated_at,
        } : null,
        silver: silverPrice ? {
          price_per_gram: Number(silverPrice.buy_price_per_gram || silverPrice.price_per_gram),
          buy_price_per_gram: Number(silverPrice.buy_price_per_gram),
          sell_price_per_gram: Number(silverPrice.sell_price_per_gram),
          price_per_ounce: Number(silverPrice.buy_price_per_ounce || silverPrice.price_per_ounce),
          buy_price_per_ounce: Number(silverPrice.buy_price_per_ounce),
          sell_price_per_ounce: Number(silverPrice.sell_price_per_ounce),
          source: silverPrice.source,
          updated_at: silverPrice.updated_at,
        } : null,
        is_cached: false,
      };
    },
    // Cache-aside settings optimized for metal prices
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: false, // Only refetch when tab is active
  });
};
