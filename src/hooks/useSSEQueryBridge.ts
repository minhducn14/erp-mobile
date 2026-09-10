import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sseEventBus } from '@/services/sseEventBus';
import { queryKeys } from '@/services/queryKeys';

/**
 * Hook to bridge SSE EventBus with TanStack Query Cache.
 * When real-time SSE events arrive from backend, this automatically invalidates
 * the corresponding TanStack Query cache tags.
 */
export function useSSEQueryBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate Opportunity Queries on SSE signal
    const handleOpportunityInvalidate = () => {
      console.log('⚡ [SSE QueryBridge] Invalidating Opportunities cache');
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
    };

    // Invalidate Quotation Queries on SSE signal
    const handleQuotationInvalidate = () => {
      console.log('⚡ [SSE QueryBridge] Invalidating Quotations cache');
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    };

    // Invalidate Notifications on new notification event
    const handleNotification = () => {
      console.log('⚡ [SSE QueryBridge] Invalidating Notifications cache');
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    // Listen to sseEventBus channels
    const unsubOpp = sseEventBus.on('invalidate_Opportunities', handleOpportunityInvalidate);
    const unsubQuo = sseEventBus.on('invalidate_Quotations', handleQuotationInvalidate);
    const unsubNotif = sseEventBus.on('notification', handleNotification);

    return () => {
      if (typeof unsubOpp === 'function') unsubOpp();
      if (typeof unsubQuo === 'function') unsubQuo();
      if (typeof unsubNotif === 'function') unsubNotif();
    };
  }, [queryClient]);
}
