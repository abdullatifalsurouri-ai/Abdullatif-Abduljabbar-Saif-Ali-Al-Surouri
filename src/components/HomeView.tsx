import { useState, useEffect } from 'react';
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
  Info 
} from 'lucide-react';
import { Item, Movement, Supplier } from '../types';

interface HomeViewProps {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
  onNavigate: (tab: 'inventory' | 'items' | 'movements' | 'report' | 'print') => void;
  onOpenSuppliers: () => void;
}

export default function HomeView({
  items,
  movements,
  suppliers,
  onNavigate,
  onOpenSuppliers,
}: HomeViewProps) {
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    return localStorage.getItem('hide_install_banner') !== 'true';
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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

      {/* Stats Grid (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Suppliers Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
          <div className="bg-purple-50 text-purple-600 p-3.5 rounded-2xl mb-3.5">
            <Users size={24} className="stroke-[2.5]" />
          </div>
          <p className="text-slate-400 font-bold text-xs">الموردون</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalSuppliers}</p>
        </div>

        {/* Items Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl mb-3.5">
            <Box size={24} className="stroke-[2.5]" />
          </div>
          <p className="text-slate-400 font-bold text-xs">الأصناف</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalItems}</p>
        </div>

        {/* Total Outward Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
          <div className="bg-orange-50 text-orange-600 p-3.5 rounded-2xl mb-3.5">
            <ArrowUpRight size={24} className="stroke-[2.5]" />
          </div>
          <p className="text-slate-400 font-bold text-xs">إجمالي الصرف</p>
          <p className="text-2xl font-black text-orange-600 mt-1">{totalOutward}</p>
        </div>

        {/* Total Inward Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl mb-3.5">
            <ArrowDownLeft size={24} className="stroke-[2.5]" />
          </div>
          <p className="text-slate-400 font-bold text-xs">إجمالي الوارد</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{totalInward}</p>
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

    </div>
  );
}
