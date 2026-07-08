import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Bell, Info, Search, Camera, Warehouse as WarehouseIcon, Download, Inbox, FileText, Zap } from 'lucide-react';
import { Item, Movement, Warehouse, InvoiceSettings, User } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';
import QuickStocktakeModal from './QuickStocktakeModal';
import { exportToPDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';

interface InventoryViewProps {
  items: Item[];
  movements: Movement[];
  warehouses?: Warehouse[];
  invoiceSettings?: InvoiceSettings;
  currentUser?: User;
  onAddMovement?: (movement: Movement) => void;
  isDataLocked?: boolean;
}

export default function InventoryView({ items, movements, warehouses = [], invoiceSettings, currentUser, onAddMovement, isDataLocked = false }: InventoryViewProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQuickStocktakeOpen, setIsQuickStocktakeOpen] = useState(false);
  const [showStagnantOnly, setShowStagnantOnly] = useState(false);

  // Filter movements by selected warehouse
  const filteredMovements = selectedWarehouseId === 'all'
    ? movements
    : movements.filter((m) => m.warehouseId === selectedWarehouseId);

  // Compute stocks and metrics for each item
  const itemStockStats = items.map((item) => {
    const inward = filteredMovements
      .filter((m) => m.itemId === item.id && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = filteredMovements
      .filter((m) => m.itemId === item.id && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    const balance = inward - outward;
    
    // Safety levels
    const isAtOrBelowLimit = balance <= item.safetyLimit;
    const isBelowLimit = balance < item.safetyLimit;
    const isExactlyAtLimit = balance === item.safetyLimit;

    return {
      ...item,
      inward,
      outward,
      balance,
      isAtOrBelowLimit,
      isBelowLimit,
      isExactlyAtLimit,
    };
  });

  // Calculate Stagnant Items (لم تشهد أي حركة صرف خلال 90 يوماً ورصيدها أكبر من صفر)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

  const stagnantItems = items.map((item) => {
    const itemMovements = movements.filter((m) => m.itemId === item.id);
    const balance = itemMovements.reduce((sum, m) => sum + (m.type === 'in' ? m.quantity : -m.quantity), 0);
    
    const outMovements = itemMovements.filter((m) => m.type === 'out');
    const lastOutMovement = outMovements.length > 0 
      ? outMovements.reduce((latest, m) => m.date > latest.date ? m : latest, outMovements[0])
      : null;
      
    const hasOutMovementIn90Days = outMovements.some((m) => m.date >= ninetyDaysAgoStr);
    
    return {
      ...item,
      balance,
      lastOutDate: lastOutMovement ? lastOutMovement.date : null,
      isStagnant: !hasOutMovementIn90Days && balance > 0
    };
  }).filter(item => item.isStagnant);

  const handleExportStagnant = () => {
    if (stagnantItems.length === 0) return;
    const headers = ['رمز الصنف', 'اسم الصنف', 'الفئة', 'الرصيد الحالي', 'سعر الوحدة (ر.س)', 'القيمة الإجمالية (ر.س)', 'تاريخ آخر حركة صرف'];
    const rows = stagnantItems.map(item => [
      item.id,
      item.name,
      item.category || 'غير محدد',
      item.balance,
      item.price,
      item.balance * item.price,
      item.lastOutDate || 'لا توجد حركة صرف'
    ]);
    
    const csvRows = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `الأصناف_الراكدة_خلال_90_يوم_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: General Inventory Stock take
    const stockHeaders = [
      'رمز الصنف', 
      'اسم الصنف', 
      'التصنيف', 
      'الرصيد الحالي', 
      'الوارد', 
      'الصرف', 
      'حد الأمان', 
      'سعر الوحدة (ر.س)', 
      'القيمة الإجمالية (ر.س)', 
      'الحالة'
    ];
    const stockRows = filteredItemStats.map((item) => {
      const status = item.isBelowLimit 
        ? 'نقص حرج' 
        : item.isExactlyAtLimit 
        ? 'حد الطلب' 
        : 'آمن ومتوفر';
      return [
        item.id,
        item.name,
        item.category || 'غير محدد',
        item.balance,
        item.inward,
        item.outward,
        item.safetyLimit,
        item.price,
        item.balance * item.price,
        status
      ];
    });

    const stockDataArray = [stockHeaders, ...stockRows];
    const wsStock = XLSX.utils.aoa_to_sheet(stockDataArray);
    XLSX.utils.book_append_sheet(wb, wsStock, "الجرد المخزني العام");

    // Sheet 2: Stagnant Items (الأصناف الراكدة)
    if (stagnantItems.length > 0) {
      const stagnantHeaders = [
        'رمز الصنف', 
        'اسم الصنف', 
        'التصنيف', 
        'الرصيد الحالي', 
        'سعر الوحدة (ر.س)', 
        'القيمة الإجمالية (ر.س)', 
        'تاريخ آخر حركة صرف'
      ];
      const stagnantRows = stagnantItems.map(item => [
        item.id,
        item.name,
        item.category || 'غير محدد',
        item.balance,
        item.price,
        item.balance * item.price,
        item.lastOutDate || 'لا توجد حركة صرف'
      ]);

      const stagnantDataArray = [stagnantHeaders, ...stagnantRows];
      const wsStagnant = XLSX.utils.aoa_to_sheet(stagnantDataArray);
      XLSX.utils.book_append_sheet(wb, wsStagnant, "الأصناف الراكدة");
    }

    // Save workbook
    const filename = `الجرد_المخزني_الشامل_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Filter items based on user search/barcode scanner input
  const filteredItemStats = itemStockStats.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
    const matchesStagnant = !showStagnantOnly || stagnantItems.some(st => st.id === item.id);
    return matchesSearch && matchesStagnant;
  });

  // Count items by urgency status
  const alertItems = itemStockStats.filter((i) => i.isAtOrBelowLimit);
  const urgentCount = itemStockStats.filter((i) => i.isBelowLimit).length;
  const reachedLimitCount = itemStockStats.filter((i) => i.isExactlyAtLimit).length;
  const safeCount = itemStockStats.filter((i) => !i.isAtOrBelowLimit).length;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Offscreen Printable Report for PDF Export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="inventory-pdf-report-container" className="bg-white p-8 w-[800px] text-right text-slate-800" dir="rtl">
          {/* Report Header */}
          <div className="flex justify-between items-start gap-4 border-b-2 border-slate-800 pb-5 mb-6">
            <div className="flex items-start gap-3.5">
              {invoiceSettings?.logo && (
                <img src={invoiceSettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg shrink-0" referrerPolicy="no-referrer" />
              )}
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">{invoiceSettings?.name || 'شركة المدى للتقنية والتجارة'}</h4>
                <p className="text-[10px] text-slate-500 font-extrabold">تقرير جرد المستودع التلقائي</p>
                <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{invoiceSettings?.address || 'الرياض، المملكة العربية السعودية'}</p>
                <p className="text-[9px] text-slate-400 font-mono">الهاتف: {invoiceSettings?.phone || '+967775104368'} {invoiceSettings?.email && ` | البريد: ${invoiceSettings.email}`}</p>
              </div>
            </div>
            <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
              <h5 className="text-xs font-black text-blue-900 text-left">تقرير الجرد المخزني الحالي</h5>
              <p className="text-[10px] text-slate-400 text-left font-semibold">تاريخ الجرد:</p>
              <p className="text-[10px] text-slate-700 text-left font-bold font-mono">{new Date().toLocaleDateString('ar-SA')} - {new Date().toLocaleTimeString('ar-SA')}</p>
              {currentUser && (
                <p className="text-[9px] text-slate-500 font-bold text-left mt-1 border-t border-slate-100 pt-0.5">بواسطة: {currentUser.username}</p>
              )}
            </div>
          </div>

          {/* Summary Widgets */}
          <div className="grid grid-cols-3 gap-3 text-center border border-slate-200 p-4 rounded-2xl bg-slate-50/50 text-xs mb-6">
            <div>
              <span className="text-slate-400 font-semibold">إجمالي عدد الأصناف:</span>
              <strong className="text-slate-800 font-mono text-sm block mt-0.5">{filteredItemStats.length} أصناف</strong>
            </div>
            <div className="border-r border-slate-200">
              <span className="text-slate-400 font-semibold">أصناف تحت حد الأمان:</span>
              <strong className="text-rose-600 font-mono text-sm block mt-0.5">{filteredItemStats.filter(i => i.isBelowLimit).length} أصناف تنبيه</strong>
            </div>
            <div className="border-r border-slate-200">
              <span className="text-slate-400 font-semibold">المستودع المشمول:</span>
              <strong className="text-blue-900 text-sm block mt-0.5">
                {selectedWarehouseId === 'all' ? 'كافة المستودعات (عام)' : warehouses.find(w => w.id === selectedWarehouseId)?.name || selectedWarehouseId}
              </strong>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700">
                  <th className="p-3">رمز الصنف</th>
                  <th className="p-3">اسم الصنف</th>
                  <th className="p-3 text-center">الرصيد المتاح</th>
                  <th className="p-3 text-center">الوارد</th>
                  <th className="p-3 text-center">الصرف</th>
                  <th className="p-3 text-center">حد الأمان</th>
                  <th className="p-3 text-left">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredItemStats.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                    <td className="p-3 font-mono">{item.id}</td>
                    <td className="p-3 font-bold">{item.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">{item.balance}</td>
                    <td className="p-3 text-center font-mono">{item.inward}</td>
                    <td className="p-3 text-center font-mono">{item.outward}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{item.safetyLimit}</td>
                    <td className="p-3 text-left font-bold">
                      {item.isBelowLimit ? (
                        <span className="text-rose-600">نقص حرج</span>
                      ) : item.isExactlyAtLimit ? (
                        <span className="text-amber-600">حد الطلب</span>
                      ) : (
                        <span className="text-emerald-600">آمن ومتوفر</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          {invoiceSettings?.footerNote && (
            <div className="border-t border-dashed border-slate-200 pt-4 text-center mt-8">
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{invoiceSettings.footerNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الجرد التلقائي للمستودع</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">مراقبة حية لكميات المخزون وتحديد النواقص وإصدار تنبيهات إعادة الطلب</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Quick Inventory Button */}
          {onAddMovement && !isDataLocked && (
            <button
              type="button"
              onClick={() => setIsQuickStocktakeOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              title="بدء عملية جرد سريع متتالية ومباشرة"
            >
              <Zap size={14} className="text-white fill-white" />
              <span>الجرد السريع ⚡</span>
            </button>
          )}

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExcelExport}
            className="bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            title="تصدير تفاصيل الجرد الحالي والأصناف الراكدة إلى ملف Excel"
          >
            <Download size={14} className="text-white" />
            <span>تصدير الجرد (Excel)</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => exportToPDF('inventory-pdf-report-container', `تقرير_الجرد_المستودع_${new Date().toISOString().split('T')[0]}.pdf`)}
            className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105"
          >
            <FileText size={14} className="text-white" />
            <span>تصدير الجرد (PDF)</span>
          </button>

          {/* Warehouse Filter Selector */}
          {warehouses.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-2xs min-w-[180px]">
              <WarehouseIcon size={16} className="text-blue-600 stroke-[2.5] mr-1 shrink-0" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full text-xs font-black text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="all">كافة المستودعات (عام)</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* Urgent Shortages Card */}
        <div className="bg-rose-50 border border-rose-100/80 rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <div className="text-rose-500 mb-1">
            <AlertCircle size={24} className="stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black text-rose-600 font-mono">{urgentCount}</span>
          <span className="text-[10px] sm:text-xs font-bold text-rose-500 mt-1">نواقص (تحت الحد)</span>
        </div>

        {/* Reached Reorder Limit Card */}
        <div className="bg-amber-50 border border-amber-100/80 rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <div className="text-amber-500 mb-1">
            <AlertTriangle size={24} className="stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black text-amber-600 font-mono">{reachedLimitCount}</span>
          <span className="text-[10px] sm:text-xs font-bold text-amber-600 mt-1">وصلت لحد الطلب</span>
        </div>

        {/* Safe Items Card */}
        <div className="bg-emerald-50 border border-emerald-100/80 rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <div className="text-emerald-500 mb-1">
            <CheckCircle size={24} className="stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black text-emerald-600 font-mono">{safeCount}</span>
          <span className="text-[10px] sm:text-xs font-bold text-emerald-500 mt-1">أصناف آمنة</span>
        </div>

      </div>

      {/* Visual Reorder Alerts Panel */}
      {alertItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/60 rounded-3xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 text-amber-600 p-2 rounded-xl animate-bounce">
              <Bell size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-amber-900">نظام التنبيهات وإعادة التوريد الذكي</h4>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">يرجى مراجعة الأصناف أدناه لإعداد فواتير التوريد ومنع انقطاع المخزون.</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {alertItems.map((item) => {
              const diff = item.safetyLimit - item.balance;
              return (
                <div 
                  key={`alert-${item.id}`} 
                  className="bg-white/80 hover:bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <div>
                      <span className="text-xs font-black text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">الرمز: {item.id}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    {item.isExactlyAtLimit ? (
                      <span className="text-[10px] bg-amber-100/50 border border-amber-200/60 text-amber-700 px-2.5 py-1 rounded-lg font-bold">
                        مساوٍ تماماً لحد الطلب ({item.balance})
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-100/50 border border-rose-200/60 text-rose-700 px-2.5 py-1 rounded-lg font-bold">
                        بحاجة لـ {diff} {item.unit} للوصول للأمان
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stagnant Items Alerts Panel (الأصناف الراكدة) */}
      {stagnantItems.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-100 text-slate-600 p-2.5 rounded-2xl">
                <Inbox size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">الأصناف الراكدة والمخزون الخامل 📦</h4>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">تم اكتشاف {stagnantItems.length} صنف لم تشهد أي حركة صرف (صادر) خلال الـ 90 يوماً الماضية.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowStagnantOnly(!showStagnantOnly)}
                className={`text-xs font-black px-4 py-2 rounded-xl transition-all border cursor-pointer ${
                  showStagnantOnly 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showStagnantOnly ? 'عرض كل الأصناف' : 'تصفية الأصناف الراكدة فقط'}
              </button>
              
              <button
                onClick={handleExportStagnant}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download size={14} className="text-blue-500" />
                <span>تصدير القائمة (CSV)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {stagnantItems.slice(0, 4).map((item) => (
              <div 
                key={`stagnant-${item.id}`} 
                className="bg-white border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-black text-slate-800 block">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    الرصيد الخامل: <strong className="text-slate-600">{item.balance} {item.unit}</strong> | آخر صرف: <span className="font-mono text-slate-500">{item.lastOutDate || 'لا توجد حركة صرف'}</span>
                  </span>
                </div>
                <div className="text-left font-mono text-xs font-bold text-slate-500">
                  {(item.balance * item.price).toLocaleString()} ر.س
                </div>
              </div>
            ))}
            {stagnantItems.length > 4 && (
              <div className="col-span-1 md:col-span-2 text-center">
                <button 
                  onClick={() => setShowStagnantOnly(true)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  و {stagnantItems.length - 4} أصناف أخرى... اضغط هنا لتصفيتها وعرضها كاملة
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Scan Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-2xs">
        <div className="flex gap-2">
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="البحث الفوري بالاسم أو الباركود للجرد السريع... 🔍"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-11 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700 text-right font-bold placeholder:text-slate-400"
              />
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 shrink-0"
              title="مسح باركود الصنف للجرد السريع بالكاميرا"
            >
              <Camera size={16} className="stroke-[2.5]" />
              <span className="text-xs font-black hidden sm:inline">مسح باركود للجرد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Item Stock Detail List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 tracking-wide pr-1">تفاصيل المخزون وحالة السلامة</h3>
        
        {filteredItemStats.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لا توجد أصناف مطابقة للبحث الحالي</p>
          </div>
        ) : (
          filteredItemStats.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-3xl p-5 hover:shadow-md transition-all relative overflow-hidden ${
                item.isBelowLimit 
                  ? 'border-r-4 border-r-rose-500 border-slate-100' 
                  : item.isExactlyAtLimit
                  ? 'border-r-4 border-r-amber-500 border-slate-100'
                  : 'border-r-4 border-r-emerald-500 border-slate-100'
              }`}
            >
              {/* Header: Code and Status Badge */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {item.id}
                </span>
                
                {item.isBelowLimit ? (
                  <span className="bg-rose-50 text-rose-600 text-[10px] font-extrabold px-3 py-1 rounded-full border border-rose-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    نقص حرج: عاجل جداً
                  </span>
                ) : item.isExactlyAtLimit ? (
                  <span className="bg-amber-50 text-amber-600 text-[10px] font-extrabold px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    وصل لحد الطلب الأدنى
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    آمن ومتوفر
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
                    item.isBelowLimit ? 'text-rose-600' : item.isExactlyAtLimit ? 'text-amber-600' : 'text-slate-800'
                  }`}>
                    {item.balance}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 block">الرصيد الحالي</span>
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
          ))
        )}
      </div>

      {/* Barcode Scanner Modal for Inventory */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        onScan={(scannedCode) => {
          setSearch(scannedCode);
        }}
      />

      {/* Quick Stocktake Modal */}
      <QuickStocktakeModal
        isOpen={isQuickStocktakeOpen}
        onClose={() => setIsQuickStocktakeOpen(false)}
        items={items}
        movements={movements}
        warehouses={warehouses}
        currentUser={currentUser}
        onAddMovement={onAddMovement || (() => {})}
        isDataLocked={isDataLocked}
        initialWarehouseId={selectedWarehouseId}
      />

    </div>
  );
}
