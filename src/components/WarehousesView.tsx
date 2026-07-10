import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, MapPin, User, Warehouse as WarehouseIcon, Lock, CheckCircle, Info, ArrowLeftRight, ClipboardList } from 'lucide-react';
import { Warehouse, User as UserType, Item, Movement, WarehouseTransfer, InvoiceSettings } from '../types';
import TransfersView from './TransfersView';
import InventoryView from './InventoryView';

interface WarehousesViewProps {
  warehouses: Warehouse[];
  users: UserType[];
  items: Item[];
  movements: Movement[];
  isDataLocked: boolean;
  onAddWarehouse: (warehouse: Warehouse) => void;
  onEditWarehouse: (warehouse: Warehouse) => void;
  onDeleteWarehouse: (id: string) => void;

  // Additional props for integrated Transfers & Inventory tabs
  transfers: WarehouseTransfer[];
  currentUser: UserType;
  transfersLocked: boolean;
  onAddTransfer: (transfer: WarehouseTransfer) => void;
  onAcceptTransfer: (transferId: string) => void;
  onRejectTransfer: (transferId: string) => void;
  invoiceSettings?: InvoiceSettings;
  onAddMovement?: (movement: Movement) => void;
  activeSubTab?: 'warehouses' | 'transfers' | 'inventory';
  onSubTabChange?: (tab: 'warehouses' | 'transfers' | 'inventory') => void;
}

