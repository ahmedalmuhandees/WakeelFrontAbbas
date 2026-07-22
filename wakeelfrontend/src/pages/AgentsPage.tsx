import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useDigits } from '../contexts/DigitsContext';
import {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentRenewalRequest,
  SubscriptionSystemType,
  AgentsListResponse,
  PaginationParams,
  RenewalCalculationType,
  ServiceType,
  TenantPlanType,
  formatServiceTypeLabelAr,
  usesSasCredentialFields,
  User,
  UserRole,
  AgentEmployeeCreateRequest,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  EMPLOYEE_PERMISSION_FORM_KEYS,
  EMPLOYEE_PERMISSION_LABELS,
  getEmployeePermissionChecked,
  AgentRegistrationApproveRequest,
  ZAINFI_DEFAULT_BASE_URL,
  FIBERX_DEFAULT_BASE_URL,
} from '../types';
import { IraqGovernorates } from '../types';
import Pagination from '../components/Pagination';
import { StatCard } from '../components/StatCard';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Calendar,
  Building,
  User as UserIcon,
  UserPlus,
  UserCheck,
  ClipboardList,
  WifiOff,
  Phone,
  CheckSquare,
  Square,
  MoreHorizontal,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

const AgentsPage: React.FC = () => {
  const { confirmDelete } = useConfirmation();
  const { formatDate } = useDigits();
  // Debug: Check if IraqGovernorates is available
  console.log('IraqGovernorates:', IraqGovernorates);

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [expirationFromDate, setExpirationFromDate] = useState('');
  const [expirationToDate, setExpirationToDate] = useState('');
  const [appliedExpirationFromDate, setAppliedExpirationFromDate] = useState('');
  const [appliedExpirationToDate, setAppliedExpirationToDate] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApproveRegistrationModal, setShowApproveRegistrationModal] = useState(false);
  const [approveRegUsername, setApproveRegUsername] = useState('');
  const [approveRegStart, setApproveRegStart] = useState('');
  const [approveRegEnd, setApproveRegEnd] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedAgentForEmployees, setSelectedAgentForEmployees] = useState<Agent | null>(null);
  const [newEmployeeData, setNewEmployeeData] = useState<AgentEmployeeCreateRequest>({
    username: '',
    fullName: '',
    password: '',
    role: UserRole.Employee,
    ...DEFAULT_EMPLOYEE_PERMISSIONS,
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [agentData, setAgentData] = useState<AgentCreateRequest>({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    companyName: '',
    address: '',
    governorate: IraqGovernorates.Baghdad,
    subscriptionType: SubscriptionSystemType.Yearly,
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    renewalPeriod: 30,
    renewalCalculationType: RenewalCalculationType.Fixed,
    serviceType: ServiceType.Sas,
    sasBaseUrl: '',
    sasUsername: '',
    sasPassword: '',
    ftthBaseUrl: 'https://admin.ftth.iq',
    ftthUsername: '',
    ftthPassword: '',
    whatsAppSessionId: '',
    tenantPlanType: TenantPlanType.Standard,
  });
  const [renewalData, setRenewalData] = useState<AgentRenewalRequest>({
    newSubscriptionEndDate: '',
    newSubscriptionType: SubscriptionSystemType.Yearly
  });

  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch agents
  const { data: agentsResponse, error, refetch, isLoading } = useQuery<AgentsListResponse>({
    queryKey: ['agents', currentPage, pageSize, appliedSearchTerm, appliedExpirationFromDate, appliedExpirationToDate],
    queryFn: () => {
      const params: PaginationParams = {
        page: currentPage,
        pageSize: pageSize,
        search: appliedSearchTerm || undefined,
        expirationFromDate: appliedExpirationFromDate || undefined,
        expirationToDate: appliedExpirationToDate || undefined,
      };
      return apiService.getAllAgents(params);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: employeesList } = useQuery<User[]>({
    queryKey: ['agent-employees', selectedAgentForEmployees?.id],
    queryFn: () => apiService.getAgentEmployees(selectedAgentForEmployees!.id),
    enabled: !!selectedAgentForEmployees?.id,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: AgentEmployeeCreateRequest }) =>
      apiService.createAgentEmployee(agentId, data),
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: ['agent-employees', agentId] });
      setShowAddEmployeeModal(false);
      setNewEmployeeData({ username: '', fullName: '', password: '', ...DEFAULT_EMPLOYEE_PERMISSIONS });
      showSuccess('تمت الإضافة', 'تم إضافة الموظف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const toIsoDateTime = (dateOrIso: string): string => {
    const s = String(dateOrIso || '').trim();
    if (!s) return s;
    if (s.includes('T')) return s;
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? s : d.toISOString();
  };

  const handleOpenEmployees = (agent: Agent) => {
    setSelectedAgentForEmployees(agent);
    setShowEmployeesModal(true);
    setShowDropdown(null);
  };

  const handleAddEmployee = () => {
    if (!selectedAgentForEmployees) return;
    if (!newEmployeeData.username?.trim() || !newEmployeeData.fullName?.trim() || !newEmployeeData.password) {
      showError('خطأ', 'يرجى تعبئة جميع الحقول');
      return;
    }
    const dataToSend = newEmployeeData.role === UserRole.SubAgent
      ? { ...newEmployeeData, ...DEFAULT_EMPLOYEE_PERMISSIONS }
      : newEmployeeData;
    createEmployeeMutation.mutate({ agentId: selectedAgentForEmployees.id, data: dataToSend });
  };

  const approveRegistrationMutation = useMutation({
    mutationFn: (body: AgentRegistrationApproveRequest) => apiService.approveAgentRegistration(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowApproveRegistrationModal(false);
      setApproveRegUsername('');
      setApproveRegStart('');
      setApproveRegEnd('');
      showSuccess('تم التفعيل', data.message ?? 'تم تفعيل حساب الوكيل.');
    },
    onError: (error: unknown) => {
      showError('خطأ', ApiService.showError(error));
    },
  });

  const handleApproveRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = approveRegUsername.trim();
    if (!u || !approveRegStart || !approveRegEnd) {
      showError('حقول ناقصة', 'يرجى إدخال اسم المستخدم وتواريخ الاشتراك.');
      return;
    }
    if (new Date(approveRegEnd) < new Date(approveRegStart)) {
      showError('تعارض في التواريخ', 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.');
      return;
    }
    approveRegistrationMutation.mutate({
      username: u,
      subscriptionStartDate: toIsoDateTime(approveRegStart),
      subscriptionEndDate: toIsoDateTime(approveRegEnd),
    });
  };

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: (data: AgentCreateRequest) => apiService.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowAddModal(false);
      setAgentData({
        username: '',
        password: '',
        fullName: '',
        phone: '',
        companyName: '',
        address: '',
        governorate: IraqGovernorates.Baghdad,
        subscriptionType: SubscriptionSystemType.Yearly,
        subscriptionStartDate: '',
        subscriptionEndDate: '',
        renewalPeriod: 30,
        renewalCalculationType: RenewalCalculationType.Fixed,
        serviceType: ServiceType.Sas,
        sasBaseUrl: '',
        sasUsername: '',
        sasPassword: '',
        ftthBaseUrl: 'https://admin.ftth.iq',
        ftthUsername: '',
        ftthPassword: '',
        whatsAppSessionId: '',
        tenantPlanType: TenantPlanType.Standard,
      });
      showSuccess('تم الإنشاء', 'تم إنشاء الوكيل بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating agent:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في الإنشاء', errorMessage);
    }
  });

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentUpdateRequest }) => 
      apiService.updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowEditModal(false);
      setSelectedAgent(null);
      showSuccess('تم التحديث', 'تم تحديث الوكيل بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating agent:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في التحديث', errorMessage);
    }
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSelectedAgents([]);
      showSuccess('تم الحذف', 'تم حذف الوكيل بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting agent:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في الحذف', errorMessage);
    }
  });

  // Renew agent subscription mutation
  const renewAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentRenewalRequest }) => 
      apiService.renewAgentSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowRenewModal(false);
      setSelectedAgent(null);
      setRenewalData({
        newSubscriptionEndDate: '',
        newSubscriptionType: SubscriptionSystemType.Yearly
      });
      showSuccess('تم التجديد', 'تم تجديد اشتراك الوكيل بنجاح');
    },
    onError: (error: any) => {
      console.error('Error renewing agent subscription:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في التجديد', errorMessage);
    }
  });

  // Check expired agents mutation
  const checkExpiredMutation = useMutation({
    mutationFn: () => apiService.checkExpiredAgents(),
    onSuccess: (data) => {
      showSuccess('تم العثور على وكلاء منتهية صلاحيتهم', `${data.totalExpired} وكيل منتهي الاشتراك`);
    },
    onError: (error: any) => {
      console.error('Error checking expired agents:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في فحص الوكلاء', errorMessage);
    }
  });

  const agents = agentsResponse?.data || [];
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedExpirationFromDate(expirationFromDate ? toIsoDateTime(expirationFromDate) : '');
    setAppliedExpirationToDate(expirationToDate ? toIsoDateTime(expirationToDate) : '');
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setExpirationFromDate('');
    setExpirationToDate('');
    setAppliedExpirationFromDate('');
    setAppliedExpirationToDate('');
    setCurrentPage(1);
  };

  // Handle agent selection
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === agents?.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents?.map(agent => agent.id) || []);
    }
  };

  // Handle add agent
  const handleAddAgent = () => {
    const { standardPlanTier: _omitStandardPlanTier, ...createBody } = agentData;
    void _omitStandardPlanTier;
    createAgentMutation.mutate({
      ...createBody,
      subscriptionStartDate: agentData.subscriptionStartDate ? toIsoDateTime(agentData.subscriptionStartDate) : undefined,
      subscriptionEndDate: agentData.subscriptionEndDate ? toIsoDateTime(agentData.subscriptionEndDate) : undefined,
      whatsAppSessionId: agentData.whatsAppSessionId?.trim() || undefined,
      sasBaseUrl: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasBaseUrl?.trim() || undefined) : undefined,
      sasUsername: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasUsername?.trim() || undefined) : undefined,
      sasPassword: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasPassword?.trim() || undefined) : undefined,
      ftthBaseUrl: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthBaseUrl?.trim() || undefined) : undefined,
      ftthUsername: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthUsername?.trim() || undefined) : undefined,
      ftthPassword: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthPassword?.trim() || undefined) : undefined,
    });
  };

  // Handle edit agent
  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditIsActive(!!agent.isActive);
    setAgentData(prev => ({
      ...prev,
      username: agent.username || '',
      password: '',
      fullName: agent.fullName || '',
      phone: agent.phone || '',
      companyName: agent.companyName || '',
      address: agent.address || '',
      governorate: agent.governorate ?? IraqGovernorates.Baghdad,
      subscriptionType: agent.subscriptionType ?? SubscriptionSystemType.Yearly,
      subscriptionStartDate: (agent.subscriptionStartDate || '').slice(0, 10),
      subscriptionEndDate: (agent.subscriptionEndDate || '').slice(0, 10),
      renewalPeriod: agent.renewalPeriod ?? prev.renewalPeriod ?? 30,
      renewalCalculationType: agent.renewalCalculationType ?? prev.renewalCalculationType ?? RenewalCalculationType.Fixed,
      serviceType: agent.serviceType ?? ServiceType.Sas,
      sasBaseUrl: agent.sasBaseUrl || '',
      sasUsername: agent.sasUsername || '',
      sasPassword: '',
      ftthBaseUrl: agent.ftthBaseUrl || 'https://admin.ftth.iq',
      ftthUsername: agent.ftthUsername || '',
      ftthPassword: '',
      whatsAppSessionId: agent.whatsAppSessionId || '',
      tenantPlanType: agent.tenantPlanType ?? TenantPlanType.Standard,
    }));
    setShowEditModal(true);
    setShowDropdown(null);
  };

  // Handle update agent
  const handleUpdateAgent = () => {
    if (selectedAgent) {
      const updateData: AgentUpdateRequest = {
        fullName: agentData.fullName || selectedAgent.fullName,
        companyName: agentData.companyName || selectedAgent.companyName,
        phone: agentData.phone || selectedAgent.phone,
        address: agentData.address || selectedAgent.address || '',
        governorate: (agentData.governorate ?? selectedAgent.governorate) as IraqGovernorates,
        isActive: editIsActive,
        subscriptionType: (agentData.subscriptionType ?? selectedAgent.subscriptionType) as SubscriptionSystemType,
        subscriptionStartDate: toIsoDateTime(agentData.subscriptionStartDate || selectedAgent.subscriptionStartDate),
        subscriptionEndDate: toIsoDateTime(agentData.subscriptionEndDate || selectedAgent.subscriptionEndDate),
        renewalPeriod: agentData.renewalPeriod,
        renewalCalculationType: agentData.renewalCalculationType,
        serviceType: agentData.serviceType,
        whatsAppSessionId: agentData.whatsAppSessionId?.trim() || undefined,
        sasBaseUrl: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasBaseUrl?.trim() || undefined) : undefined,
        sasUsername: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasUsername?.trim() || undefined) : undefined,
        sasPassword: usesSasCredentialFields(agentData.serviceType) ? (agentData.sasPassword?.trim() || undefined) : undefined,
        ftthBaseUrl: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthBaseUrl?.trim() || undefined) : undefined,
        ftthUsername: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthUsername?.trim() || undefined) : undefined,
        ftthPassword: agentData.serviceType === ServiceType.Ftth ? (agentData.ftthPassword?.trim() || undefined) : undefined,
      };
      updateAgentMutation.mutate({
        id: selectedAgent.id,
        data: updateData
      });
    }
  };

  // Handle delete agent
  const handleChangePassword = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowChangePasswordModal(true);
    setShowDropdown(null);
  };

  const togglePasswordVisibility = (agentId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  const handleDeleteAgent = async (agentId: string) => {
    const confirmed = await confirmDelete('وكيل');
    if (confirmed) {
      deleteAgentMutation.mutate(agentId);
    }
    setShowDropdown(null);
  };

  // Handle renew agent subscription
  const handleRenewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setRenewalData({
      newSubscriptionEndDate: '',
      newSubscriptionType: agent.subscriptionType
    });
    setShowRenewModal(true);
    setShowDropdown(null);
  };

  // Handle renew subscription
  const handleRenewSubscription = () => {
    if (selectedAgent) {
      renewAgentMutation.mutate({
        id: selectedAgent.id,
        data: renewalData
      });
    }
  };

  // Get subscription status
  const getSubscriptionStatus = (agent: Agent) => {
    // استخدام البيانات من الباك إند أولاً
    if (agent.isSubscriptionExpired) {
      return { status: 'expired', text: 'منتهي', color: 'text-red-600', icon: XCircle };
    }
    
    // استخدام daysUntilExpiry من الباك إند إذا كان متوفراً
    const daysUntilExpiry = agent.daysUntilExpiry ?? 0;
    
    if (daysUntilExpiry <= 0) {
      return { status: 'expired', text: 'منتهي', color: 'text-red-600', icon: XCircle };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', text: 'ينتهي قريباً', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'active', text: 'نشط', color: 'text-green-600', icon: CheckCircle };
    }
  };

  // Get subscription type text
  const getServiceTypeText = (type?: ServiceType) =>
    type == null ? '—' : formatServiceTypeLabelAr(type);

  const getSubscriptionTypeText = (type: SubscriptionSystemType) => {
    switch (type) {
      case SubscriptionSystemType.Yearly:
        return 'سنوي';
      case SubscriptionSystemType.Daily:
        return 'يومي';
      default:
        return 'غير محدد';
    }
  };


  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <h2 className="text-xl font-semibold mb-4">خطأ في تحميل البيانات</h2>
        <p>حدث خطأ أثناء جلب قائمة الوكلاء: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 flex items-center justify-center mx-auto space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>إعادة المحاولة</span>
        </button>
          </div>
    );
  }

  if (createAgentMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">إضافة وكيل جديد...</span>
        </div>
      </div>
    );
  }

  if (deleteAgentMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">حذف الوكيل...</span>
        </div>
        </div>
    );
  }

  if (checkExpiredMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">فحص انتهاء الاشتراكات...</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل الوكلاء..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            إدارة الوكلاء
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة جميع الوكلاء المسجلين في النظام
          </p>
          {agents && agents.length > 0 && (
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                إجمالي الوكلاء: <span className="font-medium text-gray-900 dark:text-white">{agents.length}</span>
              </span>
              <span className="text-green-600 dark:text-green-400">
                نشط: <span className="font-medium">{agents.filter(a => !a.isSubscriptionExpired && a.daysUntilExpiry > 7).length}</span>
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                ينتهي قريباً: <span className="font-medium">{agents.filter(a => !a.isSubscriptionExpired && a.daysUntilExpiry > 0 && a.daysUntilExpiry <= 7).length}</span>
              </span>
              <span className="text-red-600 dark:text-red-400">
                منتهي: <span className="font-medium">{agents.filter(a => a.isSubscriptionExpired || a.daysUntilExpiry <= 0).length}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setShowApproveRegistrationModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            <span>تفعيل طلب تسجيل</span>
          </button>
          <button
            onClick={() => checkExpiredMutation.mutate()}
            disabled={checkExpiredMutation.isPending}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>فحص انتهاء الاشتراكات</span>
            </>
          </button>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={createAgentMutation.isPending}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <>
          <Plus className="h-4 w-4" />
            <span>إضافة وكيل جديد</span>
          </>
        </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الشركة أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap"
            >
              بحث
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium whitespace-nowrap"
            >
              تفريغ
            </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">تاريخ انتهاء الاشتراك من</label>
              <input
                type="date"
                value={expirationFromDate}
                onChange={(e) => setExpirationFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">تاريخ انتهاء الاشتراك إلى</label>
              <input
                type="date"
                value={expirationToDate}
                onChange={(e) => setExpirationToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </form>
      </div>

      {/* إحصائيات الوكلاء (تتبع آخر دخول + انتهاء الاشتراك) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="نشطون (آخر 24 ساعة)"
          value={agentsResponse?.statistics?.activeCount ?? 0}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="غير متصلين"
          value={agentsResponse?.statistics?.offlineCount ?? 0}
          icon={WifiOff}
          color="yellow"
        />
        <StatCard
          title="اشتراك منتهٍ"
          value={agentsResponse?.statistics?.expiredSubscriptionCount ?? 0}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Actions */}
      {selectedAgents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                تم تحديد {selectedAgents.length} وكيل
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  const confirmed = await confirmDelete('وكيل', selectedAgents.length);
                  if (confirmed) {
                    selectedAgents.forEach(agentId => {
                      deleteAgentMutation.mutate(agentId);
                    });
                    setSelectedAgents([]);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>حذف المحدد</span>
                </>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center w-4 h-4"
                  >
                    {selectedAgents.length === agents?.length && agents?.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الوكيل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  كلمة المرور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  نوع الاشتراك
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ الانتهاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  حالة الاشتراك
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الأيام المتبقية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  من أنشأ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  نوع الخدمة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  رابط SAS
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  مستخدم SAS
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  رابط FTTH
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  واتساب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {agents?.map((agent) => {
                const subscriptionStatus = getSubscriptionStatus(agent);
                const isExpired = agent.isSubscriptionExpired || agent.daysUntilExpiry <= 0;
                return (
                  <tr key={agent.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isExpired ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectAgent(agent.id)}
                        className="flex items-center justify-center w-4 h-4"
                      >
                        {selectedAgents.includes(agent.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {agent.fullName}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {agent.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {agent.username}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 ml-2" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          {agent.companyName}
                        </div>
                      </div>
                      {agent.address && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <Building className="h-3 w-3 mr-1" />
                          {agent.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-mono ${showPasswords[agent.id] ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {showPasswords[agent.id] ? (agent.plainPassword || 'غير محدد') : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(agent.id)}
                          className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showPasswords[agent.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getSubscriptionTypeText(agent.subscriptionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 ml-2" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(agent.subscriptionEndDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <subscriptionStatus.icon className={`h-4 w-4 ml-2 ${subscriptionStatus.color}`} />
                        <span className={`text-sm font-medium ${subscriptionStatus.color}`}>
                          {subscriptionStatus.text}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {agent.daysUntilExpiry > 0 ? (
                          <span className="text-green-600 dark:text-green-400">
                            {agent.daysUntilExpiry} يوم
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            منتهي
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.createdByUserName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getServiceTypeText(agent.serviceType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white max-w-[140px] truncate" title={agent.sasBaseUrl || undefined}>
                      {agent.sasBaseUrl || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.sasUsername || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white max-w-[140px] truncate" title={agent.ftthBaseUrl || undefined}>
                      {agent.ftthBaseUrl || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.whatsAppSessionId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowDropdown(showDropdown === agent.id ? null : agent.id)}
                          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        
                        {showDropdown === agent.id && (
                          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleEditAgent(agent)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit className="h-4 w-4 ml-2" />
                                تعديل الوكيل
                              </button>
                              <button
                                onClick={() => handleRenewAgent(agent)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <RefreshCw className="h-4 w-4 ml-2" />
                                تجديد الاشتراك
                              </button>
                              <button
                                onClick={() => handleChangePassword(agent)}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Key className="h-4 w-4 ml-2" />
                                تغيير كلمة المرور
                              </button>
                              <button
                                onClick={() => handleOpenEmployees(agent)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <UserPlus className="h-4 w-4 ml-2" />
                                موظفو الوكيل
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف الوكيل
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {agentsResponse && (
        <Pagination
          currentPage={agentsResponse.currentPage}
          totalPages={agentsResponse.totalPages}
          totalItems={agentsResponse.totalItems}
          pageSize={agentsResponse.pageSize}
          hasNextPage={agentsResponse.hasNextPage}
          hasPreviousPage={agentsResponse.hasPreviousPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* موافقة على طلب تسجيل وكيل — POST /AgentRegistration/approve */}
      {showApproveRegistrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleApproveRegistrationSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  تفعيل طلب تسجيل وكيل
                </h2>
                <button
                  type="button"
                  onClick={() => setShowApproveRegistrationModal(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                أدخل اسم المستخدم كما في طلب التسجيل (<span className="font-mono">loginUsername</span>) وتواريخ اشتراك الوكيل بعد الموافقة.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم المستخدم في الطلب *
                  </label>
                  <input
                    type="text"
                    value={approveRegUsername}
                    onChange={(e) => setApproveRegUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ بداية الاشتراك *
                  </label>
                  <input
                    type="date"
                    value={approveRegStart}
                    onChange={(e) => setApproveRegStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ انتهاء الاشتراك *
                  </label>
                  <input
                    type="date"
                    value={approveRegEnd}
                    onChange={(e) => setApproveRegEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApproveRegistrationModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={approveRegistrationMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {approveRegistrationMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري التفعيل...
                    </>
                  ) : (
                    'تفعيل الحساب'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  إضافة وكيل جديد
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المستخدم *
                  </label>
                  <input
                    type="text"
                    value={agentData.username}
                    onChange={(e) => setAgentData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    value={agentData.password}
                    onChange={(e) => setAgentData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={agentData.fullName}
                    onChange={(e) => setAgentData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    value={agentData.phone}
                    onChange={(e) => setAgentData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الشركة *
                  </label>
                  <input
                    type="text"
                    value={agentData.companyName}
                    onChange={(e) => setAgentData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={agentData.address}
                    onChange={(e) => setAgentData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    معرف جلسة واتساب (WhatsApp Session ID)
                  </label>
                  <input
                    type="text"
                    value={agentData.whatsAppSessionId ?? ''}
                    onChange={(e) => setAgentData(prev => ({ ...prev, whatsAppSessionId: e.target.value.trim() || undefined }))}
                    placeholder="اختياري - مثال: 7740240101"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المحافظة *
                  </label>
                  <select
                    value={agentData.governorate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, governorate: parseInt(e.target.value) as IraqGovernorates }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={IraqGovernorates.Baghdad}>بغداد</option>
                    <option value={IraqGovernorates.Basra}>البصرة</option>
                    <option value={IraqGovernorates.Mosul}>الموصل</option>
                    <option value={IraqGovernorates.Erbil}>أربيل</option>
                    <option value={IraqGovernorates.Sulaymaniyah}>السليمانية</option>
                    <option value={IraqGovernorates.Dohuk}>دهوك</option>
                    <option value={IraqGovernorates.Kirkuk}>كركوك</option>
                    <option value={IraqGovernorates.Anbar}>الأنبار</option>
                    <option value={IraqGovernorates.Karbala}>كربلاء</option>
                    <option value={IraqGovernorates.Najaf}>النجف</option>
                    <option value={IraqGovernorates.Babylon}>بابل</option>
                    <option value={IraqGovernorates.Wasit}>واسط</option>
                    <option value={IraqGovernorates.Diyala}>ديالى</option>
                    <option value={IraqGovernorates.Salahuddin}>صلاح الدين</option>
                    <option value={IraqGovernorates.Maysan}>ميسان</option>
                    <option value={IraqGovernorates.Muthanna}>المثنى</option>
                    <option value={IraqGovernorates.DhiQar}>ذي قار</option>
                    <option value={IraqGovernorates.Qadisiyyah}>القادسية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الاشتراك *
                  </label>
                  <select
                    value={agentData.subscriptionType}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionType: parseInt(e.target.value) as SubscriptionSystemType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={SubscriptionSystemType.Yearly}>سنوي</option>
                    <option value={SubscriptionSystemType.Daily}>يومي</option>
                    <option value={SubscriptionSystemType.Yearly}>سنوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ بداية الاشتراك *
                  </label>
                  <input
                    type="date"
                    value={agentData.subscriptionStartDate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionStartDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ انتهاء الاشتراك *
                  </label>
                  <input
                    type="date"
                    value={agentData.subscriptionEndDate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionEndDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    فترة التفعيل الافتراضية (أيام) *
                  </label>
                  <select
                    value={agentData.renewalPeriod || 30}
                    onChange={(e) => setAgentData(prev => ({ ...prev, renewalPeriod: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={1}>يوم تجريبي</option>
                    <option value={7}>أسبوع</option>
                    <option value={15}>أسبوعين</option>
                    <option value={30}>شهر</option>
                    <option value={60}>شهرين</option>
                    <option value={90}>ثلاثة أشهر</option>
                    <option value={180}>ستة أشهر</option>
                    <option value={365}>سنة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع التفعيل الافتراضي *
                  </label>
                  <select
                    value={agentData.renewalCalculationType || RenewalCalculationType.Fixed}
                    onChange={(e) => setAgentData(prev => ({ ...prev, renewalCalculationType: parseInt(e.target.value) as RenewalCalculationType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={RenewalCalculationType.Fixed}>ثابت (Fixed)</option>
                    <option value={RenewalCalculationType.MonthlyEnd}>حسب أيام الشهر (MonthlyEnd)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {agentData.renewalCalculationType === RenewalCalculationType.Fixed 
                      ? 'يضيف عدد الأيام المحددة للتاريخ الحالي'
                      : 'يحسب حتى آخر يوم من الشهر المقبل حسب عدد الأيام'
                    }
                  </p>
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الخدمة (SAS/FTTH) *
                  </label>
                  <select
                    value={agentData.serviceType ?? ServiceType.Sas}
                    onChange={(e) => setAgentData(prev => ({ ...prev, serviceType: parseInt(e.target.value) as ServiceType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={ServiceType.Sas}>SAS</option>
                    <option value={ServiceType.Ftth}>FTTH</option>
                    <option value={ServiceType.Earthlink}>Earthlink</option>
                    <option value={ServiceType.Zainfi}>Zain Fi²</option>
                    <option value={ServiceType.Fiberx}>FiberX</option>
                  </select>
                </div>

                <div className="md:col-span-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <label className="block text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                    خطة الوكيل (Tenant Plan)
                  </label>
                  <select
                    value={agentData.tenantPlanType ?? TenantPlanType.Standard}
                    onChange={(e) => setAgentData(prev => ({ ...prev, tenantPlanType: parseInt(e.target.value) as TenantPlanType }))}
                    className="w-full md:w-72 px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={TenantPlanType.Standard}>Standard</option>
                    <option value={TenantPlanType.Vip}>VIP</option>
                  </select>
                  <p className="text-xs text-amber-900 dark:text-amber-200 mt-2">
                    عند اختيار VIP سيتم تفعيل ميزة
                    <span className="font-mono mx-1">vip_test_api</span>
                    لهذا الوكيل من الباكند.
                  </p>

                  {(agentData.tenantPlanType ?? TenantPlanType.Standard) === TenantPlanType.Standard && (
                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                      طبقة الخطة القياسية (Economy / Plus / Gold) تُحدد من الخادم عند إنشاء الوكيل ولا تُرسل من هذه الشاشة.
                    </p>
                  )}
                </div>

                {usesSasCredentialFields(agentData.serviceType) ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'رابط Zain Fi² (SasBaseUrl)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'رابط FiberX — API (SasBaseUrl)؛ تسجيل الدخول: x.fiberx.iq'
                            : 'SAS Base URL'}
                      </label>
                      <input
                        type="text"
                        value={agentData.sasBaseUrl ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasBaseUrl: e.target.value }))}
                        placeholder={
                          agentData.serviceType === ServiceType.Zainfi
                            ? ZAINFI_DEFAULT_BASE_URL
                            : agentData.serviceType === ServiceType.Fiberx
                              ? FIBERX_DEFAULT_BASE_URL
                              : 'مثال: https://admin.uniquefi.net'
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'البريد / اسم المستخدم (SasUsername)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'البريد / اسم المستخدم FiberX (SasUsername)'
                            : 'SAS Username'}
                      </label>
                      <input
                        type="text"
                        value={agentData.sasUsername ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'كلمة مرور Zain Fi² (SasPassword)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'كلمة مرور FiberX (SasPassword)'
                            : 'SAS Password'}
                      </label>
                      <input
                        type="password"
                        value={agentData.sasPassword ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                ) : agentData.serviceType === ServiceType.Ftth ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Base URL
                      </label>
                      <input
                        type="text"
                        value={agentData.ftthBaseUrl ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthBaseUrl: e.target.value }))}
                        placeholder="الافتراضي: https://admin.ftth.iq"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Username
                      </label>
                      <input
                        type="text"
                        value={agentData.ftthUsername ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Password
                      </label>
                      <input
                        type="password"
                        value={agentData.ftthPassword ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 md:col-span-2">
                    Earthlink — لا إعدادات إضافية. الرابط عند التفعيل: https://admin.earthlink.iq/UserManagement.aspx
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                  </button>
                  <button 
                  onClick={handleAddAgent}
                  disabled={createAgentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAgentMutation.isPending ? 'جاري الإضافة...' : 'إضافة الوكيل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  تعديل الوكيل: {selectedAgent.fullName}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAgent(null);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    value={selectedAgent.username}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    حالة الحساب
                  </label>
                  <select
                    value={editIsActive ? '1' : '0'}
                    onChange={(e) => setEditIsActive(e.target.value === '1')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="1">نشط</option>
                    <option value="0">موقوف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={agentData.fullName || selectedAgent.fullName}
                    onChange={(e) => setAgentData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={agentData.phone || selectedAgent.phone}
                    onChange={(e) => setAgentData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الشركة
                  </label>
                  <input
                    type="text"
                    value={agentData.companyName || selectedAgent.companyName}
                    onChange={(e) => setAgentData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={agentData.address || selectedAgent.address || ''}
                    onChange={(e) => setAgentData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    معرف جلسة واتساب (WhatsApp Session ID)
                  </label>
                  <input
                    type="text"
                    value={agentData.whatsAppSessionId ?? selectedAgent.whatsAppSessionId ?? ''}
                    onChange={(e) => setAgentData(prev => ({ ...prev, whatsAppSessionId: e.target.value.trim() || undefined }))}
                    placeholder="اختياري - مثال: 7740240101"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المحافظة
                  </label>
                  <select
                    value={agentData.governorate || selectedAgent.governorate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, governorate: parseInt(e.target.value) as IraqGovernorates }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={IraqGovernorates.Baghdad}>بغداد</option>
                    <option value={IraqGovernorates.Basra}>البصرة</option>
                    <option value={IraqGovernorates.Mosul}>الموصل</option>
                    <option value={IraqGovernorates.Erbil}>أربيل</option>
                    <option value={IraqGovernorates.Sulaymaniyah}>السليمانية</option>
                    <option value={IraqGovernorates.Dohuk}>دهوك</option>
                    <option value={IraqGovernorates.Kirkuk}>كركوك</option>
                    <option value={IraqGovernorates.Anbar}>الأنبار</option>
                    <option value={IraqGovernorates.Karbala}>كربلاء</option>
                    <option value={IraqGovernorates.Najaf}>النجف</option>
                    <option value={IraqGovernorates.Babylon}>بابل</option>
                    <option value={IraqGovernorates.Wasit}>واسط</option>
                    <option value={IraqGovernorates.Diyala}>ديالى</option>
                    <option value={IraqGovernorates.Salahuddin}>صلاح الدين</option>
                    <option value={IraqGovernorates.Maysan}>ميسان</option>
                    <option value={IraqGovernorates.Muthanna}>المثنى</option>
                    <option value={IraqGovernorates.DhiQar}>ذي قار</option>
                    <option value={IraqGovernorates.Qadisiyyah}>القادسية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الاشتراك
                  </label>
                  <select
                    value={agentData.subscriptionType || selectedAgent.subscriptionType}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionType: parseInt(e.target.value) as SubscriptionSystemType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={SubscriptionSystemType.Yearly}>سنوي</option>
                    <option value={SubscriptionSystemType.Daily}>يومي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ بداية الاشتراك
                  </label>
                  <input
                    type="date"
                    value={agentData.subscriptionStartDate || selectedAgent.subscriptionStartDate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionStartDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ انتهاء الاشتراك
                  </label>
                  <input
                    type="date"
                    value={agentData.subscriptionEndDate || selectedAgent.subscriptionEndDate}
                    onChange={(e) => setAgentData(prev => ({ ...prev, subscriptionEndDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    فترة التفعيل الافتراضية (أيام)
                  </label>
                  <select
                    value={agentData.renewalPeriod || 30}
                    onChange={(e) => setAgentData(prev => ({ ...prev, renewalPeriod: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>يوم تجريبي</option>
                    <option value={7}>أسبوع</option>
                    <option value={15}>أسبوعين</option>
                    <option value={30}>شهر</option>
                    <option value={60}>شهرين</option>
                    <option value={90}>ثلاثة أشهر</option>
                    <option value={180}>ستة أشهر</option>
                    <option value={365}>سنة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع التفعيل الافتراضي
                  </label>
                  <select
                    value={agentData.renewalCalculationType || RenewalCalculationType.Fixed}
                    onChange={(e) => setAgentData(prev => ({ ...prev, renewalCalculationType: parseInt(e.target.value) as RenewalCalculationType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={RenewalCalculationType.Fixed}>ثابت (Fixed)</option>
                    <option value={RenewalCalculationType.MonthlyEnd}>حسب أيام الشهر (MonthlyEnd)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الخدمة (SAS/FTTH)
                  </label>
                  <select
                    value={agentData.serviceType ?? ServiceType.Sas}
                    onChange={(e) => setAgentData(prev => ({ ...prev, serviceType: parseInt(e.target.value) as ServiceType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={ServiceType.Sas}>SAS</option>
                    <option value={ServiceType.Ftth}>FTTH</option>
                    <option value={ServiceType.Earthlink}>Earthlink</option>
                    <option value={ServiceType.Zainfi}>Zain Fi²</option>
                    <option value={ServiceType.Fiberx}>FiberX</option>
                  </select>
                </div>

                {usesSasCredentialFields(agentData.serviceType) ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'رابط Zain Fi² (SasBaseUrl)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'رابط FiberX — API (SasBaseUrl)؛ تسجيل الدخول: x.fiberx.iq'
                            : 'SAS Base URL'}
                      </label>
                      <input
                        type="text"
                        value={agentData.sasBaseUrl ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasBaseUrl: e.target.value }))}
                        placeholder={
                          agentData.serviceType === ServiceType.Zainfi
                            ? ZAINFI_DEFAULT_BASE_URL
                            : agentData.serviceType === ServiceType.Fiberx
                              ? FIBERX_DEFAULT_BASE_URL
                              : 'مثال: https://admin.uniquefi.net'
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'البريد / اسم المستخدم (SasUsername)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'البريد / اسم المستخدم FiberX (SasUsername)'
                            : 'SAS Username'}
                      </label>
                      <input
                        type="text"
                        value={agentData.sasUsername ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {agentData.serviceType === ServiceType.Zainfi
                          ? 'كلمة مرور Zain Fi² (SasPassword)'
                          : agentData.serviceType === ServiceType.Fiberx
                            ? 'كلمة مرور FiberX (SasPassword)'
                            : 'SAS Password'}
                      </label>
                      <input
                        type="password"
                        value={agentData.sasPassword ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, sasPassword: e.target.value }))}
                        placeholder="اتركه فارغاً إذا لا تريد تغييره"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                ) : agentData.serviceType === ServiceType.Ftth ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Base URL
                      </label>
                      <input
                        type="text"
                        value={agentData.ftthBaseUrl ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthBaseUrl: e.target.value }))}
                        placeholder="الافتراضي: https://admin.ftth.iq"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Username
                      </label>
                      <input
                        type="text"
                        value={agentData.ftthUsername ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        FTTH Password
                      </label>
                      <input
                        type="password"
                        value={agentData.ftthPassword ?? ''}
                        onChange={(e) => setAgentData(prev => ({ ...prev, ftthPassword: e.target.value }))}
                        placeholder="اتركه فارغاً إذا لا تريد تغييره"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 md:col-span-2">
                    Earthlink — لا إعدادات إضافية. الرابط عند التفعيل: https://admin.earthlink.iq/UserManagement.aspx
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAgent(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateAgent}
                  disabled={updateAgentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateAgentMutation.isPending ? 'جاري التحديث...' : 'تحديث الوكيل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Agent Subscription Modal */}
      {showRenewModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  تجديد اشتراك الوكيل
                </h2>
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
      </div>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  الوكيل: {selectedAgent.fullName}
          </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الشركة: {selectedAgent.companyName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تاريخ انتهاء الاشتراك الحالي: {formatDate(selectedAgent.subscriptionEndDate)}
                </p>
                <div className="flex items-center mt-2">
                  {(() => {
                    const status = getSubscriptionStatus(selectedAgent);
                    return (
                      <>
                        <status.icon className={`h-4 w-4 ml-2 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.text}
                        </span>
                        {selectedAgent.daysUntilExpiry > 0 && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                            ({selectedAgent.daysUntilExpiry} يوم متبقي)
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الاشتراك الجديد *
                  </label>
                  <select
                    value={renewalData.newSubscriptionType}
                    onChange={(e) => setRenewalData(prev => ({ ...prev, newSubscriptionType: parseInt(e.target.value) as SubscriptionSystemType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value={SubscriptionSystemType.Yearly}>سنوي</option>
                    <option value={SubscriptionSystemType.Daily}>يومي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ انتهاء الاشتراك الجديد *
                  </label>
                  <input
                    type="date"
                    value={renewalData.newSubscriptionEndDate}
                    onChange={(e) => setRenewalData(prev => ({ ...prev, newSubscriptionEndDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRenewSubscription}
                  disabled={renewAgentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renewAgentMutation.isPending ? 'جاري التجديد...' : 'تجديد الاشتراك'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employees Modal */}
      {showEmployeesModal && selectedAgentForEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                موظفو الوكيل: {selectedAgentForEmployees.fullName}
              </h2>
              <button
                onClick={() => {
                  setShowEmployeesModal(false);
                  setSelectedAgentForEmployees(null);
                  setShowAddEmployeeModal(false);
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {!showAddEmployeeModal ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="mb-4 flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    إضافة موظف
                  </button>
                  <ul className="space-y-2">
                    {employeesList?.length ? (
                      employeesList.map((emp) => (
                        <li
                          key={emp.id}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{emp.fullName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{emp.username}</p>
                            <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className={emp.isActive ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                {emp.isActive ? 'نشط' : 'غير نشط'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">·</span>
                              <span className="text-gray-600 dark:text-gray-300">
                                {emp.role === UserRole.SubAgent ? 'مدير ثانوي' : 'موظف'}
                              </span>
                            </p>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 dark:text-gray-400 py-4 text-center text-sm">
                        لا يوجد موظفون مسجلون
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">إضافة موظف جديد</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم *</label>
                    <input
                      type="text"
                      value={newEmployeeData.username}
                      onChange={(e) => setNewEmployeeData((p) => ({ ...p, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={newEmployeeData.fullName}
                      onChange={(e) => setNewEmployeeData((p) => ({ ...p, fullName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور *</label>
                    <input
                      type="password"
                      value={newEmployeeData.password}
                      onChange={(e) => setNewEmployeeData((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور</label>
                    <select
                      value={newEmployeeData.role ?? UserRole.Employee}
                      onChange={(e) => setNewEmployeeData((p) => ({ ...p, role: parseInt(e.target.value, 10) as UserRole }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value={UserRole.Employee}>موظف</option>
                      <option value={UserRole.SubAgent}>مدير ثانوي</option>
                    </select>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الصلاحيات</p>
                    {newEmployeeData.role === UserRole.SubAgent ? (
                      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                        <p className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">منح جميع الصلاحيات</p>
                        <p className="text-xs text-primary-700 dark:text-primary-300">
                          المدير الثانوي يملك نفس صلاحيات الوكيل: تفعيل وتعديل وحذف مشترك، إضافة وتعديل وحذف دين، عرض تفاصيل دين، الفواتير وإيصالات التجديد، الحسابات والرصيد والتسليمات، وغيرها.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {EMPLOYEE_PERMISSION_FORM_KEYS.map((key) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={getEmployeePermissionChecked(newEmployeeData, key)}
                              onChange={(e) => setNewEmployeeData((p) => ({ ...p, [key]: e.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            {EMPLOYEE_PERMISSION_LABELS[key]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEmployeeModal(false);
                        setNewEmployeeData({ username: '', fullName: '', password: '', role: UserRole.Employee, ...DEFAULT_EMPLOYEE_PERMISSIONS });
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddEmployee}
                      disabled={createEmployeeMutation.isPending}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
                    >
                      {createEmployeeMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedAgent && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => {
            setShowChangePasswordModal(false);
            setSelectedAgent(null);
          }}
          agentId={selectedAgent.id}
          agentName={selectedAgent.fullName}
        />
      )}
    </div>
  );
};

export default AgentsPage;