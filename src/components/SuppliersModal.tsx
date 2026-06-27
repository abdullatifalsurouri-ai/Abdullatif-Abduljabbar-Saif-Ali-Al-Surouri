import React, { useState } from 'react';
import { X, Plus, Phone, Mail, Trash2, Edit2, Check, User, Lock } from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  isDataLocked: boolean;
  onAddSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

export default function SuppliersModal({
  isOpen,
  onClose,
  suppliers,
  isDataLocked,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
}: SuppliersModalProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  if (!isOpen) return null;

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSupplier) {
      onEditSupplier({
        ...editingSupplier,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      });
    } else {
      onAddSupplier({
        id: `SUP-${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      });
    }

    setFormData({ name: '', phone: '', email: '' });
    setEditingSupplier(null);
    setIsFormOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
    });
    setIsFormOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
              <User size={22} className="stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">إدارة الموردين</h3>
              <p className="text-xs text-slate-500">عرض وإدارة شركاء التوريد والمحلات التجارية</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Add Bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="البحث عن مورد بـ الاسم، الهاتف، أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-xl outline-hidden transition-all text-slate-700"
          />
          {!isFormOpen && !isDataLocked && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setFormData({ name: '', phone: '', email: '' });
                setIsFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={18} />
              <span>مورد جديد</span>
            </button>
          )}
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {isDataLocked && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-3xl flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                <Lock size={16} className="stroke-[2.5]" />
              </div>
              <div className="text-xs font-bold leading-relaxed text-right">
                وضع القراءة فقط نشط: تم قفل البيانات في الإعدادات لمنع إضافة الموردين أو تعديلهم أو حذفهم.
              </div>
            </div>
          )}
          
          {/* Form inside Modal */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-slide-down">
              <h4 className="font-bold text-slate-700 text-sm">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم المورد *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="مثال: شركة المدى"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="info@supplier.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingSupplier ? 'تحديث المورد' : 'حفظ المورد'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Suppliers List */}
          <div className="space-y-2.5">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm font-medium">لم يتم العثور على أي موردين</p>
                <p className="text-xs mt-1">تأكد من كتابة الاسم بشكل صحيح أو أضف موردًا جديدًا</p>
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id}
                  className="border border-slate-100 hover:border-slate-200 bg-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {supplier.name}
                    </h5>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      {supplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={13} className="text-slate-400" />
                          <span dir="ltr">{supplier.phone}</span>
                        </span>
                      )}
                      {supplier.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={13} className="text-slate-400" />
                          <span>{supplier.email}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100">
                    {isDataLocked ? (
                      <span className="text-amber-600 bg-amber-50 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-amber-100/50">
                        <Lock size={12} className="stroke-[2.5]" />
                        <span>عرض فقط</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-xl transition-all cursor-pointer"
                          title="تعديل المورد"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
                              onDeleteSupplier(supplier.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer"
                          title="حذف المورد"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي الموردين المسجلين: <strong className="text-slate-700 font-bold">{suppliers.length}</strong></span>
          <span>نظام إدارة المستودعات V3</span>
        </div>

      </div>
    </div>
  );
}