export default function WarehousesView({
  warehouses,
  users,
  items,
  movements,
  isDataLocked,
  onAddWarehouse,
  onEditWarehouse,
  onDeleteWarehouse,
  transfers,
  currentUser,
  transfersLocked,
  onAddTransfer,
  onAcceptTransfer,
  onRejectTransfer,
  invoiceSettings,
  onAddMovement,
  activeSubTab: propActiveSubTab,
  onSubTabChange: propOnSubTabChange,
}: WarehousesViewProps) {
  const [localSubTab, setLocalSubTab] = useState<'warehouses' | 'transfers' | 'inventory'>('warehouses');
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : localSubTab;
  const setActiveSubTab = propOnSubTabChange !== undefined ? propOnSubTabChange : setLocalSubTab;
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Form State
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredWarehouses = warehouses.filter((wh) =>
    wh.name.toLowerCase().includes(search.toLowerCase()) ||
    wh.id.toLowerCase().includes(search.toLowerCase()) ||
    (wh.location && wh.location.toLowerCase().includes(search.toLowerCase())) ||
    wh.manager.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = () => {
    if (isDataLocked) return;
    setEditingWarehouse(null);
    setId(`WH-00${warehouses.length + 1}`);
    setName('');
    // Default to the first available user or empty
    setManager(users[0]?.username || 'Owner');
    setLocation('');
    setError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (wh: Warehouse) => {
    if (isDataLocked) return;
    setEditingWarehouse(wh);
    setId(wh.id);
    setName(wh.name);
    setManager(wh.manager);
    setLocation(wh.location || '');
    setError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim() || !name.trim() || !manager.trim()) {
      setError('يرجى تعبئة جميع الحقول الإلزامية!');
      return;
    }

    // If adding, ensure ID is unique
    if (!editingWarehouse && warehouses.some((wh) => wh.id.toLowerCase() === id.trim().toLowerCase())) {
      setError('رمز المستودع هذا مستخدم بالفعل!');
      return;
    }

    const warehouseData: Warehouse = {
      id: id.trim().toUpperCase(),
      name: name.trim(),
      manager: manager.trim(),
      location: location.trim(),
    };

    if (editingWarehouse) {
      onEditWarehouse(warehouseData);
    } else {
      onAddWarehouse(warehouseData);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Bar */}
      <div className="flex border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-3xl gap-2 text-right shadow-2xs" dir="rtl">
        <button
          onClick={() => setActiveSubTab('warehouses')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'warehouses'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-900/50'
          }`}
        >
          <WarehouseIcon size={16} className="stroke-[2.5]" />
          <span>إدارة المستودعات</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'transfers'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-900/50'
          }`}
        >
          <ArrowLeftRight size={16} className="stroke-[2.5]" />
          <span>التحويلات المخزنية</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-900/50'
          }`}
        >
          <ClipboardList size={16} className="stroke-[2.5]" />
          <span>الجرد التلقائي</span>
        </button>
      </div>

      {activeSubTab === 'transfers' ? (
        <TransfersView
          transfers={transfers}
          warehouses={warehouses}
          items={items}
          currentUser={currentUser}
          isDataLocked={transfersLocked}
          onAddTransfer={onAddTransfer}
          onAcceptTransfer={onAcceptTransfer}
          onRejectTransfer={onRejectTransfer}
        />
      ) : activeSubTab === 'inventory' ? (
        <InventoryView
          items={items}
          movements={movements}
          warehouses={warehouses}
          invoiceSettings={invoiceSettings}
          currentUser={currentUser}
          onAddMovement={onAddMovement}
          isDataLocked={isDataLocked}
        />
      ) : (
        <>
          {/* Header section with add button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-right">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                <WarehouseIcon className="text-blue-600 stroke-[2.5]" size={24} />
                <span>شاشة إدارة المستودعات</span>
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">
                إنشاء مستودعات جديدة، تعيين المسؤولين، وإدارة السعة المخزنية الذكية.
              </p>
            </div>

            {!isDataLocked && (
              <button
                onClick={openAddForm}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer self-start sm:self-auto hover:scale-[1.02]"
              >
                <Plus size={18} className="stroke-[3]" />
                <span>إضافة مستودع جديد</span>
              </button>
            )}
          </div>

          {/* Filter and search bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100/80 shadow-xs flex items-center gap-3">
            <Search className="text-slate-400 stroke-[2.5]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالاسم، الرمز، الموقع، أو مسؤول المستودع..."
              className="w-full bg-transparent text-right text-sm font-bold text-slate-700 focus:outline-hidden placeholder-slate-400"
              dir="rtl"
            />
          </div>

          {/* Warehouses list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWarehouses.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
                <p className="text-sm font-semibold">لا توجد مستودعات مسجلة مطابقة للبحث</p>
              </div>
            ) : (
              filteredWarehouses.map((wh) => {
                // Stats for this warehouse
                const whMovements = movements.filter((m) => m.warehouseId === wh.id);
                const whInwardCount = whMovements.filter((m) => m.type === 'in').reduce((acc, curr) => acc + curr.quantity, 0);
                const whOutwardCount = whMovements.filter((m) => m.type === 'out').reduce((acc, curr) => acc + curr.quantity, 0);
                const currentStock = whInwardCount - whOutwardCount;

                return (
                  <div
                    key={wh.id}
                    className="bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-3xl shadow-xs transition-all relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    {/* Upper row: Warehouse Title & Edit controls */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl shrink-0">
                          <WarehouseIcon size={20} className="stroke-[2.5]" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-blue-600 font-mono bg-blue-50/50 px-2 py-0.5 rounded-md">
                              {wh.id}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base sm:text-lg mt-1">
                            {wh.name}
                          </h3>
                        </div>
                      </div>

                      {!isDataLocked && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditForm(wh)}
                            className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                            title="تعديل المستودع"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف المستودع ${wh.name}؟ لن يتم حذف حركات الأصناف المخزنة فيه.`)) {
                                onDeleteWarehouse(wh.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"
                            title="حذف المستودع"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Warehouse Location & Manager info */}
                    <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl text-right text-xs text-slate-500 font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{wh.location || 'غير محدد'}</span>
                        <MapPin size={14} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-slate-700 font-bold">{wh.manager}</span>
                        <span className="text-slate-400">مسؤول المستودع:</span>
                        <User size={14} className="text-slate-400 stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Stock Summary */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-emerald-50/40 border border-emerald-100/20 p-2.5 rounded-2xl">
                        <span className="block text-[10px] font-black text-emerald-600/70">إجمالي الوارد</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">+{whInwardCount}</span>
                      </div>
                      <div className="bg-orange-50/40 border border-orange-100/20 p-2.5 rounded-2xl">
                        <span className="block text-[10px] font-black text-orange-600/70">إجمالي الصرف</span>
                        <span className="text-sm font-black text-orange-600 font-mono">-{whOutwardCount}</span>
                      </div>
                      <div className="bg-blue-50/40 border border-blue-100/20 p-2.5 rounded-2xl">
                        <span className="block text-[10px] font-black text-blue-600/70">المخزون الحالي</span>
                        <span className="text-sm font-black text-blue-600 font-mono">
                          {currentStock >= 0 ? currentStock : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add / Edit Warehouse Modal */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 text-right overflow-hidden flex flex-col max-h-[90vh]"
                dir="rtl"
              >
                {/* Modal Header */}
                <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <WarehouseIcon size={20} className="stroke-[2.5]" />
                    <h3 className="font-extrabold text-base sm:text-lg">
                      {editingWarehouse ? 'تعديل بيانات المستودع' : 'إضافة مستودع جديد'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Form body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <Info size={14} className="shrink-0 stroke-[2.2]" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Warehouse ID (Locked when editing) */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500">رمز المستودع (مثال: WH-001)</label>
                    <input
                      type="text"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      disabled={!!editingWarehouse}
                      className={`w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 ${
                        editingWarehouse ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="WH-001"
                    />
                  </div>

                  {/* Warehouse Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500">اسم المستودع *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500"
                      placeholder="المستودع الرئيسي، مستودع الغربية..."
                    />
                  </div>

                  {/* Manager Selection Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500">مسؤول المستودع *</label>
                    <select
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      {users.length === 0 ? (
                        <option value="Owner">Owner</option>
                      ) : (
                        users.map((u) => (
                          <option key={u.username} value={u.username}>
                            {u.username} ({u.role})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Location Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500">الموقع الجغرافي / الوصف</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500"
                      placeholder="الرياض - حي الملز، جدة - الصناعية..."
                    />
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-2xl transition-all shadow-md cursor-pointer"
                    >
                      {editingWarehouse ? 'حفظ التغييرات' : 'إضافة المستودع'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3 rounded-2xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
