import React, { useState } from 'react';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, X, Check, Calendar, ArrowLeftRight, Lock, Camera, Image as ImageIcon } from 'lucide-react';
import { Movement, Item, Supplier, Warehouse, User } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';
import MovementPhotoCapture from './MovementPhotoCapture';
import VirtualList from './VirtualList';

interface MovementsViewProps {
  movements: Movement[];
  items: Item[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  currentUser: User;
  isDataLocked: boolean;
  onAddMovement: (movement: Movement) => void;
  onDeleteMovement: (id: number) => void;
}

export default function MovementsView({
  movements,
  items,
  suppliers,
  warehouses = [],
  currentUser,
  isDataLocked,
  onAddMovement,
  onDeleteMovement,
}: MovementsViewProps) {
  const [activeType, setActiveType] = useState<'in' | 'out'>('in');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemId: '',
    quantity: 1,
    type: 'in' as 'in' | 'out',
    partner: '',
    date: new Date().toISOString().split('T')[0],
    photo: '',
    warehouseId: currentUser.warehouseId || (warehouses[0]?.id || ''),
  });

  // Filter movements by selected type (وارد vs صرف)
  const filteredMovements = movements
    .filter((m) => m.type === activeType)
    .sort((a, b) => b.id - a.id); // Show latest first

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || formData.quantity <= 0 || !formData.partner.trim()) {
      alert('الرجاء تعبئة جميع الحقول المطلوبة!');
      return;
    }

    const nextId = movements.length > 0 ? Math.max(...movements.map((m) => m.id)) + 1 : 1001;

    onAddMovement({
      id: nextId,
      itemId: formData.itemId,
      quantity: Number(formData.quantity),
      type: formData.type,
      partner: formData.partner.trim(),
      date: formData.date,
      photo: formData.photo || undefined,
      warehouseId: formData.warehouseId,
    });

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Header with FAB */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الحركات</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تسجيل ومتابعة حركات الوارد (التوريد) والصرف (البيع/التصدير)</p>
        </div>
        {!isDataLocked && (
          <button
            onClick={() => {
              setFormData({
                itemId: items[0]?.id || '',
                quantity: 1,
                type: activeType,
                partner: '',
                date: new Date().toISOString().split('T')[0],
                photo: '',
                warehouseId: currentUser.warehouseId || (warehouses[0]?.id || ''),
              });
              setIsFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full transition-all shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            title="إضافة حركة جديدة"
          >
            <Plus size={22} className="stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Lock Warning Banner */}
      {isDataLocked && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
            <Lock size={18} className="stroke-[2.5]" />
          </div>
          <div className="text-xs font-bold leading-relaxed text-right">
            وضع القراءة فقط نشط: تم قفل البيانات في الإعدادات لمنع تسجيل حركات مخزنية جديدة أو حذفها حالياً.
          </div>
        </div>
      )}

      {/* Toggle Filter (Inward vs Outward) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex w-full">
        <button
          onClick={() => setActiveType('in')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeType === 'in'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowDownLeft size={16} />
          <span>حركة الوارد</span>
        </button>
        <button
          onClick={() => setActiveType('out')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeType === 'out'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowUpRight size={16} />
          <span>حركة الصرف</span>
        </button>
      </div>

      {/* Movements list */}
      <div className="w-full">
        {filteredMovements.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لا توجد حركات مسجلة لهذا التصنيف</p>
            <p className="text-xs mt-1">سجل حركة جديدة بالنقر على زر الإضافة (+) في الأعلى</p>
          </div>
        ) : (
          <VirtualList
            items={filteredMovements}
            itemHeight={90}
            containerHeight="max-h-[60vh]"
            renderItem={(movement) => {
              const item = items.find((i) => i.id === movement.itemId);
              const isInward = movement.type === 'in';

              return (
                <div
                  key={movement.id}
                  className={`bg-white border hover:border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all ${
                    isInward ? 'border-r-4 border-r-emerald-500 border-slate-100' : 'border-r-4 border-r-orange-500 border-slate-100'
                  }`}
                >
                  {movement.photo && (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(movement.photo!)}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 hover:scale-105 transition-all cursor-pointer shadow-2xs relative group"
                      title="انقر لتكبير صورة القطعة"
                    >
                      <img src={movement.photo} alt="Piece" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <ImageIcon size={14} className="text-white" />
                      </div>
                    </button>
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">#{movement.id}</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">({movement.itemId})</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate">
                      {item ? item.name : 'صنف غير معروف'}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                      <span>{movement.partner}</span>
                      <span>•</span>
                      <span>{movement.date}</span>
                    </div>
                  </div>

                  {/* Amount indicator + Delete button */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xl font-extrabold font-mono ${
                        isInward ? 'text-emerald-600' : 'text-orange-600'
                      }`}
                    >
                      {isInward ? `+${movement.quantity}` : `-${movement.quantity}`}
                    </span>
                    {isDataLocked ? (
                      <span className="text-amber-500 bg-amber-50/50 border border-amber-100/40 p-2 rounded-xl" title="البيانات مقفلة">
                        <Lock size={14} />
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف الحركة #${movement.id}؟`)) {
                            onDeleteMovement(movement.id);
                          }
                        }}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer"
                        title="حذف الحركة"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Add Movement Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                  <ArrowLeftRight size={20} className="stroke-[2]" />
                </div>
                <h3 className="font-bold text-slate-800">إضافة حركة مخزنية</h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Switcher inside Form */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع الحركة *</label>
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'in' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'in' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    وارد (توريد للمستودع)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'out' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'out' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    صرف (تصدير/سحب)
                  </button>
                </div>
              </div>

              {/* Item selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الصنف *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={formData.itemId}
                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 text-right"
                  >
                    <option value="" disabled>اختر الصنف من القائمة...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                    title="قراءة الرمز الشريطي (الباركود) للكاميرا"
                  >
                    <Camera size={18} className="stroke-[2.5]" />
                    <span className="text-xs font-extrabold hidden sm:inline">مسح باركود</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الكمية *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 font-mono"
                />
              </div>

              {/* Partner (Supplier / Client) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {formData.type === 'in' ? 'المورد (جهة التوريد) *' : 'العميل (جهة الصرف) *'}
                </label>
                
                {formData.type === 'in' ? (
                  <div className="space-y-2">
                    <select
                      value={formData.partner}
                      onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                    >
                      <option value="">اختر مورد مسجل أو اكتب يدوياً...</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.name}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="أو اكتب جهة التوريد يدوياً هنا..."
                      value={formData.partner}
                      onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="اسم العميل أو الجهة المستلمة..."
                    value={formData.partner}
                    onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                  />
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">التاريخ *</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 pr-11 rounded-xl outline-hidden text-slate-700 font-mono"
                  />
                  <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Photo Capture */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">صورة القطعة / توثيق الكاميرا (اختياري)</label>
                <MovementPhotoCapture
                  photo={formData.photo}
                  onChange={(photoBase64) => setFormData({ ...formData, photo: photoBase64 })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>تسجيل الحركة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Barcode Scanner Modal Component */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        onScan={(itemId) => {
          setFormData((prev) => ({ ...prev, itemId }));
        }}
      />

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">صورة القطعة الموثقة</span>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img src={previewPhoto} alt="Piece Full Preview" className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-sm" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
