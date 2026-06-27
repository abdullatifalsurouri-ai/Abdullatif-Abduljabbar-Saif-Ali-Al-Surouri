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
  Edit2
} from 'lucide-react';
import { User, RoleType, UserPermissions, Warehouse } from '../types';

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
  warehouses = []
}: SettingsViewProps) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
    transfers: 'write'
  });

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
    transfers: 'none'
  });

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
      transfers: 'none'
    };

    if (role === 'Owner') {
      defaultPerms = {
        items: 'write',
        movements: 'write',
        suppliers: 'write',
        reports: 'read',
        settings: 'write',
        warehouses: 'write',
        transfers: 'write'
      };
    } else if (role === 'Admin') {
      defaultPerms = {
        items: 'write',
        movements: 'write',
        suppliers: 'write',
        reports: 'read',
        settings: 'read', // Can read settings, not write them by default
        warehouses: 'write',
        transfers: 'write'
      };
    } else if (role === 'Storekeeper') {
      defaultPerms = {
        items: 'read',
        movements: 'write',
        suppliers: 'read',
        reports: 'read',
        settings: 'none',
        warehouses: 'read',
        transfers: 'write'
      };
    } else if (role === 'Viewer') {
      defaultPerms = {
        items: 'read',
        movements: 'read',
        suppliers: 'read',
        reports: 'read',
        settings: 'none',
        warehouses: 'read',
        transfers: 'read'
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
          warehouseId: newWarehouseId
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
          warehouseId: editWarehouseId
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
              <span className="text-[10px] text-slate-400 font-extrabold block">الصلاحيات والوصول المفعل:</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>

                {/* Granular Permission Toggles (Edit) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-500 block">تخصيص صلاحيات الوصول المحددة:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 text-[10px]">
                    {/* Items */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="font-extrabold text-slate-500 block text-center">الأصناف</span>
                      <select
                        value={editPermissions.items}
                        onChange={(e) => setEditPermissions({ ...editPermissions, items: e.target.value as any })}
                        disabled={editingUser.username.toLowerCase() === 'owner'}
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
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
                        className="w-full bg-slate-50 text-[10px] p-1 rounded-md text-right border border-slate-200 cursor-pointer"
                      >
                        <option value="write">إنشاء وقبول/رفض</option>
                        <option value="read">عرض فقط</option>
                        <option value="none">محجوب</option>
                      </select>
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
