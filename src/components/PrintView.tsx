import React, { useState } from 'react';
import { Search, Printer, FileText, ArrowDownLeft, ArrowUpRight, Check, X, Calendar, User } from 'lucide-react';
import { Item, Movement } from '../types';

interface PrintViewProps {
  movements: Movement[];
  items: Item[];
}

export default function PrintView({ movements, items }: PrintViewProps) {
  const [voucherType, setVoucherType] = useState<'in' | 'out'>('in');
  const [voucherNumberInput, setVoucherNumberInput] = useState('');
  const [queriedVoucher, setQueriedVoucher] = useState<Movement | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Get recent vouchers for the selected type
  const recentVouchers = movements
    .filter((m) => m.type === voucherType)
    .sort((a, b) => b.id - a.id)
    .slice(0, 3); // Get top 3 latest as seen in the screenshots

  const handleQuery = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setQueriedVoucher(null);

    const num = parseInt(voucherNumberInput.trim(), 10);
    if (isNaN(num)) {
      setErrorMessage('يرجى إدخال رقم سند صحيح (رقم فقط)');
      return;
    }

    const found = movements.find((m) => m.id === num && m.type === voucherType);
    if (found) {
      setQueriedVoucher(found);
    } else {
      setErrorMessage(`عذراً، لم يتم العثور على ${voucherType === 'in' ? 'سند وارد' : 'سند صرف'} بالرقم ${num}`);
    }
  };

  const handleSelectVoucher = (m: Movement) => {
    setQueriedVoucher(m);
    setVoucherNumberInput(String(m.id));
    setErrorMessage('');
  };

  const handlePrint = () => {
    window.print();
  };

  // Details of the active item in the queried voucher
  const activeItem = queriedVoucher ? items.find((i) => i.id === queriedVoucher.itemId) : null;
  const totalValue = (activeItem?.price || 0) * (queriedVoucher?.quantity || 0);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">طباعة السندات</h2>
        <p className="text-slate-500 font-medium text-sm mt-0.5 font-sans">طباعة واستعلام السندات الرسمية للوارد والصرف والمطابقة</p>
      </div>

      {/* Query Card matching Screenshot 1 */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-5">
        
        {/* Voucher Type selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">نوع السند</label>
          <div className="bg-slate-100 p-1 rounded-2xl flex w-full">
            <button
              onClick={() => {
                setVoucherType('in');
                setQueriedVoucher(null);
                setVoucherNumberInput('');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                voucherType === 'in'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownLeft size={16} />
              <span>سند وارد</span>
            </button>
            <button
              onClick={() => {
                setVoucherType('out');
                setQueriedVoucher(null);
                setVoucherNumberInput('');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                voucherType === 'out'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpRight size={16} />
              <span>سند صرف</span>
            </button>
          </div>
        </div>

        {/* Voucher Number input */}
        <form onSubmit={handleQuery} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">رقم السند</label>
            <input
              type="text"
              placeholder="مثال: 1001"
              value={voucherNumberInput}
              onChange={(e) => setVoucherNumberInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search size={18} className="stroke-[2.5]" />
            <span>استعلام</span>
          </button>
        </form>

        {errorMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold p-3.5 rounded-xl text-center">
            {errorMessage}
          </div>
        )}

      </div>

      {/* Queried Voucher Result display (Official receipt representation) */}
      {queriedVoucher && activeItem && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md animate-slide-down print:p-0 print:border-none print:shadow-none">
          
          {/* Action button bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
            <span className="text-xs font-black text-slate-400">معاينة السند الرسمي للطباعة</span>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>طباعة السند</span>
              </button>
              <button
                onClick={() => {
                  setQueriedVoucher(null);
                  setVoucherNumberInput('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          {/* PRINTABLE DOCUMENT START */}
          <div id="voucher-document" className="space-y-6 font-sans">
            
            {/* Document Header */}
            <div className="flex justify-between items-start gap-4 border-b-2 border-slate-800 pb-5">
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-800">شركة المدى للتقنية والتجارة</h4>
                <p className="text-xs text-slate-500 font-semibold">قسم إدارة المخازن والمستودعات</p>
                <p className="text-[10px] text-slate-400">هاتف: 920012345 | الرياض، المملكة العربية السعودية</p>
              </div>
              <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
                <h5 className="text-xs font-black text-blue-900">
                  {voucherType === 'in' ? 'سند استلام وارد' : 'سند صرف صادر'}
                </h5>
                <p className="text-[11px] font-bold text-slate-700 font-mono">الرقم: #{queriedVoucher.id}</p>
                <p className="text-[10px] text-slate-400 font-mono">التاريخ: {queriedVoucher.date}</p>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              <div className="flex items-center gap-2">
                <User size={15} className="text-slate-400" />
                <span className="font-bold text-slate-500">
                  {voucherType === 'in' ? 'المورّد:' : 'العميل/المستلم:'}
                </span>
                <span className="font-extrabold text-slate-800">{queriedVoucher.partner}</span>
              </div>
              <div className="flex items-center gap-2 sm:border-r sm:border-slate-200 sm:pr-4">
                <Calendar size={15} className="text-slate-400" />
                <span className="font-bold text-slate-500">تاريخ القيد المالي:</span>
                <span className="font-extrabold text-slate-800 font-mono">{queriedVoucher.date}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700">
                    <th className="p-3">رمز الصنف</th>
                    <th className="p-3">اسم السلعة / البيان</th>
                    <th className="p-3 text-center">الوحدة</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3 text-left">سعر الوحدة</th>
                    <th className="p-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-700 font-medium">
                    <td className="p-3 font-mono">{queriedVoucher.itemId}</td>
                    <td className="p-3 font-bold">{activeItem.name}</td>
                    <td className="p-3 text-center">{activeItem.unit}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">{queriedVoucher.quantity}</td>
                    <td className="p-3 text-left font-mono">{activeItem.price.toFixed(2)} ر.س</td>
                    <td className="p-3 text-left font-mono font-black text-slate-800">{totalValue.toFixed(2)} ر.س</td>
                  </tr>
                  
                  {/* Total summary row */}
                  <tr className="bg-slate-50 border-t border-slate-200 font-black text-slate-800">
                    <td colSpan={4} className="p-3 text-left">المجموع الصافي الخاضع للضريبة:</td>
                    <td colSpan={2} className="p-3 text-left font-mono text-base text-blue-900">
                      {totalValue.toFixed(2)} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signature Lines */}
            <div className="grid grid-cols-2 gap-6 pt-10 text-center text-xs">
              <div className="space-y-8">
                <p className="font-bold text-slate-500">أمين المستودع (المستلم والمطابق):</p>
                <div className="w-2/3 mx-auto border-b border-slate-400"></div>
                <p className="text-[10px] text-slate-400">التوقيع والتاريخ</p>
              </div>
              <div className="space-y-8">
                <p className="font-bold text-slate-500">
                  {voucherType === 'in' ? 'توقيع مندوب المورّد:' : 'توقيع المستلم (العميل):'}
                </p>
                <div className="w-2/3 mx-auto border-b border-slate-400"></div>
                <p className="text-[10px] text-slate-400">التوقيع والتاريخ</p>
              </div>
            </div>

          </div>
          {/* PRINTABLE DOCUMENT END */}

        </div>
      )}

      {/* Recent Vouchers List matching Screenshot 1 */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-800">
          {voucherType === 'in' ? 'آخر سندات الوارد' : 'آخر سندات الصرف'}
        </h3>
        
        <div className="space-y-2.5">
          {recentVouchers.map((v) => {
            const item = items.find((i) => i.id === v.itemId);
            return (
              <button
                key={v.id}
                onClick={() => handleSelectVoucher(v)}
                className="w-full bg-white border border-slate-100 hover:border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all text-right cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-blue-900 font-mono group-hover:underline">#{v.id}</span>
                    <span className="text-xs font-bold text-slate-700">{item ? item.name : 'صنف غير معروف'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">جهة التعامل: {v.partner}</p>
                </div>

                <div className="text-left">
                  <span className="text-xs text-slate-400 block font-mono">{v.date}</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full inline-block mt-1 group-hover:bg-blue-100 transition-colors">
                    معاينة السند &larr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
