import React, { useState } from 'react';
import { TrendingUp, FileText, Calendar, Box, Users, BarChart3, ArrowUpRight, ArrowDownLeft, Printer, Filter } from 'lucide-react';
import { Item, Movement, Supplier, ReportFilterType, Warehouse } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ReportViewProps {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
  warehouses?: Warehouse[];
}

export default function ReportView({ items, movements, suppliers, warehouses = [] }: ReportViewProps) {
  const [activeFilter, setActiveFilter] = useState<ReportFilterType>('monthly');
  const [startDate, setStartDate] = useState('2026-05-26');
  const [endDate, setEndDate] = useState('2026-06-26');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('الكل');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('الكل');
  const [selectedItemFilter, setSelectedItemFilter] = useState('الكل');

  // Categories from items list
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  // Filter movements by selected date range, warehouse, and group/item
  const filteredMovementsByDate = movements.filter((m) => {
    const matchesDate = m.date >= startDate && m.date <= endDate;
    if (!matchesDate) return false;

    const matchesWarehouse = selectedWarehouseId === 'الكل' || m.warehouseId === selectedWarehouseId;
    if (!matchesWarehouse) return false;

    const item = items.find((i) => i.id === m.itemId);
    const matchesGroup = selectedGroupFilter === 'الكل' || (item && item.category === selectedGroupFilter);
    const matchesItem = selectedItemFilter === 'الكل' || m.itemId === selectedItemFilter;

    return matchesGroup && matchesItem;
  });

  // Overall sums
  const totalInward = filteredMovementsByDate
    .filter((m) => m.type === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOutward = filteredMovementsByDate
    .filter((m) => m.type === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  const netBalance = totalInward - totalOutward;

  // Count distinct months in movements
  const monthsSet = new Set(filteredMovementsByDate.map((m) => m.date.substring(0, 7)));
  const totalMonths = monthsSet.size || 1;

  // Grouped items stats
  const itemsReportData = items
    .filter((item) => {
      const matchesGroup = selectedGroupFilter === 'الكل' || item.category === selectedGroupFilter;
      const matchesItem = selectedItemFilter === 'الكل' || item.id === selectedItemFilter;
      return matchesGroup && matchesItem;
    })
    .map((item) => {
      const inward = filteredMovementsByDate
        .filter((m) => m.itemId === item.id && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const outward = filteredMovementsByDate
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
  const partnersSet = new Set(filteredMovementsByDate.map((m) => m.partner));
  const partnersReportData = Array.from(partnersSet).map((partnerName) => {
    const inward = filteredMovementsByDate
      .filter((m) => m.partner === partnerName && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = filteredMovementsByDate
      .filter((m) => m.partner === partnerName && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      name: partnerName,
      inward,
      outward,
      balance: inward - outward,
    };
  });

  // Monthly summary
  const inwardVoucherCount = filteredMovementsByDate.filter((m) => m.type === 'in').length;
  const outwardVoucherCount = filteredMovementsByDate.filter((m) => m.type === 'out').length;

  // Generate last 30 days data for Recharts (Up to June 26, 2026)
  const last30DaysChartData = React.useMemo(() => {
    const data = [];
    const today = new Date('2026-06-26');
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayInward = movements
        .filter((m) => m.date === dateStr && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const dayOutward = movements
        .filter((m) => m.date === dateStr && m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);

      // format day for Arabic display (e.g., "15 يونيو")
      const formattedDate = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

      // Only include dates within the active dataset month to look focused, or all 30 days
      data.push({
        rawDate: dateStr,
        displayDate: formattedDate,
        'الوارد (الكمية)': dayInward,
        'الصرف (الكمية)': dayOutward,
      });
    }
    return data;
  }, [movements]);

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Title & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">التقرير والتحليلات</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تحليل شامل للتدفقات المخزنية والرسوم البيانية التفاعلية لحركات الوارد والصرف</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs self-start sm:self-center shrink-0 hover:scale-105 active:scale-95"
          title="طباعة التقرير والتحليلات الفعال حالياً"
        >
          <Printer size={16} className="stroke-[2.5]" />
          <span>طباعة هذا التقرير</span>
        </button>
      </div>

      {/* Date & Group/Item Filters Panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-2xs space-y-4 print:hidden text-right">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2 text-blue-600 shrink-0">
            <Calendar size={16} className="stroke-[2.5]" />
            <span className="text-xs font-extrabold">تحديد النطاق الزمني للتقرير:</span>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex md:items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-hidden text-slate-700 font-mono focus:border-blue-500 focus:bg-white transition-all w-full"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-hidden text-slate-700 font-mono focus:border-blue-500 focus:bg-white transition-all w-full"
              />
            </div>
          </div>
        </div>

        {/* Group / Item / Warehouse Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Filter by Warehouse */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب المستودع:</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل المستودعات (الكل)</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.id})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Group (Category) */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب مجموعة الأصناف (التصنيف):</label>
            <select
              value={selectedGroupFilter}
              onChange={(e) => {
                setSelectedGroupFilter(e.target.value);
                // Reset item filter since the group changed
                setSelectedItemFilter('الكل');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل المجموعات (الكل)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter by Specific Item */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب صنف محدد:</label>
            <select
              value={selectedItemFilter}
              onChange={(e) => setSelectedItemFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل الأصناف (الكل)</option>
              {items
                .filter(i => selectedGroupFilter === 'الكل' || i.category === selectedGroupFilter)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.id})
                  </option>
                ))
              }
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-3">
          <span>
            الحركات المشمولة بعد التصفية: <strong className="text-blue-600 font-mono text-xs">{filteredMovementsByDate.length}</strong> حركة مقيدة
          </span>
          {(selectedGroupFilter !== 'الكل' || selectedItemFilter !== 'الكل') && (
            <button
              onClick={() => {
                setSelectedGroupFilter('الكل');
                setSelectedItemFilter('الكل');
              }}
              className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-2.5 py-1 rounded-lg transition-all font-black flex items-center gap-1 cursor-pointer"
            >
              <span>إعادة ضبط وتصفير الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block space-y-4 border-b-2 border-slate-800 pb-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1 text-right">
            <h4 className="text-lg font-black text-slate-800">شركة المدى للتقنية والتجارة</h4>
            <p className="text-xs text-slate-500 font-semibold">نظام إدارة المستودعات الذكي</p>
            <p className="text-[10px] text-slate-400 font-mono">الرياض، المملكة العربية السعودية</p>
          </div>
          <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
            <h5 className="text-xs font-black text-blue-900 text-left">تقرير إحصائيات المستودع</h5>
            <p className="text-[10px] text-slate-500 text-left font-semibold">من تاريخ: <span className="font-mono">{startDate}</span></p>
            <p className="text-[10px] text-slate-500 text-left font-semibold">إلى تاريخ: <span className="font-mono">{endDate}</span></p>
          </div>
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
        <h3 className="text-sm font-bold opacity-80 mb-4">ملخص الأداء والمؤشرات</h3>
        
        <div className="grid grid-cols-4 gap-2 text-center relative divide-x divide-white/20 divide-x-reverse">
          {/* Months */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalMonths}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">الأشهر المشمولة</span>
          </div>

          {/* Inward */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalInward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">إجمالي الوارد</span>
          </div>

          {/* Outward */}
          <div className="space-y-1 font-mono">
            <span className="text-2xl sm:text-3xl font-black block">{totalOutward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block font-sans">إجمالي الصرف</span>
          </div>

          {/* Net Balance */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{netBalance}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">صافي الرصيد</span>
          </div>
        </div>
      </div>

      {/* 30-Day Movements Evolution Chart using Recharts */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <BarChart3 size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">مؤشر التدفق اليومي (آخر 30 يوماً)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">تطور كميات التوريد (الوارد) والسحب (الصرف) يوماً بيوم</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              وارد
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
              صرف
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-64 sm:h-72 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={last30DaysChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dy={10}
                tickFormatter={(value, index) => {
                  // Only show label every 4 ticks to prevent clutter
                  return index % 4 === 0 ? value : '';
                }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dx={-5}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-right space-y-1.5 font-bold text-xs">
                        <p className="text-[10px] text-slate-400 font-mono">{data.rawDate}</p>
                        <div className="space-y-1">
                          <p className="flex items-center justify-between gap-4 text-emerald-400">
                            <span>الوارد:</span>
                            <span className="font-mono">{data['الوارد (الكمية)']}</span>
                          </p>
                          <p className="flex items-center justify-between gap-4 text-orange-400">
                            <span>الصرف:</span>
                            <span className="font-mono">{data['الصرف (الكمية)']}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="الوارد (الكمية)" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorIn)" 
              />
              <Area 
                type="monotone" 
                dataKey="الصرف (الكمية)" 
                stroke="#f97316" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorOut)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Tabs (شهري, الأصناف, الموردون) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex w-full">
        <button
          onClick={() => setActiveFilter('monthly')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'monthly'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar size={15} />
          <span>التقرير الشهري</span>
        </button>
        <button
          onClick={() => setActiveFilter('items')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'items'
              ? 'bg-blue-600 text-white shadow-xs'
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
              ? 'bg-blue-600 text-white shadow-xs'
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
                <span className="text-slate-400 text-xs font-bold block">الوارد</span>
                <span className="text-xl font-black text-emerald-600 mt-0.5 block font-mono">{totalInward}</span>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-slate-400 text-xs font-bold block">الصرف</span>
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

            {/* Item Rows */}
            <div className="space-y-3 pt-3 border-t border-slate-50">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">تفاصيل حركات الأصناف في هذا الشهر</h5>
              {itemsReportData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="min-w-0 flex-1 pl-2">
                    <span className="text-slate-800 text-sm font-bold block truncate">{item.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono mt-0.5">{item.code}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-sm">
                    <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                      <ArrowUpRight size={12} />
                      <span>{item.inward}</span>
                    </span>
                    <span className="text-orange-500 font-extrabold flex items-center gap-0.5">
                      <ArrowDownLeft size={12} />
                      <span>{item.outward}</span>
                    </span>
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
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-50 font-mono font-bold">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الوارد</span>
                      <span className="text-emerald-600 block mt-0.5">{item.inward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الصرف</span>
                      <span className="text-orange-500 block mt-0.5">{item.outward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">صافي المخزون</span>
                      <span className={`block mt-0.5 ${item.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
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
                    <div className="flex gap-4 text-xs font-mono font-bold">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">تأمين وارد</span>
                        <span className="text-emerald-600 block mt-0.5 text-center">+{partner.inward}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">سحب صرف</span>
                        <span className="text-orange-500 block mt-0.5 text-center">-{partner.outward}</span>
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
