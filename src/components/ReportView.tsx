import { useState } from 'react';
import { TrendingUp, FileText, Calendar, Box, Users } from 'lucide-react';
import { Item, Movement, Supplier, ReportFilterType } from '../types';

interface ReportViewProps {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
}

export default function ReportView({ items, movements, suppliers }: ReportViewProps) {
  const [activeFilter, setActiveFilter] = useState<ReportFilterType>('monthly');

  // Overall sums
  const totalInward = movements
    .filter((m) => m.type === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOutward = movements
    .filter((m) => m.type === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  const netBalance = totalInward - totalOutward;

  // Count distinct months in movements
  const monthsSet = new Set(movements.map((m) => m.date.substring(0, 7)));
  const totalMonths = monthsSet.size || 1;

  // Grouped items stats
  const itemsReportData = items.map((item) => {
    const inward = movements
      .filter((m) => m.itemId === item.id && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = movements
      .filter((m) => m.itemId === item.id && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      name: item.name,
      code: item.id,
      inward,
      outward,
      balance: inward - outward,
    };
  });

  // Grouped suppliers/partners stats
  const partnersSet = new Set(movements.map((m) => m.partner));
  const partnersReportData = Array.from(partnersSet).map((partnerName) => {
    const inward = movements
      .filter((m) => m.partner === partnerName && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = movements
      .filter((m) => m.partner === partnerName && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      name: partnerName,
      inward,
      outward,
      balance: inward - outward,
    };
  });

  // Monthly summary (using June 2026 as default based on screenshot)
  const inwardVoucherCount = movements.filter((m) => m.type === 'in').length;
  const outwardVoucherCount = movements.filter((m) => m.type === 'out').length;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">التقرير الشهري</h2>
        <p className="text-slate-500 font-medium text-sm mt-0.5">تحليل شامل ومفصل للوارد والصرف والتدفقات المخزنية</p>
      </div>

      {/* Stats Summary Banner (Screenshot 2 Top Section) */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-500 text-white rounded-3xl p-6 shadow-md">
        <h3 className="text-sm font-bold opacity-80 mb-4">ملخص الأداء والمؤشرات</h3>
        
        <div className="grid grid-cols-4 gap-2 text-center relative divide-x divide-white/20 divide-x-reverse">
          {/* Months */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalMonths}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">الأشهر</span>
          </div>

          {/* Inward */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalInward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">إجمالي الوارد</span>
          </div>

          {/* Outward */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalOutward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">إجمالي الصرف</span>
          </div>

          {/* Net Balance */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{netBalance}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">صافي الرصيد</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs (شهري, الأصناف, الموردون) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex w-full">
        <button
          onClick={() => setActiveFilter('monthly')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'monthly'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar size={15} />
          <span>شهري</span>
        </button>
        <button
          onClick={() => setActiveFilter('items')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'items'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Box size={15} />
          <span>الأصناف</span>
        </button>
        <button
          onClick={() => setActiveFilter('suppliers')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'suppliers'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={15} />
          <span>الموردون والعملاء</span>
        </button>
      </div>

      {/* Report Details Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-6">
        
        {/* Report Block - MONTHLY */}
        {activeFilter === 'monthly' && (
          <div className="space-y-5">
            {/* June 2026 Header Block */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">يونيو 2026</h4>
                <p className="text-xs text-slate-400 mt-0.5">الحركات المقيدة في هذا الشهر</p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <TrendingUp size={14} className="stroke-[2.5]" />
                <span>+{netBalance} ↗</span>
              </div>
            </div>

            {/* Sum stats row */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-center">
              <div>
                <span className="text-slate-400 text-xs font-bold block">وارد</span>
                <span className="text-xl font-black text-emerald-600 mt-0.5 block font-mono">{totalInward}</span>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-slate-400 text-xs font-bold block">صرف</span>
                <span className="text-xl font-black text-orange-600 mt-0.5 block font-mono">{totalOutward}</span>
              </div>
            </div>

            {/* Badges count line */}
            <div className="flex flex-wrap gap-2 justify-center py-1">
              <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <FileText size={13} />
                <span>{inwardVoucherCount} سند وارد</span>
              </span>
              <span className="bg-orange-50 text-orange-600 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <FileText size={13} />
                <span>{outwardVoucherCount} سند صرف</span>
              </span>
            </div>

            {/* Item Rows - exactly like in Screenshot 2 */}
            <div className="space-y-3 pt-3 border-t border-slate-50">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">تفاصيل حركات الأصناف في هذا الشهر</h5>
              {itemsReportData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="min-w-0 flex-1 pl-2">
                    <span className="text-slate-800 text-sm font-bold block truncate">{item.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono mt-0.5">{item.code}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-sm">
                    <span className="text-emerald-600 font-extrabold">+{item.inward}</span>
                    <span className="text-orange-500 font-extrabold">-{item.outward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Block - ITEMS */}
        {activeFilter === 'items' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-base">تحليل الأصناف التراكمي</h4>
            <div className="space-y-3">
              {itemsReportData.map((item, idx) => (
                <div key={idx} className="border border-slate-100 p-4 rounded-2xl space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 text-sm">{item.name}</h5>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{item.code}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-50 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الوارد</span>
                      <span className="text-emerald-600 font-bold block mt-0.5">{item.inward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الصرف</span>
                      <span className="text-orange-500 font-bold block mt-0.5">{item.outward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">صافي المخزون</span>
                      <span className={`font-bold block mt-0.5 ${item.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {item.balance}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Block - SUPPLIERS */}
        {activeFilter === 'suppliers' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-base">تحليل حركات الشركاء التجاريين</h4>
            <div className="space-y-3">
              {partnersReportData.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">لا توجد حركات لشركاء حاليين</p>
              ) : (
                partnersReportData.map((partner, idx) => (
                  <div key={idx} className="border border-slate-100 p-4 rounded-2xl flex items-center justify-between bg-white">
                    <div className="min-w-0 flex-1 pl-3">
                      <span className="font-bold text-slate-800 text-sm block truncate">{partner.name}</span>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">تأمين وارد</span>
                        <span className="text-emerald-600 font-bold block mt-0.5 text-center">+{partner.inward}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">سحب صرف</span>
                        <span className="text-orange-500 font-bold block mt-0.5 text-center">-{partner.outward}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
