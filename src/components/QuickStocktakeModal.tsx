import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Search, Check, AlertTriangle, AlertCircle, Sparkles, Save, Layers, Package, History } from 'lucide-react';
import { Item, Movement, Warehouse, User } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';

interface QuickStocktakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  movements: Movement[];
  warehouses: Warehouse[];
  currentUser?: User;
  onAddMovement: (movement: Movement) => void;
  isDataLocked?: boolean;
  initialWarehouseId?: string;
}

interface AdjustmentLog {
  itemId: string;
  itemName: string;
  warehouseName: string;
  registeredQty: number;
  actualQty: number;
  difference: number;
  type: 'in' | 'out' | 'equal';
  timestamp: string;
}

export default function QuickStocktakeModal({
  isOpen,
  onClose,
  items,
  movements,
  warehouses,
  currentUser,
  onAddMovement,
  isDataLocked = false,
  initialWarehouseId = 'all',
}: QuickStocktakeModalProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Quantities
  const [registeredQty, setRegisteredQty] = useState<number>(0);
  const [actualQty, setActualQty] = useState<string>('');
  const [difference, setDifference] = useState<number>(0);
  
  // Session history log for the user to review what they adjusted
  const [sessionLogs, setSessionLogs] = useState<AdjustmentLog[]>([]);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const actualQtyInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected warehouse
  useEffect(() => {
    if (isOpen) {
      if (initialWarehouseId && initialWarehouseId !== 'all') {
        setSelectedWarehouseId(initialWarehouseId);
      } else if (currentUser?.warehouseId) {
        setSelectedWarehouseId(currentUser.warehouseId);
      } else if (warehouses.length > 0) {
        setSelectedWarehouseId(warehouses[0].id);
      } else {
        setSelectedWarehouseId('');
      }
      
      // Focus barcode input on open
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 300);
    } else {
      // Reset state on close
      setBarcodeInput('');
      setSelectedItem(null);
      setActualQty('');
      setDifference(0);
    }
  }, [isOpen, initialWarehouseId, currentUser, warehouses]);

  // Recalculate registered quantity when item or warehouse changes
  useEffect(() => {
    if (!selectedItem) {
      setRegisteredQty(0);
      return;
    }

    const targetWarehouseId = selectedWarehouseId;
    
    // Sum movements for this item and warehouse
    const inward = movements
      .filter((m) => m.itemId === selectedItem.id && m.type === 'in' && (!targetWarehouseId || targetWarehouseId === 'all' || m.warehouseId === targetWarehouseId))
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = movements
      .filter((m) => m.itemId === selectedItem.id && m.type === 'out' && (!targetWarehouseId || targetWarehouseId === 'all' || m.warehouseId === targetWarehouseId))
      .reduce((sum, m) => sum + m.quantity, 0);

    const stock = inward - outward;
    setRegisteredQty(stock);
    
    // Set default actual quantity to match registered quantity initially for easy edit
    setActualQty(String(stock));
    setDifference(0);
    
    // Focus the actual quantity input field
    setTimeout(() => {
      actualQtyInputRef.current?.focus();
      actualQtyInputRef.current?.select();
    }, 100);
  }, [selectedItem, selectedWarehouseId, movements]);

  // Calculate difference dynamically when actual quantity input changes
  const handleActualQtyChange = (val: string) => {
    setActualQty(val);
    const parsedActual = val === '' ? 0 : Number(val);
    if (!isNaN(parsedActual)) {
      setDifference(parsedActual - registeredQty);
    } else {
      setDifference(0);
    }
  };

  // Search/Match item by code when barcodeInput changes
  const handleBarcodeInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim().toUpperCase();
    if (!query) return;

    const matched = items.find((item) => item.id.toUpperCase() === query);
    if (matched) {
      setSelectedItem(matched);
      setBarcodeInput('');
    } else {
      alert(`⚠️ عذراً، لم يتم العثور على أي صنف بالرمز: ${query}`);
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }
  };

  // Quick manual select from list of items
  const handleManualItemSelect = (item: Item) => {
    setSelectedItem(item);
    setBarcodeInput('');
  };

  // Confirm and Save current adjustment
  const handleSaveAdjustment = () => {
    if (isDataLocked) {
      alert('🔒 النظام في حالة قفل البيانات حالياً، لا يمكن إجراء تعديلات!');
      return;
    }
    if (!selectedItem) return;
    if (!selectedWarehouseId || selectedWarehouseId === 'all') {
      alert('يرجى تحديد مستودع معين لإجراء حركة التسوية الجردية عليه!');
      return;
    }

    const parsedActual = actualQty === '' ? 0 : Number(actualQty);
    if (isNaN(parsedActual) || parsedActual < 0) {
      alert('الرجاء إدخال كمية فعلية صحيحة (أكبر من أو تساوي صفر)!');
      return;
    }

    const diff = parsedActual - registeredQty;
    const warehouseName = warehouses.find(w => w.id === selectedWarehouseId)?.name || selectedWarehouseId;

    if (diff !== 0) {
      // Calculate next movement id
      const nextId = movements.length > 0 ? Math.max(...movements.map((m) => m.id)) + 1 : 1001;
      
      // Save movement
      onAddMovement({
        id: nextId,
        itemId: selectedItem.id,
        quantity: Math.abs(diff),
        type: diff > 0 ? 'in' : 'out',
        partner: 'تسوية جرد سريع ⚡',
        date: new Date().toISOString().split('T')[0],
        warehouseId: selectedWarehouseId,
      });

      // Add to session log
      const newLog: AdjustmentLog = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        warehouseName,
        registeredQty,
        actualQty: parsedActual,
        difference: diff,
        type: diff > 0 ? 'in' : 'out',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setSessionLogs(prev => [newLog, ...prev]);
    } else {
      // No stock change, but we can log that it was verified
      const newLog: AdjustmentLog = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        warehouseName,
        registeredQty,
        actualQty: parsedActual,
        difference: 0,
        type: 'equal',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setSessionLogs(prev => [newLog, ...prev]);
    }

    // Reset current active item, focus back to barcode input for sequential entry!
    setSelectedItem(null);
    setBarcodeInput('');
    setActualQty('');
    setDifference(0);
    
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 200);
  };

  // Camera Barcode scanner callback
  const handleCameraScanSuccess = (scannedCode: string) => {
    const matched = items.find((item) => item.id.toUpperCase() === scannedCode.toUpperCase());
    if (matched) {
      setSelectedItem(matched);
      setIsCameraScannerOpen(false);
    } else {
      alert(`⚠️ تم قراءة الكود [${scannedCode}] ولكن لا يوجد صنف مطابق له في قائمة الأصناف!`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] max-h-[720px] shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-scale-up text-right">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/15 text-blue-400 p-2.5 rounded-xl">
              <Sparkles size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">جلسة الجرد السريع للمستودع ⚡</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">امسح الباركود بشكل متتالي، وأدخل الكميات الفعلية لتحديث الفروقات فورياً تلقائياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40">
          
          {/* Right Side: Scan & Adjust controls (7 columns on desktop) */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            
            <div className="space-y-4">
              {/* 1. Warehouse Selection */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs">
                <label className="block text-xs font-black text-slate-500 mb-2">1. مستودع الجرد الحالي:</label>
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <Layers size={16} className="text-blue-600 stroke-[2.5]" />
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full text-xs font-black text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    <option value="" disabled>-- اختر المستودع المراد جرده --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Barcode Scanning Area */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
                <label className="block text-xs font-black text-slate-500">2. مسح الباركود / رمز الصنف:</label>
                
                <form onSubmit={handleBarcodeInputSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="امسح بالقارئ الخارجي أو اكتب الكود واضغط Enter... 🔍"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-10 py-3 rounded-xl outline-hidden transition-all text-slate-700 font-bold placeholder:text-slate-400"
                    />
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 shrink-0"
                    title="تشغيل كاميرا الهاتف لمسح الباركود"
                  >
                    <Camera size={15} className="stroke-[2.5]" />
                    <span className="text-xs font-black hidden sm:inline">الكاميرا 📷</span>
                  </button>
                </form>

                {/* Simulated helper bar for scanning if no physical scanner */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">اختيار سريع للتجربة:</span>
                  {items.slice(0, 3).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleManualItemSelect(item)}
                      className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all border border-slate-200/55 cursor-pointer"
                    >
                      {item.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Stocktake Quantity Adjustment Form */}
              {selectedItem ? (
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 space-y-4 animate-scale-up">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2.5">
                      <div className="bg-blue-600/10 text-blue-600 p-2 rounded-xl h-10 w-10 flex items-center justify-center">
                        <Package size={20} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-blue-900">الصنف المجرود حالياً:</h4>
                        <span className="text-sm font-black text-slate-800 mt-0.5 block">{selectedItem.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">رمز الصنف: {selectedItem.id} | الوحدة: {selectedItem.unit}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedItem(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Registered vs Actual fields */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="bg-white border border-slate-100 p-3.5 rounded-2xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">الكمية المسجلة (بالنظام)</span>
                      <strong className="text-xl font-black text-slate-700 font-mono">{registeredQty}</strong>
                    </div>

                    <div className="bg-white border-2 border-blue-500 p-3.5 rounded-2xl text-center space-y-1">
                      <label htmlFor="actual-qty-input" className="text-[10px] font-black text-blue-600 block">الكمية الفعلية (على الواقع)</label>
                      <input
                        id="actual-qty-input"
                        ref={actualQtyInputRef}
                        type="number"
                        min="0"
                        className="text-xl font-black text-center text-slate-800 font-mono w-full bg-transparent focus:outline-hidden"
                        value={actualQty}
                        onChange={(e) => handleActualQtyChange(e.target.value)}
                        placeholder="أدخل الكمية..."
                      />
                    </div>
                  </div>

                  {/* Real-time difference visualization */}
                  <div className="flex items-center justify-between bg-white/80 border border-slate-100 rounded-2xl p-3 px-4 text-xs font-bold">
                    <span className="text-slate-500">فرق الجرد المكتشف:</span>
                    
                    {difference > 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl font-black flex items-center gap-1">
                        +{difference} {selectedItem.unit} (زيادة/فائض مخزني 📈)
                      </span>
                    ) : difference < 0 ? (
                      <span className="bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-xl font-black flex items-center gap-1">
                        {difference} {selectedItem.unit} (عجز/نقص مخزني 📉)
                      </span>
                    ) : (
                      <span className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl font-black flex items-center gap-1">
                        0 (مطابق تماماً ✅)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/55 border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 space-y-2">
                  <AlertCircle size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold">الرجاء مسح باركود سلعة أو كتابة كودها للبدء في جردها.</p>
                  <p className="text-[10px] text-slate-400">يدعم القوارئ اللاسلكية بنسبة 100% بمجرد التوجيه والضغط.</p>
                </div>
              )}
            </div>

            {/* Adjustment Footer Save Buttons */}
            {selectedItem && (
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Save size={15} className="stroke-[2.5]" />
                  <span>تأكيد جرد الصنف وحفظ التعديل 💾</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black py-3 px-4 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              </div>
            )}

          </div>

          {/* Left Side: Session Stocktake History Log (5 columns on desktop) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-150 p-4.5 flex flex-col h-full min-h-[250px] lg:h-auto">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5">
              <History size={15} className="text-blue-600 stroke-[2.5]" />
              <div>
                <h4 className="font-extrabold text-xs text-slate-800">سجل جرد الجلسة الحالية</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">تعديلات قمت بها منذ فتح النافذة ({sessionLogs.length} أصناف)</p>
              </div>
            </div>

            {/* Scrollable logs list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] lg:max-h-none pr-1">
              {sessionLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-10 space-y-1.5">
                  <Check size={28} className="stroke-[2]" />
                  <p className="text-[11px] font-bold">لم تجرِ أي تسويات بعد في هذه الجلسة</p>
                  <p className="text-[9px] text-slate-400">الأصناف المعدلة ستظهر هنا متتالية مع الفروقات</p>
                </div>
              ) : (
                sessionLogs.map((log, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-800 truncate block max-w-[150px]">{log.itemName}</span>
                      <span className="text-[8px] font-mono text-slate-400 shrink-0">{log.timestamp}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>الرمز: <strong className="font-mono text-slate-600">{log.itemId}</strong></span>
                      <span>المستودع: <span className="text-blue-950 font-extrabold">{log.warehouseName}</span></span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-[9px] font-extrabold">
                      <div>
                        <span className="text-slate-400 font-semibold">مسجل:</span> <strong className="font-mono text-slate-600">{log.registeredQty}</strong>
                        <span className="text-slate-400 font-semibold mr-1.5">فعلي:</span> <strong className="font-mono text-slate-800">{log.actualQty}</strong>
                      </div>

                      {log.difference > 0 ? (
                        <span className="text-emerald-600 font-black">+ {log.difference} (زيادة)</span>
                      ) : log.difference < 0 ? (
                        <span className="text-rose-600 font-black">{log.difference} (عجز)</span>
                      ) : (
                        <span className="text-slate-500 font-black">مطابق (تأكيد)</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Modal Camera Scanner Portal */}
        <BarcodeScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          items={items}
          onScan={handleCameraScanSuccess}
        />

      </div>
    </div>
  );
}
