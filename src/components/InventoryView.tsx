import { AlertCircle, CheckCircle } from 'lucide-react';
import { Item, Movement } from '../types';

interface InventoryViewProps {
  items: Item[];
  movements: Movement[];
}

export default function InventoryView({ items, movements }: InventoryViewProps) {
  // Compute stocks and metrics for each item
  const itemStockStats = items.map((item) => {
    const inward = movements
      .filter((m) => m.itemId === item.id && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = movements
      .filter((m) => m.itemId === item.id && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    const balance = inward - outward;
    const isUnderSafetyLimit = balance < item.safetyLimit;

    return {
      ...item,
      inward,
      outward,
      balance,
      isUnderSafetyLimit,
    };
  });

  // Count items under safety limit and safe ones
  const urgentCount = itemStockStats.filter((i) => i.isUnderSafetyLimit).length;
  const safeCount = itemStockStats.filter((i) => !i.isUnderSafetyLimit).length;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">الجرد التلقائي</h2>
        <p className="text-slate-500 font-medium text-sm mt-0.5">تحليل حي وبث مباشر لحالة المخزون الحالي ومقارنته بحد الأمان</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Urgent Shortages Card */}
        <div className="bg-rose-50 border border-rose-100/80 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
          <div className="text-rose-500 mb-1">
            <AlertCircle size={28} className="stroke-[2.5]" />
          </div>
          <span className="text-3xl font-black text-rose-600 font-mono">{urgentCount}</span>
          <span className="text-xs font-bold text-rose-500 mt-1">نواقص عاجلة</span>
        </div>

        {/* Safe Items Card */}
        <div className="bg-emerald-50 border border-emerald-100/80 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
          <div className="text-emerald-500 mb-1">
            <CheckCircle size={28} className="stroke-[2.5]" />
          </div>
          <span className="text-3xl font-black text-emerald-600 font-mono">{safeCount}</span>
          <span className="text-xs font-bold text-emerald-500 mt-1">أصناف آمنة</span>
        </div>

      </div>

      {/* Item Stock Detail List */}
      <div className="space-y-4">
        {itemStockStats.map((item) => (
          <div
            key={item.id}
            className={`bg-white border rounded-3xl p-5 hover:shadow-md transition-all relative overflow-hidden ${
              item.isUnderSafetyLimit 
                ? 'border-r-4 border-r-rose-500 border-slate-100' 
                : 'border-r-4 border-r-emerald-500 border-slate-100'
            }`}
          >
            {/* Header: Code and Status Badge */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {item.id}
              </span>
              
              {item.isUnderSafetyLimit ? (
                <span className="bg-rose-50 text-rose-600 text-[10px] font-extrabold px-3 py-1 rounded-full border border-rose-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  مطلوب توريد عاجل
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  آمن
                </span>
              )}
            </div>

            {/* Item Name */}
            <h3 className="font-bold text-slate-800 text-base mb-5 pr-1">
              {item.name}
            </h3>

            {/* Grid of values (4 columns with separators) */}
            <div className="grid grid-cols-4 gap-2 border-t border-slate-50 pt-4 text-center">
              
              {/* الرصيد */}
              <div className="space-y-1">
                <span className={`text-xl sm:text-2xl font-black block font-mono ${
                  item.isUnderSafetyLimit ? 'text-rose-600' : 'text-slate-800'
                }`}>
                  {item.balance}
                </span>
                <span className="text-[11px] font-bold text-slate-400 block">الرصيد</span>
              </div>

              {/* Line separator */}
              <div className="border-r border-slate-100 space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-800 block font-mono">
                  {item.inward}
                </span>
                <span className="text-[11px] font-bold text-slate-400 block">الوارد</span>
              </div>

              {/* Line separator */}
              <div className="border-r border-slate-100 space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-800 block font-mono">
                  {item.outward}
                </span>
                <span className="text-[11px] font-bold text-slate-400 block">الصرف</span>
              </div>

              {/* Line separator */}
              <div className="border-r border-slate-100 space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-800 block font-mono">
                  {item.safetyLimit}
                </span>
                <span className="text-[11px] font-bold text-slate-400 block">حد الأمان</span>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
