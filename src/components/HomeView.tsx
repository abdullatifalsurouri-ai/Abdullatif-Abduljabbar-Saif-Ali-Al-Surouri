import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  Smartphone, 
  ArrowDownToLine, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle, 
  Info,
  Database,
  Download,
  Upload,
  Trash2,
  Lock,
  Unlock,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Item, Movement, Supplier, User } from '../types';

interface HomeViewProps {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
  isDataLocked: boolean;
  onToggleLock: (locked: boolean) => void;
  onNavigate: (tab: 'inventory' | 'items' | 'movements' | 'report' | 'print') => void;
  onOpenSuppliers: () => void;
  onImportData: (items: Item[], suppliers: Supplier[], movements: Movement[]) => void;
  onResetData: () => void;
  currentUser: User;
  dashboardStatsConfig: {
    showSuppliers: boolean;
    showItems: boolean;
    showTotalOutward: boolean;
    showTotalInward: boolean;
    showTotalValue: boolean;
    showDailyMovements: boolean;
    showLowStock: boolean;
  };
}

export default function HomeView({
  items,
  movements,
  suppliers,
  isDataLocked,
  onToggleLock,
  onNavigate,
  onOpenSuppliers,
  onImportData,
  onResetData,
  currentUser,
  dashboardStatsConfig,
}: HomeViewProps) {
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    return localStorage.getItem('hide_install_banner') !== 'true';
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Data management state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleExport = () => {
    try {
      const backupData = {
        version: "1.0",
        app: "wms_al_mada",
        exportedAt: new Date().toISOString(),
        data: {
          items,
          suppliers,
          movements
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `wms_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      localStorage.setItem('wms_last_backup_date', new Date().toISOString());
      setToast({ message: 'تم تصدير نسخة احتياطية من البيانات بنجاح! 📥', type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: 'حدث خطأ أثناء تصدير البيانات.', type: 'error' });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDataLocked) {
      setToast({ message: '⚠️ لا يمكن استيراد البيانات لأن خيار "قفل البيانات" مفعّل حالياً في الإعدادات.', type: 'error' });
      event.target.value = '';
      return;
    }
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        
        // Validate backup structure
        if (parsed && parsed.data && Array.isArray(parsed.data.items) && Array.isArray(parsed.data.movements)) {
          const importedItems = parsed.data.items;
          const importedSuppliers = Array.isArray(parsed.data.suppliers) ? parsed.data.suppliers : [];
          const importedMovements = parsed.data.movements;

          // Perform restore
          onImportData(importedItems, importedSuppliers, importedMovements);
          setToast({ message: 'تم استيراد كافة البيانات واستعادة النسخة الاحتياطية بنجاح! 🎉', type: 'success' });
        } else {
          setToast({ message: 'ملف غير صالح. يرجى اختيار ملف نسخة احتياطية صحيح.', type: 'error' });
        }
      } catch (error) {
        console.error(error);
        setToast({ message: 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من اختيار ملف JSON صحيح.', type: 'error' });
      }
    };
    fileReader.readAsText(files[0]);
    // Reset file input value so same file can be imported again if needed
    event.target.value = '';
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('hide_install_banner', 'true');
  };

  // Calculate statistics
  const totalSuppliers = suppliers.length;
  const totalItems = items.length;

  // Total Inward (وارد) and Total Outward (صرف)
  const totalInward = movements
    .filter((m) => m.type === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOutward = movements
    .filter((m) => m.type === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  // Calculate specific metrics for each item
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

  // Number of items under safety limit
  const shortCount = itemStockStats.filter((i) => i.isUnderSafetyLimit).length;

  // 1. Total Stock Value (إجمالي قيمة المخزون)
  const totalStockValue = itemStockStats.reduce((sum, item) => sum + (item.price * Math.max(0, item.balance)), 0);

  // 2. Daily Movements (عدد الحركات اليومية)
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyMovementCount = movements.filter((m) => m.date === todayStr).length;

  // 3. Expiration Tracking (تاريخ انتهاء الصلاحية)
  const todayTime = new Date().setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = todayTime + (30 * 24 * 60 * 60 * 1000);

  const expiredItems = itemStockStats.filter((item) => {
    if (!item.expirationDate) return false;
    const expTime = new Date(item.expirationDate).setHours(0, 0, 0, 0);
    return expTime <= todayTime;
  });

  const expiringSoonItems = itemStockStats.filter((item) => {
    if (!item.expirationDate) return false;
    const expTime = new Date(item.expirationDate).setHours(0, 0, 0, 0);
    return expTime > todayTime && expTime <= thirtyDaysFromNow;
  });

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">نظام إدارة المستودعات</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">الإصدار الثالث V3</p>
        </div>
        <div>
          <button
            onClick={onOpenSuppliers}
            className="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 font-semibold text-sm px-5 py-3 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users size={18} className="text-blue-500 stroke-[2.5]" />
            <span>الموردون</span>
          </button>
        </div>
      </div>

      {/* Install App Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all duration-300">
          
          {/* Close Button */}
          <button 
            onClick={dismissBanner}
            className="absolute top-4 left-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X size={16} />
          </button>

          <div className="flex gap-4 items-start pl-4">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shrink-0 shadow-md shadow-blue-200">
              <Smartphone size={24} className="animate-bounce" />
            </div>
            <div className="space-y-1 text-right flex-1">
              <h3 className="font-extrabold text-slate-800 text-base">تثبيت التطبيق على جوالك 📱</h3>
              <p className="text-slate-500 font-semibold text-xs leading-relaxed">
                استخدم نظام المستودعات كتطبيق جوال كامل ومستقل يعمل بسرعة فائقة وبدون تشتيت في المستودع!
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 px-5 rounded-2xl shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownToLine size={16} className="stroke-[2.5]" />
                <span>تثبيت التطبيق الآن</span>
              </button>
            ) : (
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex-1 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 font-black text-sm py-3 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Info size={16} />
                <span>طريقة التثبيت على الجوال</span>
                {showInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          {/* Collapsible Instruction Details */}
          {(showInstructions || !deferredPrompt) && (
            <div className="mt-4 pt-4 border-t border-blue-100/50 space-y-4 text-xs text-slate-600 font-medium">
              <div className="space-y-3 bg-white/60 p-3.5 rounded-2xl border border-white/40">
                <span className="font-extrabold text-slate-700 text-sm block mb-1">💡 طريقة التثبيت السهلة:</span>
                
                {/* iOS Instructions */}
                <div className="space-y-1.5 border-b border-slate-100/50 pb-2.5">
                  <span className="font-extrabold text-blue-600 flex items-center gap-1">
                    🍏 هواتف آيفون (iPhone / Safari):
                  </span>
                  <ol className="list-decimal list-inside pr-1 space-y-1.5 leading-relaxed text-slate-500">
                    <li>افتح رابط التطبيق في متصفح <strong className="text-slate-700">Safari</strong>.</li>
                    <li>اضغط على زر المشاركة <strong className="text-slate-700">المربع مع السهم (Share)</strong> في الأسفل.</li>
                    <li>اختر <strong className="text-slate-700">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</strong>.</li>
                  </ol>
                </div>

                {/* Android / Chrome Instructions */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    🤖 هواتف أندرويد (Android / Chrome):
                  </span>
                  <ol className="list-decimal list-inside pr-1 space-y-1.5 leading-relaxed text-slate-500">
                    <li>افتح رابط التطبيق في متصفح <strong className="text-slate-700">Chrome</strong>.</li>
                    <li>اضغط على زر الثلاث نقاط <strong className="text-slate-700">(⋮)</strong> في الأعلى.</li>
                    <li>اختر <strong className="text-slate-700">"إضافة إلى الشاشة الرئيسية"</strong> أو <strong className="text-slate-700">"تثبيت التطبيق"</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Already Installed Greeting */}
      {isInstalled && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <CheckCircle size={20} className="stroke-[2.5]" />
          </div>
          <div className="text-sm font-bold">
            رائع! أنت تستخدم التطبيق المثبت على جوالك بنجاح ✨
          </div>
        </div>
      )}

      {/* Safety limit warning alert banner if any items are under limit */}
      {shortCount > 0 && (
        <button
          onClick={() => onNavigate('inventory')}
          className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center justify-between gap-3 text-right transition-all cursor-pointer group shadow-xs animate-pulse-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-xl text-red-600">
              <AlertCircle size={20} className="stroke-[2.5]" />
            </div>
            <div className="text-sm font-bold">
              تحذير: {shortCount} صنف تحت حد الأمان — اضغط للمراجعة
            </div>
          </div>
          <span className="text-xs font-semibold text-red-500 group-hover:translate-x-[-4px] transition-transform">
            عرض التفاصيل &larr;
          </span>
        </button>
      )}

      {/* Expired Items Alerts */}
      {expiredItems.length > 0 && (
        <button
          onClick={() => onNavigate('items')}
          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-center justify-between gap-3 text-right transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-600 animate-pulse">
              <AlertCircle size={20} className="stroke-[2.5]" />
            </div>
            <div className="text-sm font-bold">
              تنبيه هام: يوجد {expiredItems.length} صنف منتهي الصلاحية حالياً! ⚠️
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-500 group-hover:translate-x-[-4px] transition-transform">
            فرز وعرض الأصناف &larr;
          </span>
        </button>
      )}

      {/* Expiring Soon Items Alerts */}
      {expiringSoonItems.length > 0 && (
        <button
          onClick={() => onNavigate('items')}
          className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 p-4 rounded-2xl flex items-center justify-between gap-3 text-right transition-all cursor-pointer group shadow-xs animate-pulse-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <AlertCircle size={20} className="stroke-[2.5]" />
            </div>
            <div className="text-sm font-bold">
              تنبيه صلاحية: يوجد {expiringSoonItems.length} صنف تقترب صلاحيتها من الانتهاء (أقل من 30 يوماً).
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-500 group-hover:translate-x-[-4px] transition-transform">
            عرض التفاصيل &larr;
          </span>
        </button>
      )}

      {/* Stats Grid (Dynamic Selection) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Suppliers Card */}
        {dashboardStatsConfig.showSuppliers !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-purple-50 text-purple-600 p-3.5 rounded-2xl mb-3.5">
              <Users size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">الموردون</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalSuppliers}</p>
          </div>
        )}

        {/* Items Card */}
        {dashboardStatsConfig.showItems !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl mb-3.5">
              <Box size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">الأصناف</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalItems}</p>
          </div>
        )}

        {/* Total Outward Card */}
        {dashboardStatsConfig.showTotalOutward !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-orange-50 text-orange-600 p-3.5 rounded-2xl mb-3.5">
              <ArrowUpRight size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">إجمالي الصرف</p>
            <p className="text-2xl font-black text-orange-600 mt-1">{totalOutward}</p>
          </div>
        )}

        {/* Total Inward Card */}
        {dashboardStatsConfig.showTotalInward !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl mb-3.5">
              <ArrowDownLeft size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">إجمالي الوارد</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalInward}</p>
          </div>
        )}

        {/* Total Stock Value Card */}
        {dashboardStatsConfig.showTotalValue !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl mb-3.5">
              <DollarSign size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">قيمة المخزون</p>
            <p className="text-2xl font-black text-blue-700 mt-1 truncate max-w-full px-1">{totalStockValue.toLocaleString()} ر.س</p>
          </div>
        )}

        {/* Daily Movements Card */}
        {dashboardStatsConfig.showDailyMovements !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl mb-3.5">
              <Calendar size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">الحركات اليومية</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{dailyMovementCount}</p>
          </div>
        )}

        {/* Low Stock Items Card */}
        {dashboardStatsConfig.showLowStock !== false && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <div className="bg-rose-50 text-rose-600 p-3.5 rounded-2xl mb-3.5">
              <AlertCircle size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-slate-400 font-bold text-xs">منخفض المخزون</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{shortCount}</p>
          </div>
        )}

      </div>

      {/* Settings & Backup Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-50">
          <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
            <Database size={18} className="stroke-[2.5]" />
          </div>
          <div className="text-right">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">إعدادات وإدارة البيانات</h3>
            <p className="text-[11px] text-slate-400 font-semibold">تصدير واستيراد النسخ الاحتياطية للمستودع والعمل بدون إنترنت</p>
          </div>
        </div>

        {/* Lock Data / Read-Only Mode Switch */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${isDataLocked ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors ${isDataLocked ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse-subtle' : 'bg-white border border-slate-200 text-slate-400'}`}>
              {isDataLocked ? <Lock size={18} className="stroke-[2.5]" /> : <Unlock size={18} className="stroke-[2.5]" />}
            </div>
            <div className="text-right">
              <span className="font-extrabold text-xs text-slate-800 block">قفل البيانات (وضع القراءة فقط)</span>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">يمنع التعديل أو الحذف أو الإضافة عن طريق الخطأ</span>
            </div>
          </div>
          <button
            onClick={() => {
              onToggleLock(!isDataLocked);
              setToast({
                message: !isDataLocked ? 'تم تفعيل وضع القراءة فقط وقفل البيانات بنجاح 🔒' : 'تم إلغاء قفل البيانات، وضع التعديل نشط الآن 🔓',
                type: 'success'
              });
            }}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer ${isDataLocked ? 'bg-amber-500' : 'bg-slate-300'}`}
          >
            <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-xs transition-all duration-300 transform ${isDataLocked ? '-translate-x-5.5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-slate-700 hover:text-blue-700 font-extrabold text-xs py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <Download size={16} className="text-blue-500 stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span>تصدير البيانات (JSON)</span>
          </button>

          {/* Import Button */}
          {isDataLocked ? (
            <div
              onClick={() => setToast({ message: '⚠️ يرجى إلغاء "قفل البيانات" أولاً لتتمكن من استيراد نسخة احتياطية.', type: 'error' })}
              className="bg-slate-100 text-slate-400 border border-slate-200 font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60 text-center"
            >
              <Upload size={16} className="stroke-[2.5]" />
              <span>استيراد البيانات مقفل</span>
            </div>
          ) : (
            <label
              className="bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-extrabold text-xs py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer group text-center"
            >
              <Upload size={16} className="text-emerald-500 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span>استيراد واستعادة البيانات</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isDataLocked}
              />
            </label>
          )}
        </div>

        {/* Clear Data Option (Safe with custom modal) */}
        <div className="text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-50">
          <span>حجم البيانات الحالي: {JSON.stringify({ items, movements, suppliers }).length} بايت</span>
          {isDataLocked ? (
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Lock size={12} />
              <span>إعادة تعيين البيانات معطلة (مقفل)</span>
            </span>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-red-500 hover:text-red-700 font-bold hover:underline transition-all cursor-pointer text-right flex items-center gap-1"
            >
              <Trash2 size={12} />
              <span>مسح كافة البيانات وإعادة التعيين</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stock Section (الجرد السريع) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800">الجرد السريع</h3>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            عرض الجرد الكامل
          </button>
        </div>

        <div className="space-y-3">
          {itemStockStats.map((item) => (
            <div
              key={item.id}
              className={`border p-5 rounded-3xl flex items-center justify-between gap-4 transition-all bg-white hover:border-slate-300 ${
                item.isUnderSafetyLimit ? 'border-r-4 border-r-red-500 border-slate-100' : 'border-r-4 border-r-emerald-500 border-slate-100'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  {item.isUnderSafetyLimit && (
                    <AlertCircle size={16} className="text-red-500 animate-pulse shrink-0" />
                  )}
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate">{item.name}</h4>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">
                    {item.id}
                  </span>
                  {item.isUnderSafetyLimit && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 rounded-full">
                      منخفض المخزون
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  وارد: <strong className="text-slate-700">{item.inward}</strong> | صرف: <strong className="text-slate-700">{item.outward}</strong> | حد الأمان: <strong className="text-slate-700">{item.safetyLimit}</strong>
                </p>
                {/* Horizontal Progress bar for visual fidelity */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.isUnderSafetyLimit ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, item.inward > 0 ? (item.balance / item.inward) * 100 : 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* Large stock indicator */}
              <div className="text-left shrink-0">
                <span className="text-2xl font-black text-slate-800 block">{item.balance}</span>
                <span className="text-[11px] font-bold text-slate-400 block mt-0.5">رصيد</span>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm p-4 rounded-2xl shadow-xl border flex items-center gap-3 z-50 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`} style={{ direction: 'rtl' }}>
          <div className={`p-1.5 rounded-lg ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </div>
          <p className="text-xs font-black flex-1 text-right">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Custom Reset Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4 text-right">
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl w-fit">
              <AlertCircle size={24} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-base">مسح وإعادة تعيين المستودع؟</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                سيتم حذف كافة الأصناف الحالية والحركات والبيانات المسجلة، وإعادتها للحالة الافتراضية. هذا الإجراء لا يمكن التراجع عنه!
              </p>
            </div>
            
            <div className="space-y-2 pt-1">
              <label className="block text-[10px] font-black text-slate-500">كلمة المرور لتأكيد الهوية والمسح *</label>
              <input
                type="password"
                placeholder="أدخل كلمة مرور حسابك للتأكيد"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-3 rounded-xl font-mono text-right outline-hidden focus:border-red-500 focus:bg-white"
              />
              {passwordError && (
                <p className="text-[10px] text-red-500 font-bold">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                disabled={isResetting}
                onClick={async () => {
                  if (!confirmPassword) {
                    setPasswordError('يرجى إدخال كلمة المرور للتأكيد');
                    return;
                  }
                  setIsResetting(true);
                  setPasswordError(null);
                  try {
                    const response = await fetch('/api/auth/verify-reset', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username: currentUser.username, password: confirmPassword })
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                      onResetData();
                      setShowConfirmReset(false);
                      setConfirmPassword('');
                      setToast({ message: 'تم مسح البيانات وإعادة تعيين المستودع بنجاح.', type: 'success' });
                    } else {
                      setPasswordError(data.error || 'كلمة المرور غير صحيحة للتأكيد');
                    }
                  } catch (err) {
                    setPasswordError('خطأ في الاتصال بالخادم للتأكيد');
                  } finally {
                    setIsResetting(false);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {isResetting ? 'جاري التحقق...' : 'نعم، احذف وأعد التعيين'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmReset(false);
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
