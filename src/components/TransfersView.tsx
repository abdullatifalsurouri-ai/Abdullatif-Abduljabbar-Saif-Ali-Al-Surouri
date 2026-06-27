import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  X, 
  Hourglass, 
  CheckCircle, 
  XCircle, 
  Bell, 
  User, 
  Warehouse as WarehouseIcon, 
  Info, 
  TrendingUp, 
  Lock 
} from 'lucide-react';
import { WarehouseTransfer, Warehouse, Item, User as UserType } from '../types';

interface TransfersViewProps {
  transfers: WarehouseTransfer[];
  warehouses: Warehouse[];
  items: Item[];
  currentUser: UserType;
  isDataLocked: boolean;
  onAddTransfer: (transfer: WarehouseTransfer) => void;
  onAcceptTransfer: (transferId: string) => void;
  onRejectTransfer: (transferId: string) => void;
}

export default function TransfersView({
  transfers,
  warehouses,
  items,
  currentUser,
  isDataLocked,
  onAddTransfer,
  onAcceptTransfer,
  onRejectTransfer,
}: TransfersViewProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  // Find transfers that are pending and belong to the current user's managed warehouse
  // Or the current user is the manager of the destination warehouse
  const managedWarehouseIds = warehouses
    .filter((wh) => wh.manager.toLowerCase() === currentUser.username.toLowerCase())
    .map((wh) => wh.id);

  const pendingIncomingTransfers = transfers.filter(
    (tr) => tr.status === 'pending' && managedWarehouseIds.includes(tr.toWarehouseId)
  );

  const filteredTransfers = transfers.filter((tr) => {
    // Status filter
    if (statusFilter !== 'all' && tr.status !== statusFilter) return false;

    // Search query match
    const fromWh = warehouses.find((w) => w.id === tr.fromWarehouseId)?.name || '';
    const toWh = warehouses.find((w) => w.id === tr.toWarehouseId)?.name || '';
    const itemName = items.find((i) => i.id === tr.itemId)?.name || '';
    
    const query = search.toLowerCase();
    return (
      tr.id.toLowerCase().includes(query) ||
      fromWh.toLowerCase().includes(query) ||
      toWh.toLowerCase().includes(query) ||
      itemName.toLowerCase().includes(query) ||
      tr.createdBy.toLowerCase().includes(query)
    );
  });

  const openAddForm = () => {
    if (isDataLocked) return;
    
    // Default fromWarehouse: if current user is manager of a warehouse, set it
    const defaultFrom = managedWarehouseIds[0] || warehouses[0]?.id || '';
    const defaultTo = warehouses.find((w) => w.id !== defaultFrom)?.id || '';
    
    setFromWarehouseId(defaultFrom);
    setToWarehouseId(defaultTo);
    setItemId(items[0]?.id || '');
    setQuantity('');
    setError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!fromWarehouseId || !toWarehouseId || !itemId || !quantity) {
      setError('يرجى تعبئة كافة الحقول المطلوبة!');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setError('لا يمكن التحويل لنفس المستودع! يرجى اختيار مستودع مختلف.');
      return;
    }

    if (qty <= 0) {
      setError('يرجى إدخال كمية صالحة أكبر من الصفر.');
      return;
    }

    const targetWarehouse = warehouses.find((w) => w.id === toWarehouseId);

    const transferId = `TR-${Date.now().toString().slice(-4)}`;
    const newTransfer: WarehouseTransfer = {
      id: transferId,
      fromWarehouseId,
      toWarehouseId,
      itemId,
      quantity: qty,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      createdBy: currentUser.username,
      handledBy: targetWarehouse?.manager || '',
    };

    onAddTransfer(newTransfer);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header section with add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-right">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="text-blue-600 stroke-[2.5]" size={24} />
            <span>التحويلات المخزنية بين المستودعات</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            متابعة حية للتحويلات الصادرة والواردة، القبول والرفض الإلكتروني بواسطة مسؤولي المستودعات.
          </p>
        </div>

        {!isDataLocked && (
          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer self-start sm:self-auto hover:scale-[1.02]"
          >
            <Plus size={18} className="stroke-[3]" />
            <span>طلب تحويل مخزني</span>
          </button>
        )}
      </div>

      {/* Notifications Panel for incoming transfers */}
      {pendingIncomingTransfers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-3xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/10 text-blue-600 p-2 rounded-xl animate-bounce">
              <Bell size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-blue-900">طلبات تحويل واردة بانتظار موافقتك</h4>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">أنت مسؤول عن المستودع المستهدف. يرجى قبول أو رفض الشحنة المخزنية بعد مطابقتها.</p>
            </div>
          </div>

          <div className="space-y-2">
            {pendingIncomingTransfers.map((tr) => {
              const item = items.find((i) => i.id === tr.itemId);
              const fromWh = warehouses.find((w) => w.id === tr.fromWarehouseId);
              const toWh = warehouses.find((w) => w.id === tr.toWarehouseId);

              return (
                <div 
                  key={`pending-${tr.id}`} 
                  className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">#{tr.id}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{tr.date}</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">
                      طلب تحويل <span className="text-blue-600">{tr.quantity} {item?.unit || 'وحدة'}</span> من صنف <span className="text-slate-900">"{item?.name || 'صنف غير معروف'}"</span>
                    </p>
                    <div className="text-xs text-slate-400 font-medium">
                      <span>من: {fromWh?.name}</span>
                      <span className="mx-1.5">•</span>
                      <span>إلى: {toWh?.name}</span>
                      <span className="mx-1.5">•</span>
                      <span>بواسطة: {tr.createdBy}</span>
                    </div>
                  </div>

                  {!isDataLocked && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => onAcceptTransfer(tr.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        قبول التحويل ✅
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('هل أنت متأكد من رفض هذا التحويل المخزني؟')) {
                            onRejectTransfer(tr.id);
                          }
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black px-4 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-3 flex-1">
          <Search className="text-slate-400 stroke-[2.5]" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث برقم التحويل، اسم المستودع، الصنف..."
            className="w-full bg-transparent text-right text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden placeholder-slate-400"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0 gap-1 overflow-x-auto">
          {(['all', 'pending', 'accepted', 'rejected'] as const).map((filter) => {
            const labels = {
              all: 'الكل',
              pending: 'قيد الانتظار ⏳',
              accepted: 'مقبول ✅',
              rejected: 'مرفوض ❌',
            };
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transfers Table / Cards */}
      <div className="space-y-3">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لا توجد سجلات تحويل مخزني مطابقة للبحث</p>
          </div>
        ) : (
          filteredTransfers.map((tr) => {
            const item = items.find((i) => i.id === tr.itemId);
            const fromWh = warehouses.find((w) => w.id === tr.fromWarehouseId);
            const toWh = warehouses.find((w) => w.id === tr.toWarehouseId);

            const statusStyles = {
              pending: {
                bg: 'bg-amber-50 border-amber-100/60 text-amber-700',
                label: 'قيد الانتظار',
                icon: <Hourglass size={14} className="stroke-[2.5]" />
              },
              accepted: {
                bg: 'bg-emerald-50 border-emerald-100/60 text-emerald-700',
                label: 'تم القبول والاستلام',
                icon: <CheckCircle size={14} className="stroke-[2.5]" />
              },
              rejected: {
                bg: 'bg-rose-50 border-rose-100/60 text-rose-700',
                label: 'مرفوض',
                icon: <XCircle size={14} className="stroke-[2.5]" />
              },
            }[tr.status];

            return (
              <div
                key={tr.id}
                className={`bg-white border hover:border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all border-slate-100`}
              >
                <div className="space-y-1.5 flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 font-mono">#{tr.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">({tr.date})</span>
                  </div>
                  
                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                    {item ? item.name : 'صنف غير معروف'}
                  </h4>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                    <span>من: {fromWh?.name || tr.fromWarehouseId}</span>
                    <span>•</span>
                    <span>إلى: {toWh?.name || tr.toWarehouseId}</span>
                    <span>•</span>
                    <span>بواسطة: {tr.createdBy}</span>
                  </div>
                </div>

                {/* Amount indicator + Status badge */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {tr.quantity} {item?.unit || 'حبة'}
                  </span>
                  
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${statusStyles.bg}`}>
                    {statusStyles.icon}
                    <span>{statusStyles.label}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Request Transfer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 text-right overflow-hidden flex flex-col max-h-[90vh]"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight size={20} className="stroke-[2.5]" />
                <h3 className="font-extrabold text-base sm:text-lg">
                  طلب تحويل مخزني جديد
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

              {/* From Warehouse Select */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">المستودع المصدر (من) *</label>
                <select
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                  className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- اختر مستودع المصدر --</option>
                  {warehouses.map((wh) => (
                    <option key={`from-${wh.id}`} value={wh.id}>
                      {wh.name} (مسؤول: {wh.manager})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Warehouse Select */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">المستودع المستهدف (إلى) *</label>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- اختر مستودع المستهدف --</option>
                  {warehouses.map((wh) => (
                    <option key={`to-${wh.id}`} value={wh.id}>
                      {wh.name} (مسؤول: {wh.manager})
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">الصنف المراد تحويله *</label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">الكمية المطلوبة للتحويل *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-2xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500"
                  placeholder="أدخل الكمية بالأرقام"
                  min="1"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  إرسال الطلب
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
    </div>
  );
}
