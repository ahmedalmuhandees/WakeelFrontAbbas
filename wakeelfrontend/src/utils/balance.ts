/**
 * رصيد الوكيل — تخزين محلي (يمكن استبداله لاحقاً بـ API).
 */
const STORAGE_KEY_PREFIX = 'wakeel_agent_balance_';

export function getAgentBalance(userId: string | undefined): number {
  if (!userId) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setAgentBalance(userId: string | undefined, amount: number): void {
  if (!userId) return;
  const value = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  localStorage.setItem(STORAGE_KEY_PREFIX + userId, String(value));
}

export function addAgentBalance(userId: string | undefined, amount: number): number {
  if (!userId) return 0;
  const current = getAgentBalance(userId);
  const add = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const next = current + add;
  setAgentBalance(userId, next);
  return next;
}
