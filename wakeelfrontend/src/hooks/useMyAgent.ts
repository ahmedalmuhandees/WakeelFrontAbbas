import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Agent } from '../types';

/** مفتاح موحّد لجميع الصفحات — يمنع طلبات GET /Agents/me المتكررة والمزدوجة */
export const MY_AGENT_QUERY_KEY = ['myAgent'] as const;

/**
 * بيانات الوكيل الحالي (GET /Agents/me).
 * يُخبَّأ لمدة طويلة ولا يُعاد الجلب عند كل انتقال بين الصفحات أو تركيز النافذة.
 * لتحديث البيانات بعد التعديل في الإعدادات يُستخدم invalidateQueries({ queryKey: MY_AGENT_QUERY_KEY }).
 */
export function useMyAgent(enabled = true): UseQueryResult<Agent, Error> {
  return useQuery({
    queryKey: MY_AGENT_QUERY_KEY,
    queryFn: () => apiService.getMyAgent(),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
