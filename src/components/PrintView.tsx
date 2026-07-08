import React, { useState } from 'react';
import { 
  Search, 
  Printer, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  X, 
  Calendar, 
  User as UserIcon, 
  Filter, 
  ClipboardList, 
  DollarSign, 
  Layers, 
  AlertTriangle 
} from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { Item, Movement, Warehouse, InvoiceSettings, User } from '../types';

interface PrintViewProps {
  movements: Movement[];
  items: Item[];
  warehouses?: Warehouse[];
  invoiceSettings?: InvoiceSettings;
  currentUser?: User;
}

type SubTabType = 'single' | 'filtered' | 'inventory';

export default function PrintView({ movements, items, warehouses = [], invoiceSettings, currentUser }: PrintViewProps) {
  const [activeTab, setActiveTab] = useState<SubTabType>('single');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');

  // Single Voucher State
  const [voucherType, setVoucherType] = useState<'in' | 'out'>('in');
  const [voucherNumberInput, setVoucherNumberInput] = useState('');
  const [queriedVoucher, setQueriedVoucher] = useState<Movement | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtered Movements State
  const [moveFilterType, setMoveFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [startDate, setStartDate] = useState(() => {
    // Default to start of current month
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  // Get recent vouchers for the selected type
  const recentVouchers = movements
    .filter((m) => m.type === voucherType)
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

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

  // Get Filtered Movements
  const filteredMovements = movements.filter((m) => {
    const matchesType = moveFilterType === 'all' || m.type === moveFilterType;
    const matchesDate = m.date >= startDate && m.date <= endDate;
    const matchesWarehouse = selectedWarehouseId === 'all' || m.warehouseId === selectedWarehouseId;
    return matchesType && matchesDate && matchesWarehouse;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Compute stats for filtered movements
  const totalInQty = filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0);
  const totalOutQty = filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0);

  // Compute Detailed Inventory Report Data
  const inventoryReportData = items.map((item) => {
    const totalIn = movements
      .filter((m) => m.itemId === item.id && m.type === 'in' && (selectedWarehouseId === 'all' || m.warehouseId === selectedWarehouseId))
      .reduce((sum, m) => sum + m.quantity, 0);

    const totalOut = movements
      .filter((m) => m.itemId === item.id && m.type === 'out' && (selectedWarehouseId === 'all' || m.warehouseId === selectedWarehouseId))
      .reduce((sum, m) => sum + m.quantity, 0);

    const balance = totalIn - totalOut;
    const value = balance * item.price;
    const isUnderLimit = balance < item.safetyLimit;

    return {
      ...item,
      totalIn,
      totalOut,
      balance,
      value,
      isUnderLimit
    };
  });

  const totalInventoryValue = inventoryReportData.reduce((sum, item) => sum + item.value, 0);
  const itemsUnderLimitCount = inventoryReportData.filter(i => i.isUnderLimit).length;

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Dynamic Printing Style overrides to ensure A4 compliance */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            background-color: white !important;
            color: #000000 !important;
            font-size: 11px !important;
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl !important;
          }
          header, nav, footer, 
          .print\\:hidden, 
          button, 
          input, 
          select, 
          .no-print,
          [role="banner"],
          aside {
            display: none !important;
          }
          .print-container, 
          #voucher-document-container, 
          #filtered-movements-container, 
          #detailed-inventory-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background-color: white !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          .page-break {
            page-break-before: always !important;
          }
          td, th {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
            color: #1e293b !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="print:hidden">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">طباعة السندات والتقارير</h2>
        <p className="text-slate-500 font-medium text-sm mt-0.5 font-sans">طباعة واستعلام سندات الوارد والصرف وجرد المستودع المفصل</p>
      </div>

      {/* Main Print Tabs Selector */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex w-full print:hidden">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'single'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={15} />
          <span>سند منفرد</span>
        </button>
        <button
          onClick={() => setActiveTab('filtered')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'filtered'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Filter size={15} />
          <span>حركات مفلترة</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={15} />
          <span>جرد تفصيلي</span>
        </button>
      </div>

      {/* Warehouse Selector (Only for Filtered Movements & Detailed Inventory) */}
      {(activeTab === 'filtered' || activeTab === 'inventory') && warehouses.length > 0 && (
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="text-right">
            <span className="text-xs font-extrabold text-slate-800 block">تحديد المستودع للتقرير المطبوع:</span>
            <span className="text-[10px] text-slate-400 font-bold">يمكنك حصر بيانات الجرد أو الحركات لمستودع معين قبل الطباعة</span>
          </div>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-black cursor-pointer min-w-[220px]"
          >
            <option value="all">كافة المستودعات (الكل)</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ==================== TAB 1: SINGLE VOUCHER ==================== */}
      {activeTab === 'single' && (
        <div className="space-y-6 print:hidden">
          {/* Query Card */}
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
                      ? 'bg-blue-800 text-white shadow-xs'
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
                      ? 'bg-blue-800 text-white shadow-xs'
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
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700 text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search size={18} className="stroke-[2.5]" />
                <span>استعلام ومعاينة السند</span>
              </button>
            </form>

            {errorMessage && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold p-3.5 rounded-xl text-center">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Recent Vouchers List */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800">
              {voucherType === 'in' ? 'آخر سندات الوارد المسجلة' : 'آخر سندات الصرف المسجلة'}
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
                      <p className="text-[11px] text-slate-400 font-semibold">الجهة: {v.partner}</p>
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
      )}

      {/* ==================== TAB 2: FILTERED MOVEMENTS ==================== */}
      {activeTab === 'filtered' && (
        <div className="space-y-5 print:hidden">
          {/* Controls Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Movement Type filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع الحركة</label>
                <select
                  value={moveFilterType}
                  onChange={(e: any) => setMoveFilterType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs px-3.5 py-3 rounded-xl outline-hidden text-slate-700"
                >
                  <option value="all">الكل (وارد وصرف)</option>
                  <option value="in">وارد فقط</option>
                  <option value="out">صرف فقط</option>
                </select>
              </div>

              {/* Start Date filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700"
                />
              </div>

              {/* End Date filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">إلى تاريخ</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="text-right text-xs text-slate-400 font-semibold space-y-0.5">
                <p>الحركات المطابقة: <strong className="text-slate-700 font-mono">{filteredMovements.length}</strong> حركة</p>
                <p className="font-mono">
                  إجمالي الوارد: <span className="text-emerald-600 font-bold">{totalInQty}</span> | إجمالي الصرف: <span className="text-orange-500 font-bold">{totalOutQty}</span>
                </p>
              </div>
              <button
                onClick={handlePrint}
                disabled={filteredMovements.length === 0}
                className="bg-blue-900 hover:bg-blue-950 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-extrabold px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>طباعة تقرير الحركات</span>
              </button>
            </div>
          </div>

          {/* Quick list preview (Not printed, printed matches Printable Report Section) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">معاينة الحركات المطابقة للفحص</h4>
            {filteredMovements.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-6 font-semibold">لا توجد حركات تطابق النطاق المحدد</p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto no-scrollbar">
                {filteredMovements.map((m) => {
                  const item = items.find(i => i.id === m.itemId);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl text-xs transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${m.type === 'in' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                          <span className="font-bold text-slate-700">{item ? item.name : 'منتج غير معروف'}</span>
                          <span className="text-slate-400 font-mono">(#{m.id})</span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-semibold">التاريخ: {m.date} | الجهة: {m.partner}</p>
                      </div>
                      <span className={`font-mono font-black text-sm ${m.type === 'in' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {m.type === 'in' ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: DETAILED INVENTORY ==================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-5 print:hidden">
          {/* Inventory Overview Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                <Layers size={20} className="stroke-[2.5]" />
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] font-bold block">إجمالي الأصناف المسجلة</span>
                <span className="text-xl font-black text-slate-800 font-mono block mt-0.5">{items.length} صنف</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                <DollarSign size={20} className="stroke-[2.5]" />
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] font-bold block">القيمة الإجمالية للمخزون</span>
                <span className="text-xl font-black text-emerald-600 font-mono block mt-0.5">{totalInventoryValue.toLocaleString()} ر.س</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="bg-red-50 text-red-600 p-3 rounded-2xl">
                <AlertTriangle size={20} className="stroke-[2.5]" />
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] font-bold block">أصناف تحت حد الأمان</span>
                <span className="text-xl font-black text-red-600 font-mono block mt-0.5">{itemsUnderLimitCount} أصناف</span>
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 text-center space-y-4">
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">طباعة تقرير جرد المستودع التفصيلي</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                يحتوي التقرير على تفاصيل دقيقة تشمل اسم المنتج، كود التعريف، التصنيف، الكمية الإجمالية للوارد، الصرف، الرصيد الحالي والقيمة التقديرية للمخزون مع إشعارات حد الأمان.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-black px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-xs hover:scale-105"
            >
              <Printer size={16} />
              <span>معاينة وطباعة تقرير الجرد التفصيلي</span>
            </button>
          </div>
        </div>
      )}


      {/* =============================================================== */}
      {/* ==================== PRINT DOCUMENT LAYOUTS ==================== */}
      {/* =============================================================== */}

      {/* PRINTABLE DOCUMENT 1: SINGLE VOUCHER (Only rendered when selected) */}
      {activeTab === 'single' && queriedVoucher && activeItem && (
        <div id="voucher-document-container" className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md print-container print:p-0 print:border-none print:shadow-none">
          
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
                type="button"
                onClick={() => exportToPDF('voucher-document-container', `سند_${voucherType === 'in' ? 'وارد' : 'صرف'}_رقم_${queriedVoucher.id}.pdf`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText size={15} />
                <span>تصدير PDF</span>
              </button>
              <button
                onClick={() => {
                  setQueriedVoucher(null);
                  setVoucherNumberInput('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>

          <div id="voucher-document" className="space-y-6 font-sans">
            {/* Document Header */}
            <div className="flex justify-between items-start gap-4 border-b-2 border-slate-800 pb-5">
              <div className="flex items-start gap-3.5">
                {invoiceSettings?.logo && (
                  <img src={invoiceSettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg shrink-0" referrerPolicy="no-referrer" />
                )}
                <div className="space-y-1 text-right">
                  <h4 className="text-base font-black text-slate-900">{invoiceSettings?.name || 'شركة المدى للتقنية والتجارة'}</h4>
                  <p className="text-[10px] text-slate-500 font-extrabold">قسم إدارة المخازن والمستودعات</p>
                  <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{invoiceSettings?.address || 'الرياض، المملكة العربية السعودية'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">الهاتف: {invoiceSettings?.phone || '+967775104368'} {invoiceSettings?.email && ` | البريد: ${invoiceSettings.email}`}</p>
                </div>
              </div>
              <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
                <h5 className="text-xs font-black text-blue-900 text-left">
                  {voucherType === 'in' ? 'سند استلام وارد' : 'سند صرف صادر'}
                </h5>
                <p className="text-[11px] font-bold text-slate-700 font-mono text-left">الرقم: #{queriedVoucher.id}</p>
                <p className="text-[10px] text-slate-400 font-mono text-left">التاريخ: {queriedVoucher.date}</p>
                {currentUser && (
                  <p className="text-[9px] text-slate-500 font-bold text-left mt-1 border-t border-slate-100 pt-0.5">بواسطة: {currentUser.username}</p>
                )}
                {(() => {
                  const queriedWarehouse = warehouses.find(w => w.id === queriedVoucher.warehouseId);
                  return (
                    <p className="text-[10px] text-blue-900 font-black text-left mt-1 border-t border-slate-100 pt-0.5">
                      المستودع: {queriedWarehouse ? queriedWarehouse.name : (queriedVoucher.warehouseId || 'المستودع الرئيسي')}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon size={15} className="text-slate-400" />
                <span className="font-bold text-slate-500">
                  {voucherType === 'in' ? 'المورّد:' : 'العميل/المستلم:'}
                </span>
                <span className="font-extrabold text-slate-800">{queriedVoucher.partner}</span>
              </div>
              <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <Calendar size={15} className="text-slate-400" />
                <span className="font-bold text-slate-500">التاريخ القيد:</span>
                <span className="font-extrabold text-slate-800 font-mono">{queriedVoucher.date}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
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
                    <td className="p-3 text-left font-mono">{activeItem.price.toFixed(2)} {activeItem.currency || 'ر.س'}</td>
                    <td className="p-3 text-left font-mono font-black text-slate-800">{totalValue.toFixed(2)} {activeItem.currency || 'ر.س'}</td>
                  </tr>
                  
                  {/* Total summary row */}
                  <tr className="bg-slate-50 border-t border-slate-200 font-black text-slate-800">
                    <td colSpan={4} className="p-3 text-left">المجموع الخاضع للضريبة:</td>
                    <td colSpan={2} className="p-3 text-left font-mono text-base text-blue-900">
                      {totalValue.toFixed(2)} {activeItem.currency || 'ر.س'}
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

            {invoiceSettings?.footerNote && (
              <div className="border-t border-dashed border-slate-200 pt-4 text-center mt-6">
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{invoiceSettings.footerNote}</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* PRINTABLE DOCUMENT 2: FILTERED MOVEMENTS REPORT */}
      {activeTab === 'filtered' && (
        <div id="filtered-movements-container" className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md print-container print:p-0 print:border-none print:shadow-none mt-6">
          
          {/* Action button bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
            <span className="text-xs font-black text-slate-400">معاينة التقرير الرسمي للطباعة والتصدير</span>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>طباعة التقرير</span>
              </button>
              <button
                type="button"
                onClick={() => exportToPDF('filtered-movements-container', `تقرير_حركات_المخزن_${startDate}_إلى_${endDate}.pdf`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText size={15} />
                <span>تصدير PDF</span>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="flex justify-between items-start gap-4 border-b-2 border-slate-800 pb-5">
            <div className="flex items-start gap-3.5">
              {invoiceSettings?.logo && (
                <img src={invoiceSettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg shrink-0" referrerPolicy="no-referrer" />
              )}
              <div className="space-y-1 text-right">
                <h4 className="text-base font-black text-slate-900">{invoiceSettings?.name || 'شركة المدى للتقنية والتجارة'}</h4>
                <p className="text-[10px] text-slate-500 font-extrabold">قسم إدارة المخازن والمستودعات</p>
                <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{invoiceSettings?.address || 'الرياض، المملكة العربية السعودية'}</p>
                <p className="text-[9px] text-slate-400 font-mono">الهاتف: {invoiceSettings?.phone || '+967775104368'} {invoiceSettings?.email && ` | البريد: ${invoiceSettings.email}`}</p>
              </div>
            </div>
            <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
              <h5 className="text-xs font-black text-blue-900 text-left">تقرير حركة المستودع</h5>
              <p className="text-[10px] text-slate-500 text-left font-semibold">من: <span className="font-mono">{startDate}</span></p>
              <p className="text-[10px] text-slate-500 text-left font-semibold">إلى: <span className="font-mono">{endDate}</span></p>
              {currentUser && (
                <p className="text-[9px] text-slate-500 font-bold text-left mt-1 border-t border-slate-100 pt-0.5">بواسطة: {currentUser.username}</p>
              )}
            </div>
          </div>

          {/* Filter Description block */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 flex justify-between">
            <div>
              <span>نوع الحركات المشمولة: </span>
              <strong className="text-slate-800">
                {moveFilterType === 'all' ? 'الكل (الوارد والصرف)' : moveFilterType === 'in' ? 'الوارد فقط' : 'الصرف فقط'}
              </strong>
            </div>
            <div className="font-mono">
              إجمالي الحركات: <strong>{filteredMovements.length}</strong> | وارد: <strong>{totalInQty}</strong> | صرف: <strong>{totalOutQty}</strong>
            </div>
          </div>

          {/* Movements table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700">
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">رمز الصنف</th>
                  <th className="p-3">اسم السلعة / البيان</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3">الجهة (المورد / المستلم)</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 font-semibold">لا توجد حركات تطابق النطاق والنوع المحددين</td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const item = items.find(i => i.id === m.itemId);
                    return (
                      <tr key={m.id} className="border-b border-slate-100 text-slate-700">
                        <td className="p-3 font-mono font-bold">#{m.id}</td>
                        <td className="p-3 font-mono">{m.date}</td>
                        <td className={`p-3 font-bold ${m.type === 'in' ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {m.type === 'in' ? 'استلام وارد' : 'صرف صادر'}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{m.itemId}</td>
                        <td className="p-3 font-bold">{item ? item.name : 'منتج غير معروف'}</td>
                        <td className="p-3 text-center font-mono font-black">{m.quantity}</td>
                        <td className="p-3 font-medium">{m.partner}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer signature line */}
          <div className="grid grid-cols-2 gap-6 pt-12 text-center text-xs">
            <div className="space-y-6">
              <p className="font-bold text-slate-500">معد التقرير (أمين المستودع):</p>
              <div className="w-2/3 mx-auto border-b border-slate-300"></div>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-slate-500">مدير مراقبة المخزون / الاعتماد:</p>
              <div className="w-2/3 mx-auto border-b border-slate-300"></div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE DOCUMENT 3: DETAILED INVENTORY REPORT */}
      {activeTab === 'inventory' && (
        <div id="detailed-inventory-container" className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md print-container print:p-0 print:border-none print:shadow-none mt-6">
          
          {/* Action button bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
            <span className="text-xs font-black text-slate-400">معاينة التقرير الرسمي للطباعة والتصدير</span>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>طباعة التقرير</span>
              </button>
              <button
                type="button"
                onClick={() => exportToPDF('detailed-inventory-container', `تقرير_الجرد_التفصيلي_${new Date().toISOString().split('T')[0]}.pdf`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText size={15} />
                <span>تصدير PDF</span>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="flex justify-between items-start gap-4 border-b-2 border-slate-800 pb-5">
            <div className="flex items-start gap-3.5">
              {invoiceSettings?.logo && (
                <img src={invoiceSettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg shrink-0" referrerPolicy="no-referrer" />
              )}
              <div className="space-y-1 text-right">
                <h4 className="text-base font-black text-slate-900">{invoiceSettings?.name || 'شركة المدى للتقنية والتجارة'}</h4>
                <p className="text-[10px] text-slate-500 font-extrabold">قسم إدارة المخازن والمستودعات</p>
                <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{invoiceSettings?.address || 'الرياض، المملكة العربية السعودية'}</p>
                <p className="text-[9px] text-slate-400 font-mono">الهاتف: {invoiceSettings?.phone || '+967775104368'} {invoiceSettings?.email && ` | البريد: ${invoiceSettings.email}`}</p>
              </div>
            </div>
            <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
              <h5 className="text-xs font-black text-blue-900 text-left">تقرير الجرد التفصيلي</h5>
              <p className="text-[10px] text-slate-400 text-left font-semibold">تاريخ الطباعة:</p>
              <p className="text-[10px] text-slate-700 text-left font-bold font-mono">{new Date().toISOString().split('T')[0]}</p>
              {currentUser && (
                <p className="text-[9px] text-slate-500 font-bold text-left mt-1 border-t border-slate-100 pt-0.5">بواسطة: {currentUser.username}</p>
              )}
            </div>
          </div>

          {/* Summary widgets row for A4 */}
          <div className="grid grid-cols-3 gap-3 text-center border border-slate-200 p-4 rounded-2xl bg-slate-50/50 text-xs">
            <div>
              <span className="text-slate-400 font-semibold">إجمالي عدد الأصناف:</span>
              <strong className="text-slate-800 font-mono text-sm block mt-0.5">{items.length} أصناف</strong>
            </div>
            <div className="border-r border-slate-200">
              <span className="text-slate-400 font-semibold">أصناف تحت حد الأمان:</span>
              <strong className="text-red-600 font-mono text-sm block mt-0.5">{itemsUnderLimitCount} أصناف تنبيه</strong>
            </div>
            <div className="border-r border-slate-200">
              <span className="text-slate-400 font-semibold">القيمة التقديرية للمستودع:</span>
              <strong className="text-emerald-700 font-mono text-sm block mt-0.5">{totalInventoryValue.toLocaleString()} ر.س</strong>
            </div>
          </div>

          {/* Detailed Inventory report table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700">
                  <th className="p-3">رمز الصنف</th>
                  <th className="p-3">اسم السلعة / البيان</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">الوحدة</th>
                  <th className="p-3 text-center text-emerald-700">إجمالي الوارد</th>
                  <th className="p-3 text-center text-orange-600">إجمالي الصرف</th>
                  <th className="p-3 text-center">الرصيد الحالي</th>
                  <th className="p-3 text-center">حد الأمان</th>
                  <th className="p-3 text-left">سعر الوحدة</th>
                  <th className="p-3 text-left">إجمالي القيمة</th>
                </tr>
              </thead>
              <tbody>
                {inventoryReportData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                    <td className="p-3 font-mono text-slate-500 font-bold">{item.id}</td>
                    <td className="p-3 font-bold">{item.name}</td>
                    <td className="p-3 font-medium text-slate-400">{item.category || 'غير مصنف'}</td>
                    <td className="p-3 text-center">{item.unit}</td>
                    <td className="p-3 text-center font-mono font-semibold text-emerald-600">+{item.totalIn}</td>
                    <td className="p-3 text-center font-mono font-semibold text-orange-500">-{item.totalOut}</td>
                    <td className={`p-3 text-center font-mono font-black ${item.isUnderLimit ? 'text-red-600 bg-red-50/50' : 'text-slate-800'}`}>
                      {item.balance}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">{item.safetyLimit}</td>
                    <td className="p-3 text-left font-mono">{item.price.toFixed(2)} {item.currency || 'ر.س'}</td>
                    <td className="p-3 text-left font-mono font-black text-blue-900">{item.value.toFixed(2)} {item.currency || 'ر.س'}</td>
                  </tr>
                ))}
                {/* Total Inventory sum line */}
                <tr className="bg-slate-50 font-black text-slate-800 text-sm">
                  <td colSpan={7} className="p-3 text-left">صافي قيمة المخزون العام:</td>
                  <td colSpan={3} className="p-3 text-left font-mono text-blue-900 text-base">
                    {totalInventoryValue.toLocaleString()} ر.س
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer signature line */}
          <div className="grid grid-cols-2 gap-6 pt-12 text-center text-xs">
            <div className="space-y-6">
              <p className="font-bold text-slate-500">مسؤول الجرد (أمين المستودع):</p>
              <div className="w-2/3 mx-auto border-b border-slate-300"></div>
              <p className="text-[10px] text-slate-400">الاسم والتوقيع</p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-slate-500">لجنة جرد المستودعات ومطابقة الأرصدة:</p>
              <div className="w-2/3 mx-auto border-b border-slate-300"></div>
              <p className="text-[10px] text-slate-400">الاسم والتوقيع</p>
            </div>
          </div>

          {invoiceSettings?.footerNote && (
            <div className="border-t border-dashed border-slate-200 pt-4 text-center mt-6">
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{invoiceSettings.footerNote}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
