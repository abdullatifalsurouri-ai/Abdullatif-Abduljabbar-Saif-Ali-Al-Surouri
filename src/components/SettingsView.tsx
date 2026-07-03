import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  KeyRound, 
  Lock, 
  Unlock,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Database,
  CloudLightning,
  AlertTriangle,
  User as UserIcon,
  Shield,
  Edit2,
  Clock,
  Search,
  Filter,
  Activity,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Bell,
  Receipt
} from 'lucide-react';
import { User, RoleType, UserPermissions, Warehouse, AuditLogEntry, Item, Movement, Supplier, WarehouseTransfer, InvoiceSettings } from '../types';

interface SettingsViewProps {
  currentUser: User;
  onLogout: () => void;
  isDataLocked: boolean;
  onToggleLock: (locked: boolean) => void;
  onTriggerSync: () => Promise<boolean>;
  lastSyncTime: string | null;
  isOnline: boolean;
  onResetAllData: () => void;
  warehouses?: Warehouse[];
  auditLogs?: AuditLogEntry[];
  items?: Item[];
  movements?: Movement[];
  suppliers?: Supplier[];
  transfers?: WarehouseTransfer[];
  dashboardStatsConfig: {
    showSuppliers: boolean;
    showItems: boolean;
    showTotalOutward: boolean;
    showTotalInward: boolean;
    showTotalValue: boolean;
    showDailyMovements: boolean;
    showLowStock: boolean;
  };
  onChangeDashboardStatsConfig: (config: any) => void;
  invoiceSettings?: InvoiceSettings;
  onUpdateInvoiceSettings?: (settings: InvoiceSettings) => void;
  expirationAlertMonths?: number;
  onUpdateExpirationAlertMonths?: (months: number) => void;
}

