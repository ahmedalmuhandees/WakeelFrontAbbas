import { LoginResponse, User, UserRole } from '../types';

/** قراءة payload JWT (بدون تحقق توقيع — للعرض المحلي فقط) */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const NUMERIC_ROLE_IDS = new Set<number>([
  UserRole.Admin,
  UserRole.Agent,
  UserRole.Subscriber,
  UserRole.Employee,
  UserRole.SubAgent,
  UserRole.MainAgent,
]);

/** تحويل roleId من استجابة تسجيل الدخول إلى UserRole */
export function roleIdToUserRole(roleId: number | undefined | null): UserRole | null {
  if (roleId == null || !Number.isFinite(roleId)) return null;
  const n = Math.trunc(roleId);
  return NUMERIC_ROLE_IDS.has(n) ? (n as UserRole) : null;
}

export function mapRoleStringToUserRole(role: string): UserRole {
  const r = (role || '').trim();
  switch (r) {
    case 'Admin':
    case '1':
      return UserRole.Admin;
    case 'Agent':
    case '2':
      return UserRole.Agent;
    case 'Subscriber':
    case '3':
      return UserRole.Subscriber;
    case 'Employee':
    case '4':
      return UserRole.Employee;
    case 'SubAgent':
    case '5':
      return UserRole.SubAgent;
    case 'MainAgent':
    case '6':
      return UserRole.MainAgent;
    default: {
      const n = parseInt(r, 10);
      if (!Number.isNaN(n) && NUMERIC_ROLE_IDS.has(n)) return n as UserRole;
      return UserRole.Subscriber;
    }
  }
}

/** عندما يعيد الباكند skipAgentsMeAndSync: لا نستدعي GET /users/me */
export function buildUserFromLoginResponse(response: LoginResponse, loginUsername: string): User {
  const payload = parseJwtPayload(response.token);
  const sub =
    (payload?.sub as string) ||
    (payload?.nameid as string) ||
    '';
  const uniqueName = payload?.unique_name;
  const nameClaim =
    (payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string) ||
    (typeof uniqueName === 'string' ? uniqueName : undefined);
  const roleStr = typeof response.role === 'string' ? response.role : String(response.role ?? '');
  const roleFromId = roleIdToUserRole(response.roleId);
  const role = roleFromId ?? mapRoleStringToUserRole(roleStr);
  const base: User = {
    id: sub,
    username: loginUsername.trim(),
    fullName: (nameClaim && nameClaim.trim()) || loginUsername.trim(),
    isActive: true,
    role,
    tenantPlanType: response.tenantPlanType ?? undefined,
    standardPlanTierId: response.standardPlanTierId ?? undefined,
    standardPlanTier: response.standardPlanTier ?? undefined,
    maxResellers: response.maxResellers ?? undefined,
  };
  /** صلاحيات الموظف من استجابة تسجيل الدخول (مثل canAccessDealers) قبل جلب GET /users/me */
  if (role === UserRole.Employee) {
    const lr = response as LoginResponse & { CanAccessDealers?: boolean };
    const dealers = lr.canAccessDealers ?? lr.CanAccessDealers;
    if (typeof dealers === 'boolean') base.canAccessDealers = dealers;
  }
  return base;
}

const EMPLOYEE_MERGE_KEYS: (keyof User)[] = [
  'canActivateSubscriber',
  'canEditSubscriber',
  'canDeleteSubscriber',
  'canPayDebt',
  'canAccessAccounts',
  'canEditAccountsLedger',
  'canAccessDealers',
  'canAccessInvoices',
  'canAccessExpensesAndSalarySheet',
  'canAccessSubscriberDashboard',
  'canViewAllSubscribers',
  'canReceiveTaskRequests',
  'canManageEmployeeTasks',
  'canManageMaterialsAndSales',
];

/**
 * إن عاد GET /users/me بدون بعض حقول الصلاحية (undefined)، نملأها من نسخة login
 * حتى لا تُعامل كـ «لا صلاحية» وتُخفى القوائم / يُعاد التوجيه من EmployeeDealersAccessRoute.
 */
export function mergeEmployeePermissionsFromLogin(loginFallback: User, fromApi: User): User {
  if (fromApi.role !== UserRole.Employee) return fromApi;
  let changed = false;
  const out = { ...fromApi } as Record<string, unknown>;
  for (const k of EMPLOYEE_MERGE_KEYS) {
    const cur = out[k as string];
    const fb = loginFallback[k];
    if (typeof fb === 'boolean' && cur === undefined) {
      out[k as string] = fb;
      changed = true;
    }
  }
  return changed ? (out as unknown as User) : fromApi;
}
