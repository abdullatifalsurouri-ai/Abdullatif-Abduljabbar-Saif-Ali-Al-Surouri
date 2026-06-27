import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Check, Box } from 'lucide-react';
import { Item } from '../types';

interface ItemsViewProps {
  items: Item[];
  onAddItem: (item: Item) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
}

export default function ItemsView({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: ItemsViewProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    safetyLimit: 10,
    unit: 'حبة',
    price: 0,
  });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    // Generate a default code like PROD-004
    const nextNum = items.length > 0 
      ? Math.max(...items.map((i) => {
          const m = i.id.match(/\d+/);
          return m ? parseInt(m[0], 10) : 0;
        })) + 1
      : 1;
    const nextId = `PROD-${String(nextNum).padStart(3, '0')}`;

    setEditingItem(null);
    setFormData({
      id: nextId,
      name: '',
      safetyLimit: 10,
      unit: 'حبة',
      price: 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      safetyLimit: item.safetyLimit,
      unit: item.unit,
      price: item.price,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.id.trim()) return;

    const savedItem: Item = {
      id: formData.id.trim().toUpperCase(),
      name: formData.name.trim(),
      safetyLimit: Number(formData.safetyLimit),
      unit: formData.unit.trim(),
      price: Number(formData.price),
    };

    if (editingItem) {
      onEditItem(savedItem);
    } else {
      // Check for duplicates
      if (items.some((i) => i.id.toLowerCase() === savedItem.id.toLowerCase())) {
        alert('رمز الصنف موجود بالفعل، يرجى كتابة رمز فريد!');
        return;
      }
      onAddItem(savedItem);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Header with FAB/Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الأصناف</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تعريف وإدارة السلع والمنتجات المخزنة</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full transition-all shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
          title="إضافة صنف جديد"
        >
          <Plus size={22} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="البحث عن اسم أو رمز الصنف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-11 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700 shadow-xs"
        />
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لم يتم العثور على أي أصناف</p>
            <p className="text-xs mt-1">أضف أصنافًا جديدة بالنقر على زر الإضافة</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">{item.name}</h3>
                  <span className="text-xs font-bold text-slate-400 font-mono">({item.id})</span>
                </div>
                
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                    {item.price} ر.س
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                    {item.unit}
                  </span>
                  <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                    حد الأمان: {item.safetyLimit}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t sm:border-none pt-3 sm:pt-0 border-slate-50">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 p-3 rounded-2xl transition-all cursor-pointer"
                  title="تعديل"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف الصنف "${item.name}"؟`)) {
                      onDeleteItem(item.id);
                    }
                  }}
                  className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 p-3 rounded-2xl transition-all cursor-pointer"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                  <Box size={20} className="stroke-[2]" />
                </div>
                <h3 className="font-bold text-slate-800">
                  {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">رمز الصنف (ID) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingItem} // Code cannot be edited once created
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-slate-50 disabled:bg-slate-100/70 border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 font-mono"
                  placeholder="مثال: PROD-001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الصنف *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                  placeholder="مثال: شاحن متنقل بقوة 20 واط"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">السعر (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="مثال: حبة، كرتون"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">حد الأمان (الحد الأدنى للتنبيه)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.safetyLimit}
                  onChange={(e) => setFormData({ ...formData, safetyLimit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">يصدر النظام تحذيراً عند نزول المخزون عن هذه الكمية.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>حفظ الصنف</span>
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

    </div>
  );
}