export default function SettingsView({
  currentUser,
  onLogout,
  isDataLocked,
  onToggleLock,
  onTriggerSync,
  lastSyncTime,
  isOnline,
  onResetAllData,
  warehouses = [],
  auditLogs = [],
  items = [],
  movements = [],
  suppliers = [],
  transfers = [],
  dashboardStatsConfig,
  onChangeDashboardStatsConfig,
  invoiceSettings,
  onUpdateInvoiceSettings,
  expirationAlertMonths = 1,
  onUpdateExpirationAlertMonths,
}: SettingsViewProps) {
  const [settingsTab, setSettingsTab] = useState<'general' | 'audit'>('general');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    return localStorage.getItem('wms_last_backup_date');
  });

  // Invoice settings local states
  const [compName, setCompName] = useState(invoiceSettings?.name || '');
  const [compAddress, setCompAddress] = useState(invoiceSettings?.address || '');
  const [compPhone, setCompPhone] = useState(invoiceSettings?.phone || '');
  const [compEmail, setCompEmail] = useState(invoiceSettings?.email || '');
  const [compFooter, setCompFooter] = useState(invoiceSettings?.footerNote || '');
  const [compLogo, setCompLogo] = useState(invoiceSettings?.logo || '');

  useEffect(() => {
    if (invoiceSettings) {
      setCompName(invoiceSettings.name);
      setCompAddress(invoiceSettings.address);
      setCompPhone(invoiceSettings.phone);
      setCompEmail(invoiceSettings.email || '');
      setCompFooter(invoiceSettings.footerNote || '');
      setCompLogo(invoiceSettings.logo || '');
    }
  }, [invoiceSettings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150000) {
        alert('حجم الصورة كبير جداً! الرجاء اختيار صورة أقل من 150 كيلوبايت لضمان سرعة التزامن السحابي.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compAddress || !compPhone) {
      alert('الرجاء تعبئة اسم الجهة/الشركة والعنوان والهاتف كحد أدنى.');
      return;
    }
    if (onUpdateInvoiceSettings) {
      onUpdateInvoiceSettings({
        name: compName,
        address: compAddress,
        phone: compPhone,
        email: compEmail,
        footerNote: compFooter,
        logo: compLogo
      });
      alert('تم حفظ وتحديث إعدادات الفاتورة والترويسة بنجاح وسيتم مزامنتها مع السحابة!');
    }
  };

  const handleDownloadFullBackup = () => {
    try {
      const backupData = {
        version: "3.0",
        app: "wms_al_mada_v3",
        exportedAt: new Date().toISOString(),
        warehouseData: {
          items: items || [],
          movements: movements || [],
          suppliers: suppliers || [],
          warehouses: warehouses || [],
          transfers: transfers || [],
          auditLogs: auditLogs || []
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `warehouse_full_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      const now = new Date().toISOString();
      localStorage.setItem('wms_last_backup_date', now);
      setLastBackupDate(now);

      alert('تم تحميل النسخة الاحتياطية الكاملة للمستودع بنجاح! 💾');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تحميل البيانات الاحتياطية.');
    }
  };

  // Audit Log filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('all');
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all');
  const [auditStartDate, setAuditStartDate] = useState<string>('');
  const [auditEndDate, setAuditEndDate] = useState<string>('');

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleType>('Storekeeper');
  const [newWarehouseId, setNewWarehouseId] = useState<string>('');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    items: 'read',
    movements: 'write',
    suppliers: 'read',
    reports: 'read',
    settings: 'none',
    warehouses: 'read',
    transfers: 'write',
    canAddIncoming: true,
    canAddOutgoing: true,
    canApproveTransfer: true,
    canEditPrices: false,
    canImportExportCSV: true,
    canResetSystem: false,
    canEditInvoiceSettings: false
  });
  const [newMaxDevices, setNewMaxDevices] = useState<number>(1);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<RoleType>('Storekeeper');
  const [editWarehouseId, setEditWarehouseId] = useState<string>('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    items: 'read',
    movements: 'none',
    suppliers: 'none',
    reports: 'none',
    settings: 'none',
    warehouses: 'none',
    transfers: 'none',
    canAddIncoming: false,
    canAddOutgoing: false,
    canApproveTransfer: false,
    canEditPrices: false,
    canImportExportCSV: false,
    canResetSystem: false,
    canEditInvoiceSettings: false
  });
  const [editMaxDevices, setEditMaxDevices] = useState<number>(1);

  const [ownerResetPassword, setOwnerResetPassword] = useState('');
  const [ownerResetError, setOwnerResetError] = useState<string | null>(null);
  const [isOwnerResetting, setIsOwnerResetting] = useState(false);
  const [showOwnerConfirmReset, setShowOwnerConfirmReset] = useState(false);

  // Keep newWarehouseId in sync with warehouses if not set
  useEffect(() => {
    if (!newWarehouseId && warehouses.length > 0) {
      setNewWarehouseId(warehouses[0].id);
    }
  }, [warehouses, newWarehouseId]);

  // Check if current user has permissions to write settings (manage users)
  const canManageUsers = currentUser.permissions.settings === 'write' || currentUser.role === 'Owner';

  // Fetch users from backend
  const fetchUsers = async () => {
    if (!canManageUsers) return;
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Handle role templates for default permissions
  const handleRoleChange = (role: RoleType, mode: 'create' | 'edit') => {
    let defaultPerms: UserPermissions = {
      items: 'none',
      movements: 'none',
      suppliers: 'none',
      reports: 'none',
      settings: 'none',
      warehouses: 'none',
      transfers: 'none',
      canAddIncoming: false,
      canAddOutgoing: false,
      canApproveTransfer: false,
      canEditPrices: false,
      canImportExportCSV: false,
      canResetSystem: false,
      canEditInvoiceSettings: false
    };

    if (role === 'Owner') {
      defaultPerms = {
        items: 'write',
        movements: 'write',
        suppliers: 'write',
        reports: 'read',
        settings: 'write',
        warehouses: 'write',
        transfers: 'write',
        canAddIncoming: true,
        canAddOutgoing: true,
        canApproveTransfer: true,
        canEditPrices: true,
        canImportExportCSV: true,
        canResetSystem: true,
        canEditInvoiceSettings: true
      };
    } else if (role === 'Admin') {
      defaultPerms = {
        items: 'write',
        movements: 'write',
        suppliers: 'write',
        reports: 'read',
        settings: 'read', // Can read settings, not write them by default
        warehouses: 'write',
        transfers: 'write',
        canAddIncoming: true,
        canAddOutgoing: true,
        canApproveTransfer: true,
        canEditPrices: true,
        canImportExportCSV: true,
        canResetSystem: false,
        canEditInvoiceSettings: true
      };
    } else if (role === 'Storekeeper') {
      defaultPerms = {
        items: 'read',
        movements: 'write',
        suppliers: 'read',
        reports: 'read',
        settings: 'none',
        warehouses: 'read',
        transfers: 'write',
        canAddIncoming: true,
        canAddOutgoing: true,
        canApproveTransfer: true,
        canEditPrices: false,
        canImportExportCSV: true,
        canResetSystem: false,
        canEditInvoiceSettings: false
      };
    } else if (role === 'Viewer') {
      defaultPerms = {
        items: 'read',
        movements: 'read',
        suppliers: 'read',
        reports: 'read',
        settings: 'none',
        warehouses: 'read',
        transfers: 'read',
        canAddIncoming: false,
        canAddOutgoing: false,
        canApproveTransfer: false,
        canEditPrices: false,
        canImportExportCSV: false,
        canResetSystem: false,
        canEditInvoiceSettings: false
      };
    }

    if (mode === 'create') {
      setNewRole(role);
      setNewPermissions(defaultPerms);
    } else {
      setEditRole(role);
      setEditPermissions(defaultPerms);
    }
  };

  // Submit new user
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUser = newUsername.trim();
    if (!trimmedUser || !newPassword) {
      setErrorMessage('يرجى تعبئة اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUser,
          password: newPassword,
          role: newRole,
          permissions: newPermissions,
          warehouseId: newWarehouseId,
          maxDevices: newMaxDevices
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'فشل إضافة المستخدم');
      } else {
        setSuccessMessage(`تم إنشاء حساب المستخدم "${trimmedUser}" بنجاح!`);
        setNewUsername('');
        setNewPassword('');
        setNewWarehouseId(warehouses[0]?.id || '');
        setNewMaxDevices(1);
        handleRoleChange('Storekeeper', 'create');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('خطأ في الاتصال بالخادم السحابي');
    }
  };

  // Submit edit user
  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/users/${editingUser.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: editPassword || undefined,
          role: editRole,
          permissions: editPermissions,
          warehouseId: editWarehouseId,
          maxDevices: editMaxDevices
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'فشل تحديث بيانات المستخدم');
      } else {
        setSuccessMessage(`تم تحديث بيانات المستخدم "${editingUser.username}" بنجاح!`);
        setEditingUser(null);
        setEditPassword('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('خطأ في الاتصال بالخادم السحابي');
    }
  };

  // Delete user
  const handleDeleteUser = async (username: string) => {
    if (username.toLowerCase() === 'owner') {
      alert('لا يمكن حذف المستخدم المالك الرئيسي للمستودع!');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف المستخدم "${username}" نهائياً؟`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'فشل حذف المستخدم');
      } else {
        setSuccessMessage(`تم حذف المستخدم "${username}" بنجاح.`);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('خطأ في الاتصال بالخادم السحابي');
    }
  };

  // Trigger manual sync
  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      const success = await onTriggerSync();
      setSyncStatus(success ? 'success' : 'error');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  const uniqueUsersInLogs = Array.from(new Set(auditLogs.map(log => log.username))).filter(Boolean);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.role.toLowerCase().includes(auditSearch.toLowerCase());
    
    const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
    const matchesEntity = auditEntityFilter === 'all' || log.entityType === auditEntityFilter;
    const matchesUser = auditUserFilter === 'all' || log.username === auditUserFilter;
    
    // Check Date boundary safely
    const logTime = new Date(log.date).getTime();
    const matchesStartDate = !auditStartDate || logTime >= new Date(auditStartDate + 'T00:00:00').getTime();
    const matchesEndDate = !auditEndDate || logTime <= new Date(auditEndDate + 'T23:59:59').getTime();
    
    return matchesSearch && matchesAction && matchesEntity && matchesUser && matchesStartDate && matchesEndDate;
  });

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-md shadow-blue-500/20">
              <Settings size={22} className="stroke-[2.2] text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">إعدادات النظام والأمان</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">إدارة الحسابات، صلاحيات الموظفين، والتزامن السحابي</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="bg-rose-600/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 text-rose-400 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            تسجيل الخروج من الحساب 🚪
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-3xs max-w-sm">
        <button
          type="button"
          onClick={() => setSettingsTab('general')}
          className={`flex-1 py-2 text-xs font-black transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
            settingsTab === 'general'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Settings size={14} />
          <span>الإعدادات العامة</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsTab('audit')}
          className={`flex-1 py-2 text-xs font-black transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
            settingsTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Activity size={14} />
          <span>سجل النشاطات (Audit Log)</span>
        </button>
      </div>

      {settingsTab === 'general' ? (
        <>
          {/* Grid: Profile info & Cloud Sync */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Profile Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <UserIcon size={18} className="text-blue-500 shrink-0" />
                <span className="text-xs font-black text-slate-800">بيانات الحساب الحالي</span>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">اسم المستخدم:</span>
                  <span className="text-xs font-black text-slate-700">{currentUser.username}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">الدور والوظيفة:</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black">
                    {currentUser.role === 'Owner' ? 'المالك والمشرف العام (Owner)' : 
                     currentUser.role === 'Admin' ? 'المدير المالي الإداري (Admin)' : 
                     currentUser.role === 'Storekeeper' ? 'أمين المستودع والمخازن' : 'مستكشف التقارير فقط'}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-extrabold block">صلاحيات الشاشات والوصول:</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold">الأصناف:</span>
                      <span className={`font-black ${currentUser.permissions.items === 'write' ? 'text-emerald-600' : currentUser.permissions.items === 'read' ? 'text-blue-500' : 'text-slate-400'}`}>
                        {currentUser.permissions.items === 'write' ? 'إدخال وتعديل' : currentUser.permissions.items === 'read' ? 'قراءة فقط' : 'محجوب'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold">الحركات (وارد/صرف):</span>
                      <span className={`font-black ${currentUser.permissions.movements === 'write' ? 'text-emerald-600' : currentUser.permissions.movements === 'read' ? 'text-blue-500' : 'text-slate-400'}`}>
                        {currentUser.permissions.movements === 'write' ? 'إضافة وتوثيق' : currentUser.permissions.movements === 'read' ? 'قراءة فقط' : 'محجوب'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold">الموردين:</span>
                      <span className={`font-black ${currentUser.permissions.suppliers === 'write' ? 'text-emerald-600' : currentUser.permissions.suppliers === 'read' ? 'text-blue-500' : 'text-slate-400'}`}>
                        {currentUser.permissions.suppliers === 'write' ? 'إدارة وتعديل' : currentUser.permissions.suppliers === 'read' ? 'قراءة فقط' : 'محجوب'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold">التقارير المالية:</span>
                      <span className={`font-black ${currentUser.permissions.reports === 'read' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {currentUser.permissions.reports === 'read' ? 'متاحة للتصفح' : 'محجوبة'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold block">صلاحيات العمليات والمهام:</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg">
                      <span className="text-slate-400 font-bold">تسجيل وارد:</span>
                      <span className={`font-black ${currentUser.permissions.canAddIncoming !== false ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {currentUser.permissions.canAddIncoming !== false ? 'مسموح' : 'تعطيل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg">
                      <span className="text-slate-400 font-bold">تسجيل صرف:</span>
                      <span className={`font-black ${currentUser.permissions.canAddOutgoing !== false ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {currentUser.permissions.canAddOutgoing !== false ? 'مسموح' : 'تعطيل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg">
                      <span className="text-slate-400 font-bold">اعتماد تحويل:</span>
                      <span className={`font-black ${currentUser.permissions.canApproveTransfer !== false ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {currentUser.permissions.canApproveTransfer !== false ? 'مسموح' : 'تعطيل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg">
                      <span className="text-slate-400 font-bold">تعديل أسعار:</span>
                      <span className={`font-black ${currentUser.permissions.canEditPrices ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {currentUser.permissions.canEditPrices ? 'مسموح' : 'تعطيل'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Sync Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <CloudLightning size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-black text-slate-800">مركز المزامنة السحابية والإنترنت</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">حالة الاتصال بالإنترنت:</span>
                  {isOnline ? (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-3 py-1 rounded-full font-black flex items-center gap-1">
                      ● متصل بالشبكة (أونلاين)
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-700 text-[10px] px-3 py-1 rounded-full font-black flex items-center gap-1">
                      ● غير متصل (أوفلاين)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">آخر تزامن وتأكيد سحابي:</span>
                  <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg">
                    {lastSyncTime ? lastSyncTime : 'لم يتم المزامنة بعد'}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleForceSync}
                    disabled={isSyncing || !isOnline}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-black py-3 rounded-2xl transition-all shadow-md shadow-purple-600/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>جاري التزامن الآن سحابياً...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>تحديث ومزامنة قاعدة البيانات السحابية فوراً</span>
                      </>
                    )}
                  </button>

                  {syncStatus === 'success' && (
                    <p className="text-[10px] text-emerald-600 font-bold text-center mt-2 animate-slide-down">
                      ✓ تم دمج وتحديث جميع البيانات في جهازك الحالي مع السحابة المركزية بنجاح!
                    </p>
                  )}
                  {syncStatus === 'error' && (
                    <p className="text-[10px] text-rose-500 font-bold text-center mt-2 animate-slide-down">
                      ❌ فشل تحديث المزامنة. تأكد من اتصالك بالإنترنت وصلاحية الخادم.
                    </p>
                  )}
                </div>

                {/* Read-Only Safety Switch */}
                <div className="border-t border-slate-50 pt-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-700 block">إقفال بيانات المستودع مؤقتاً</span>
                    <span className="text-[9px] text-slate-400 font-bold leading-normal block">تفعيل وضع القراءة فقط لحماية المخزن من أي تعديل مفاجئ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser.role !== 'Owner' && currentUser.role !== 'Admin') {
                        alert('هذا الإجراء يتطلب صلاحية المالك أو المدير!');
                        return;
                      }
                      onToggleLock(!isDataLocked);
                    }}
                    className={`p-1.5 px-3 rounded-xl border text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                      isDataLocked 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {isDataLocked ? (
                      <>
                        <Lock size={12} className="text-amber-600" />
                        <span>مقفل ومؤمن</span>
                      </>
                    ) : (
                      <>
                        <Unlock size={12} className="text-slate-400" />
                        <span>مفتوح للتعديل</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Header/Footer Settings Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-blue-600 shrink-0" />
                  <span className="text-xs font-black text-slate-800">إعدادات ترويسة وتذييل الفواتير والتقارير المطبوعة</span>
                </div>
                {!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true) && (
                  <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-100">
                    🔒 عرض فقط (لا تملك الصلاحية)
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveInvoiceSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Logo Selector & Preview */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] text-slate-400 font-extrabold block text-center w-full">شعار المؤسسة / الشركة</span>
                    
                    <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-3xs relative">
                      {compLogo ? (
                        <img src={compLogo} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center p-2">
                          <Receipt size={24} className="text-slate-300 mx-auto mb-1" />
                          <span className="text-[8px] text-slate-400 font-bold block">لا يوجد شعار</span>
                        </div>
                      )}
                    </div>

                    {(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true) && (
                      <div className="w-full">
                        <label className="block text-center bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-black py-2 rounded-xl cursor-pointer transition-all border border-blue-200">
                          <span>اختر صورة الشعار</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload} 
                            className="hidden" 
                          />
                        </label>
                        {compLogo && (
                          <button
                            type="button"
                            onClick={() => setCompLogo('')}
                            className="w-full mt-1.5 text-center text-[9px] text-rose-500 hover:text-rose-600 font-bold block"
                          >
                            إزالة الشعار الحالي
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Center & Right Column: Details Fields */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-extrabold">اسم الجهة / المؤسسة <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                          disabled={!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true)}
                          className="w-full bg-slate-50 text-xs font-bold p-2.5 rounded-xl border border-slate-200/80 focus:border-blue-500 outline-hidden disabled:bg-slate-100/50"
                          placeholder="مثال: مؤسسة المدى الذكي للتجارة"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-extrabold">رقم الهاتف والتواصل <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={compPhone}
                          onChange={(e) => setCompPhone(e.target.value)}
                          disabled={!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true)}
                          className="w-full bg-slate-50 text-xs font-bold p-2.5 rounded-xl border border-slate-200/80 focus:border-blue-500 outline-hidden disabled:bg-slate-100/50"
                          placeholder="مثال: +967775104368"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-extrabold">العنوان والموقع <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={compAddress}
                          onChange={(e) => setCompAddress(e.target.value)}
                          disabled={!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true)}
                          className="w-full bg-slate-50 text-xs font-bold p-2.5 rounded-xl border border-slate-200/80 focus:border-blue-500 outline-hidden disabled:bg-slate-100/50"
                          placeholder="مثال: صنعاء - شارع الستين"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-extrabold">البريد الإلكتروني (اختياري)</label>
                        <input
                          type="email"
                          value={compEmail}
                          onChange={(e) => setCompEmail(e.target.value)}
                          disabled={!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true)}
                          className="w-full bg-slate-50 text-xs font-bold p-2.5 rounded-xl border border-slate-200/80 focus:border-blue-500 outline-hidden disabled:bg-slate-100/50"
                          placeholder="مثال: info@company.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold">الملاحظة التذييلية للفاتورة / التقرير (Footer Note)</label>
                      <textarea
                        value={compFooter}
                        onChange={(e) => setCompFooter(e.target.value)}
                        disabled={!(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true)}
                        rows={2}
                        className="w-full bg-slate-50 text-xs font-bold p-2.5 rounded-xl border border-slate-200/80 focus:border-blue-500 outline-hidden disabled:bg-slate-100/50 resize-none"
                        placeholder="أدخل نص التذييل الذي يظهر أسفل الفواتير والتقارير المطبوعة"
                      />
                    </div>
                  </div>
                </div>

                {(currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.permissions.canEditInvoiceSettings === true) && (
                  <div className="flex justify-end pt-2 border-t border-slate-50">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                    >
                      حفظ إعدادات الفاتورة والترويسة
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Dashboard Customization Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Settings size={18} className="text-blue-600 shrink-0" />
                <span className="text-xs font-black text-slate-800">تخصيص لوحة التحكم (البطاقات الإحصائية)</span>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                اختر البطاقات الإحصائية والتحليلات التي ترغب بظهورها في الصفحة الرئيسية لتناسب طبيعة عملك اليومي:
              </p>

              <div className="space-y-2.5">
                {[
                  { key: 'showSuppliers', label: 'إجمالي الموردين' },
                  { key: 'showItems', label: 'إجمالي الأصناف' },
                  { key: 'showTotalOutward', label: 'إجمالي كمية الصرف' },
                  { key: 'showTotalInward', label: 'إجمالي كمية الوارد' },
                  { key: 'showTotalValue', label: 'إجمالي قيمة المخزون (ر.س)' },
                  { key: 'showDailyMovements', label: 'عدد الحركات اليومية' },
                  { key: 'showLowStock', label: 'الأصناف منخفضة المخزون' },
                ].map((stat) => (
                  <div key={stat.key} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">{stat.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeDashboardStatsConfig({
                          ...dashboardStatsConfig,
                          [stat.key]: !dashboardStatsConfig[stat.key as keyof typeof dashboardStatsConfig]
                        });
                      }}
                      className={`p-1 px-3.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        dashboardStatsConfig[stat.key as keyof typeof dashboardStatsConfig]
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {dashboardStatsConfig[stat.key as keyof typeof dashboardStatsConfig] ? 'نشط (ظاهر) ✓' : 'محجوب ✕'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Backup Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Database size={18} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-black text-slate-800">النسخ الاحتياطي الوقائي والوقاية الإضافية</span>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  بإمكانك تحميل نسخة احتياطية كاملة من قاعدة بيانات المستودع (بما يشمل الأصناف، الموردين، العمليات المخزنية، السجلات، والتحويلات) محلياً على جهازك بصيغة JSON، كإجراء وقائي إضافي لمواجهة الطوارئ.
                </p>

                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 text-[10px] text-emerald-800 font-semibold space-y-1">
                  <p>● البيانات محمية ومؤمنة بالكامل.</p>
                  <p>● ينصح بتحميل النسخة بصفة دورية عند تغيير البيانات الكبرى.</p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-2xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} />
                  <span>تحميل النسخة الاحتياطية الشاملة (JSON)</span>
                </button>

                {/* تاريخ آخر نسخة احتياطية والتحذير البصري */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] font-bold text-slate-700">
                    <span>تاريخ آخر نسخة احتياطية محلية:</span>
                    <span className="text-emerald-700 font-extrabold">
                      {lastBackupDate 
                        ? new Date(lastBackupDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'لا يوجد حتى الآن'}
                    </span>
                  </div>

                  {(() => {
                    const needsWarning = !lastBackupDate || (() => {
                      const lastBackupTime = new Date(lastBackupDate).getTime();
                      const diffDays = (Date.now() - lastBackupTime) / (1000 * 60 * 60 * 24);
                      return diffDays > 7;
                    })();

                    if (needsWarning) {
                      return (
                        <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-2xl text-[10px] text-amber-800 font-bold flex items-center gap-2 animate-pulse-subtle">
                          <span className="text-sm">⚠️</span>
                          <p className="leading-relaxed">
                            تنبيه: لقد مرّ أكثر من 7 أيام (أو لم يتم بعد) دون حفظ نسخة احتياطية محلية على هذا الجهاز. يُنصح بتحميل نسخة احتياطية الآن للحفاظ على سلامة بياناتك!
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

          </div>

          {/* Success/Error Alerts for settings forms */}
          {(errorMessage || successMessage) && (
            <div className="p-4 rounded-2xl border transition-all text-xs font-bold leading-relaxed">
              {errorMessage && (
                <div className="bg-rose-50 border-rose-100 text-rose-600 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>⚠️ خطأ: {errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 border-emerald-100 text-emerald-700 flex items-start gap-2">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* User Management Section (Only visible to Owners/Admins who can manage settings) */}
          {canManageUsers ? (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-xs p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <span className="text-xs font-black text-slate-800">إدارة مستخدمي المستودع وصلاحيات الموظفين</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono font-black">
                  عدد المستخدمين: {usersList.length}
                </span>
              </div>

              {/* Edit User Form Modal/Overlay when active */}
              {editingUser && (
                <div className="bg-slate-50 border border-blue-100 p-4 rounded-2xl space-y-4 animate-slide-down">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                      <Edit2 size={13} />
                      تعديل بيانات وصلاحيات الحساب: <strong className="text-slate-800">{editingUser.username}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  </div>

                  <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">تحديث كلمة المرور (اتركه فارغاً للاحتفاظ بالحالية)</label>
                        <input
                          type="password"
                          placeholder="كلمة مرور سرية جديدة"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">المسمى الوظيفي والدور الأساسي</label>
                        <select
                          value={editRole}
                          onChange={(e) => handleRoleChange(e.target.value as RoleType, 'edit')}
                          disabled={editingUser.username.toLowerCase() === 'owner'}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right cursor-pointer font-bold"
                        >
                          <option value="Owner">المالك العام (Owner)</option>
                          <option value="Admin">مدير للنظام (Admin)</option>
                          <option value="Storekeeper">أمين مستودع (Storekeeper)</option>
                          <option value="Viewer">مشاهد تقارير فقط (Viewer)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">المستودع المرتبط بالمسؤول *</label>
                        <select
                          value={editWarehouseId}
                          onChange={(e) => setEditWarehouseId(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl text-right cursor-pointer font-bold text-slate-700"
                        >
                          {warehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">الحد الأقصى للأجهزة المتزامنة *</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={editMaxDevices}
                          onChange={(e) => setEditMaxDevices(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Granular Permission Toggles (Edit) */}
                    <div className="space-y-4">
                      {/* صلاحيات الشاشات */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">صلاحيات الشاشات (الوصول)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 text-[10px]">
                          {/* Items */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">الأصناف</span>
                            <select
                              value={editPermissions.items}
                              onChange={(e) => setEditPermissions({ ...editPermissions, items: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إدخال وتعديل</option>
                              <option value="read">قراءة فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>

                          {/* Movements */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">الحركات (وارد/صرف)</span>
                            <select
                              value={editPermissions.movements}
                              onChange={(e) => setEditPermissions({ ...editPermissions, movements: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إضافة وتوثيق</option>
                              <option value="read">قراءة فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>

                          {/* Suppliers */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">الموردين</span>
                            <select
                              value={editPermissions.suppliers}
                              onChange={(e) => setEditPermissions({ ...editPermissions, suppliers: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إدارة وتعديل</option>
                              <option value="read">قراءة فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>

                          {/* Reports */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">التقارير</span>
                            <select
                              value={editPermissions.reports}
                              onChange={(e) => setEditPermissions({ ...editPermissions, reports: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="read">متاحة</option>
                              <option value="none">محجوبة</option>
                            </select>
                          </div>

                          {/* Settings */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">الحسابات والأمان</span>
                            <select
                              value={editPermissions.settings}
                              onChange={(e) => setEditPermissions({ ...editPermissions, settings: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إدارة كاملة</option>
                              <option value="read">قراءة فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>

                          {/* Warehouses */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">المستودعات</span>
                            <select
                              value={editPermissions.warehouses}
                              onChange={(e) => setEditPermissions({ ...editPermissions, warehouses: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إدارة كاملة</option>
                              <option value="read">عرض فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>

                          {/* Transfers */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">التحويلات المخزنية</span>
                            <select
                              value={editPermissions.transfers}
                              onChange={(e) => setEditPermissions({ ...editPermissions, transfers: e.target.value as any })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold"
                            >
                              <option value="write">إنشاء وقبول/رفض</option>
                              <option value="read">عرض فقط</option>
                              <option value="none">محجوب</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* صلاحيات العمليات */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">صلاحيات العمليات (المهام)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-[10px]">
                          {/* canAddIncoming */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">تسجيل حركة وارد</span>
                            <select
                              value={editPermissions.canAddIncoming ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canAddIncoming: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canAddOutgoing */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">تسجيل حركة صرف</span>
                            <select
                              value={editPermissions.canAddOutgoing ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canAddOutgoing: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canApproveTransfer */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">اعتماد التحويلات</span>
                            <select
                              value={editPermissions.canApproveTransfer ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canApproveTransfer: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canEditPrices */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">تعديل الأسعار والعملة</span>
                            <select
                              value={editPermissions.canEditPrices ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canEditPrices: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canImportExportCSV */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">استيراد CSV وتصدير</span>
                            <select
                              value={editPermissions.canImportExportCSV ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canImportExportCSV: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canResetSystem */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-slate-500 block text-center">تصفير قاعدة البيانات</span>
                            <select
                              value={editPermissions.canResetSystem ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canResetSystem: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>

                          {/* canEditInvoiceSettings */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-blue-700 block text-center">إعدادات الفواتير</span>
                            <select
                              value={editPermissions.canEditInvoiceSettings ? "true" : "false"}
                              onChange={(e) => setEditPermissions({ ...editPermissions, canEditInvoiceSettings: e.target.value === "true" })}
                              disabled={editingUser.username.toLowerCase() === 'owner'}
                              className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer font-bold text-slate-700"
                            >
                              <option value="true">مسموح</option>
                              <option value="false">تعطيل</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                    >
                      <span>حفظ الصلاحيات والتغييرات السحابية للمستخدم</span>
                    </button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User List Table Panel (Col span 2) */}
                <div className="lg:col-span-2 space-y-3">
                  <span className="text-xs font-black text-slate-500 block">قائمة مستخدمي النظام المسجلين:</span>
                  
                  {isLoadingUsers ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري تحميل قائمة الموظفين...</span>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl bg-slate-50/30 overflow-hidden space-y-2 p-2 max-h-[350px] overflow-y-auto">
                      {usersList.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-bold">لا يوجد مستخدمون معرفون</p>
                      ) : (
                        usersList.map((userObj) => (
                          <div key={userObj.username} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-3xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-800">{userObj.username}</span>
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                  {userObj.role}
                                </span>
                                {userObj.activeDevicesCount > 0 ? (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    متصل حالياً ({userObj.activeDevicesCount})
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                    غير متصل
                                  </span>
                                )}
                              </div>
                              {/* Permission chips summaries */}
                              <div className="flex flex-wrap gap-1 text-[8px] text-slate-400 font-bold">
                                <span>الأصناف ({userObj.permissions.items})</span> • 
                                <span>الحركات ({userObj.permissions.movements})</span> • 
                                <span>التقارير ({userObj.permissions.reports})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(userObj);
                                  setEditPassword('');
                                  setEditRole(userObj.role);
                                  setEditPermissions(userObj.permissions);
                                  setEditWarehouseId(userObj.warehouseId || '');
                                  setEditMaxDevices(userObj.maxDevices || 1);
                                }}
                                className="bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-2 rounded-xl transition-all cursor-pointer"
                                title="تعديل صلاحيات المستخدم"
                              >
                                <Edit2 size={13} />
                              </button>

                              {userObj.username.toLowerCase() !== 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(userObj.username)}
                                  className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all cursor-pointer"
                                  title="حذف هذا الحساب نهائياً"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Create User Panel */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
                  <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                    <UserPlus size={15} />
                    إنشاء مستخدم جديد وصلاحية:
                  </span>

                  <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">اسم المستخدم للجديد *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: keeper_ahmed"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">كلمة المرور الافتراضية *</label>
                      <input
                        type="password"
                        required
                        placeholder="أدخل كلمة مرور قوية"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white font-mono text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">رتبة ووظيفة المستخدم *</label>
                      <select
                        value={newRole}
                        onChange={(e) => handleRoleChange(e.target.value as RoleType, 'create')}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl text-right cursor-pointer"
                      >
                        <option value="Admin">مدير للنظام (Admin)</option>
                        <option value="Storekeeper">أمين مستودع ومخازن</option>
                        <option value="Viewer">مشاهد تقارير وجرد</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">المستودع المرتبط بالمسؤول *</label>
                      <select
                        value={newWarehouseId}
                        onChange={(e) => setNewWarehouseId(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl text-right cursor-pointer font-bold text-slate-700"
                      >
                        {warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">الحد الأقصى للأجهزة المتزامنة *</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={newMaxDevices}
                        onChange={(e) => setNewMaxDevices(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white text-right font-bold text-slate-700"
                      />
                    </div>

                    {/* Role Template Description */}
                    <p className="text-[9px] text-slate-400 font-bold leading-normal bg-white p-2 rounded-lg border border-slate-100">
                      💡 سيتم تفعيل صلاحيات تلقائية تناسب دور "{newRole}". يمكنك تعديلها أو تخصيصها لاحقاً لضمان حماية المستودع.
                    </p>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                    >
                      <UserPlus size={13} className="stroke-[2.5]" />
                      <span>تأكيد وإنشاء حساب الموظف</span>
                    </button>
                  </form>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl text-center text-slate-400 text-xs font-bold leading-relaxed">
              🔒 إدارة الحسابات وصلاحيات الموظفين تقتصر فقط على مشرفي المستودع أو المالك الرئيسي للنظام.
            </div>
          )}

          {/* Cloud Master Reset Section (Owner Only) */}
          {currentUser.role === 'Owner' && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-5 space-y-3 text-right">
              <div className="flex items-center gap-2 text-rose-700">
                <Database size={18} className="stroke-[2]" />
                <span className="text-xs font-black">تهيئة وإعادة تصفير المستودع (خاص بالمالك)</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                تحذير: هذا الخيار سيقوم بمسح كافة الأصناف والحركات وسجلات الموردين والمجموعات وإعادتها لوضع المصنع التلقائي مع تصفير جميع العمليات على الخادم السحابي!
              </p>
              
              {!showOwnerConfirmReset ? (
                <button
                  type="button"
                  onClick={() => setShowOwnerConfirmReset(true)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  مسح وتهيئة مستندات المستودع بالكامل 🗑️
                </button>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-rose-200/50 rounded-2xl p-4 space-y-3 mt-3 animate-fade-in text-right">
                  <span className="text-[11px] font-black text-rose-700 block">⚠️ تأكيد تهيئة قاعدة البيانات بكلمة المرور:</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal">
                    يرجى إدخال كلمة المرور الخاصة بحسابك ({currentUser.username}) لتأكيد رغبتك في حذف وتصفير جميع المستندات نهائياً:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="أدخل كلمة مرور المالك للتأكيد"
                      value={ownerResetPassword}
                      onChange={(e) => {
                        setOwnerResetPassword(e.target.value);
                        setOwnerResetError(null);
                      }}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl font-mono text-right outline-hidden focus:border-red-500 focus:bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isOwnerResetting}
                        onClick={async () => {
                          if (!ownerResetPassword) {
                            setOwnerResetError('يرجى إدخال كلمة المرور للتأكيد');
                            return;
                          }
                          setIsOwnerResetting(true);
                          setOwnerResetError(null);
                          try {
                            const response = await fetch('/api/auth/verify-reset', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ username: currentUser.username, password: ownerResetPassword })
                            });
                            const data = await response.json();
                            if (response.ok && data.success) {
                              onResetAllData();
                              setShowOwnerConfirmReset(false);
                              setOwnerResetPassword('');
                              alert('تم مسح وإعادة تعيين المستودع بالكامل بنجاح! 🎉');
                            } else {
                              setOwnerResetError(data.error || 'كلمة المرور غير صحيحة للتأكيد');
                            }
                          } catch (err) {
                            setOwnerResetError('خطأ في الاتصال بالخادم للتأكيد');
                          } finally {
                            setIsOwnerResetting(false);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[90px]"
                      >
                        {isOwnerResetting ? 'جاري التحقق...' : 'تأكيد المسح'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOwnerConfirmReset(false);
                          setOwnerResetPassword('');
                          setOwnerResetError(null);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                  {ownerResetError && (
                    <p className="text-[10px] text-red-500 font-bold">{ownerResetError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xs p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-blue-600 animate-pulse" />
              <span className="text-xs font-black text-slate-800">سجل النشاطات والأمان المتكامل (Audit Log)</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono font-black">
              إجمالي النشاطات: {filteredLogs.length} من أصل {auditLogs.length}
            </span>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Search */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">بحث في السجل</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث باسم الموظف أو التفاصيل..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs pl-3 pr-8 py-2 rounded-xl text-right outline-hidden"
                  />
                  <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Specific Username Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">الموظف (اسم المستخدم)</label>
                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right cursor-pointer font-bold"
                >
                  <option value="all">الكل (جميع المستخدمين)</option>
                  {uniqueUsersInLogs.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع العملية</label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right cursor-pointer font-bold"
                >
                  <option value="all">الكل (جميع العمليات)</option>
                  <option value="add">إضافة (+)</option>
                  <option value="edit">تعديل (📝)</option>
                  <option value="delete">حذف (🗑️)</option>
                  <option value="sync">مزامنة سحابية (🔄)</option>
                  <option value="import">استيراد بيانات (📥)</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Entity Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">القسم المستهدف</label>
                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-right cursor-pointer font-bold"
                >
                  <option value="all">الكل (جميع الأقسام)</option>
                  <option value="items">الأصناف</option>
                  <option value="movements">الحركات</option>
                  <option value="suppliers">الموردين</option>
                  <option value="warehouses">المستودعات</option>
                  <option value="transfers">التحويلات</option>
                  <option value="system">النظام</option>
                </select>
              </div>
            </div>

            {/* Date Filtering row & Clear Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 border-t border-slate-100/60 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">من تاريخ (البدء)</label>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => setAuditStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-xl text-right outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">إلى تاريخ (الانتهاء)</label>
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => setAuditEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-xl text-right outline-hidden"
                />
              </div>

              {/* Clear filters action button */}
              {(auditSearch || auditActionFilter !== 'all' || auditEntityFilter !== 'all' || auditUserFilter !== 'all' || auditStartDate || auditEndDate) ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditActionFilter('all');
                    setAuditEntityFilter('all');
                    setAuditUserFilter('all');
                    setAuditStartDate('');
                    setAuditEndDate('');
                  }}
                  className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-black text-[10px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>مسح وتصفير فلاتر البحث 🔄</span>
                </button>
              ) : (
                <div className="hidden sm:block text-[9px] text-slate-400 font-bold text-left py-2.5">
                  تصفية متقدمة نشطة لسهولة مراقبة الأمان والعمليات
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs Table / Timeline */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-3xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-extrabold">
                    <th className="p-3">الوقت والتاريخ</th>
                    <th className="p-3">الحساب والموظف</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">القسم</th>
                    <th className="p-3">تفاصيل العمليات والنشاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد نشاطات مطابقة للبحث الحالي.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      // Style badges nicely
                      let actionBadgeColor = 'bg-slate-100 text-slate-600';
                      let actionText: string = log.action;
                      if (log.action === 'add') {
                        actionBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        actionText = 'إضافة';
                      } else if (log.action === 'edit') {
                        actionBadgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                        actionText = 'تعديل';
                      } else if (log.action === 'delete') {
                        actionBadgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                        actionText = 'حذف';
                      } else if (log.action === 'sync') {
                        actionBadgeColor = 'bg-purple-50 text-purple-700 border-purple-100';
                        actionText = 'مزامنة';
                      } else if (log.action === 'import') {
                        actionBadgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                        actionText = 'استيراد';
                      }

                      let entityText: string = log.entityType;
                      if (log.entityType === 'items') entityText = 'الأصناف';
                      else if (log.entityType === 'movements') entityText = 'الحركات';
                      else if (log.entityType === 'suppliers') entityText = 'الموردين';
                      else if (log.entityType === 'warehouses') entityText = 'المستودعات';
                      else if (log.entityType === 'transfers') entityText = 'التحويلات';
                      else if (log.entityType === 'system') entityText = 'النظام';

                      const localDate = new Date(log.date).toLocaleString('ar-SA', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                          {/* Date */}
                          <td className="p-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-slate-400" />
                              <span>{localDate}</span>
                            </div>
                          </td>
                          {/* User */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-extrabold text-slate-800">{log.username}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{log.role}</div>
                          </td>
                          {/* Action badge */}
                          <td className="p-3 whitespace-nowrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${actionBadgeColor}`}>
                              {actionText}
                            </span>
                          </td>
                          {/* Entity Type */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md font-extrabold">
                              {entityText}
                            </span>
                          </td>
                          {/* Details */}
                          <td className="p-3 text-slate-600 font-medium leading-relaxed max-w-sm break-words">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Master Reset Section (Owner Only) */}
      {currentUser.role === 'Owner' && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-5 space-y-3 text-right">
          <div className="flex items-center gap-2 text-rose-700">
            <Database size={18} className="stroke-[2]" />
            <span className="text-xs font-black">تهيئة وإعادة تصفير المستودع (خاص بالمالك)</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
            تحذير: هذا الخيار سيقوم بمسح كافة الأصناف والحركات وسجلات الموردين والمجموعات وإعادتها لوضع المصنع التلقائي مع تصفير جميع العمليات على الخادم السحابي!
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm('⚠️ هل أنت متأكد تماماً من تهيئة قاعدة البيانات بالكامل؟ هذا الإجراء لا يمكن التراجع عنه وسيمسح السجلات السحابية أيضاً!')) {
                onResetAllData();
              }
            }}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            مسح وتهيئة مستندات المستودع بالكامل 🗑️
          </button>
        </div>
      )}

    </div>
  );
}
