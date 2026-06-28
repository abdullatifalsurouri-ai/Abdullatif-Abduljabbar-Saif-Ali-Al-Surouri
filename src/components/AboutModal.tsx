import React from 'react';
import { X, Info, ShieldCheck, Cpu, Layers, HardDrive, Smartphone, Award, Sparkles, Receipt, Laptop, Tablet, CheckCircle, TrendingUp, Search, DollarSign, FileSpreadsheet } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: 'ar' | 'en';
  isDarkMode?: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, currentLanguage, isDarkMode = false }) => {
  if (!isOpen) return null;

  const isRtl = currentLanguage === 'ar';

  const t = {
    title: isRtl ? 'حول التطبيق' : 'About App',
    subtitle: isRtl ? 'نظام مستودع المدى الذكي' : 'Al-Mada Smart WMS',
    developerLabel: isRtl ? 'مطور النظام' : 'Developer',
    developerName: isRtl ? 'المهندس عبداللطيف عبدالجبار السروري' : 'Eng. Abdullatif Abduljabbar Alsurouri',
    versionLabel: isRtl ? 'الإصدار' : 'Version',
    versionValue: 'v3.5.0 (2026)',
    techLabel: isRtl ? 'التقنيات المستخدمة' : 'Technologies Used',
    techValue: 'React 18, TypeScript, Tailwind CSS, Local Storage, Cloud Sync',
    platformLabel: isRtl ? 'التوافقية والتشغيل' : 'Compatibility',
    platformValue: isRtl ? 'متوافق بالكامل مع الهواتف الذكية، الأجهزة اللوحية (iPad)، وأجهزة اللابتوب والكمبيوتر الشخصي' : 'Fully compatible with smartphones, tablets (iPad), laptops, and desktop PCs',
    
    featuresTitle: isRtl ? 'أبرز مميزات النظام ⚡' : 'Key System Features ⚡',
    basicDataTitle: isRtl ? 'البيانات الأساسية والنظام 📋' : 'Basic System Data 📋',
    
    copyright: isRtl 
      ? '© 2026 جميع الحقوق محفوظة – المهندس عبداللطيف عبدالجبار السروري.'
      : '© 2026 All Rights Reserved – Eng. Abdullatif Abduljabbar Alsurouri.',

    features: [
      {
        icon: <Layers size={16} className="text-blue-500" />,
        title: isRtl ? 'إدارة المخزون الذكية والمخازن' : 'Smart Multi-Warehouse Stock',
        desc: isRtl ? 'تتبع دقيق للأصناف والمستودعات والتحويلات المخزنية والكميات المتوفرة مع إحصائيات فورية لكل مستودع.' : 'Precise tracking of items, multi-warehouses, stock transfers, and balances with real-time stats.'
      },
      {
        icon: <DollarSign size={16} className="text-emerald-500" />,
        title: isRtl ? 'دعم العملات المتعددة' : 'Multi-Currency Support',
        desc: isRtl ? 'إدخال وعرض أسعار الأصناف بالعملات المختلفة (ر.س، ر.ي، دولار) وحساب قيم المخزون بدقة.' : 'Configure and view item prices in various currencies (SAR, YER, USD) with accurate balance calculations.'
      },
      {
        icon: <TrendingUp size={16} className="text-indigo-500" />,
        title: isRtl ? 'رسوم بيانية وتحليلات' : 'Analytics & Trend Charts',
        desc: isRtl ? 'مخطط بياني تفاعلي لآخر 7 أيام لتتبع حجم حركة الصرف والوارد، وتحليل أصناف المستودع الأكثر نشاطاً.' : 'Interactive 7-day volume trend charts for inbound/outbound movements, plus active items analysis.'
      },
      {
        icon: <Search size={16} className="text-sky-500" />,
        title: isRtl ? 'البحث الذكي والتنبيه الفوري' : 'Smart Search & Alerts',
        desc: isRtl ? 'تصفية فورية للأصناف وتنبيهات بصرية ملونة عند بلوغ الحد الأدنى للأمان لمنع نقص المخزون.' : 'Instant item filtering by multiple parameters, with low-stock visual warning badges based on safety limits.'
      },
      {
        icon: <FileSpreadsheet size={16} className="text-emerald-600" />,
        title: isRtl ? 'استيراد وتصدير البيانات (CSV)' : 'CSV Import & Export',
        desc: isRtl ? 'إمكانية رفع قوائم أصناف كاملة بلمحة عين عبر ملفات CSV، وتصدير التقارير لتسهيل العمل المكتبي.' : 'Upload complete item lists instantly using CSV files, and export data spreadsheets in one click.'
      },
      {
        icon: <ShieldCheck size={16} className="text-emerald-500" />,
        title: isRtl ? 'التوثيق البصري بالكاميرا' : 'Visual Camera Documentation',
        desc: isRtl ? 'التقاط وتوثيق صور القطع والمنتجات فورا عند الوارد أو الصرف للحد من الاختلالات.' : 'Instant capturing and saving of item photos during inbound or outbound transfers.'
      },
      {
        icon: <Cpu size={16} className="text-purple-500" />,
        title: isRtl ? 'فحص الباركود الذكي' : 'Smart Barcode Scanner',
        desc: isRtl ? 'استخدام كاميرا الجهاز كقارئ باركود متكامل للبحث عن القطع وإدخالها بسرعة فائقة.' : 'Turn your device camera into a high-speed barcode reader for quick item scanning.'
      },
      {
        icon: <HardDrive size={16} className="text-amber-500" />,
        title: isRtl ? 'وضع العمل بدون إنترنت' : 'Offline-first & Cloud Sync',
        desc: isRtl ? 'مزامنة ذكية وتلقائية مع التخزين السحابي فور عودة الاتصال لضمان استمرارية العمل لمدى الحياة.' : 'Seamless local storage with automated cloud syncing when connection is restored.'
      },
      {
        icon: <Smartphone size={16} className="text-pink-500" />,
        title: isRtl ? 'تصميم مرن لجميع الأجهزة' : 'Cross-Device Responsiveness',
        desc: isRtl ? 'ملاءمة مثالية لجميع الشاشات من لابتوب، أجهزة آيباد، وجوالات مع دعم تثبيت التطبيق كـ PWA.' : 'Optimized layout for laptops, iPads, and mobile phones, with progressive web app (PWA) installation.'
      },
      {
        icon: <Receipt size={16} className="text-teal-500" />,
        title: isRtl ? 'سندات وطباعة فورية' : 'Instant Vouchers & Printing',
        desc: isRtl ? 'إصدار وطباعة فواتير الحركات وسندات الوارد والصرف بتصميم احترافي ومنسق.' : 'Generate and print high-quality professional vouchers and inventory reports.'
      }
    ],

    closeBtn: isRtl ? 'إغلاق النافذة' : 'Close Window'
  };

  return (
    <div 
      className={`fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-fade-in ${isDarkMode ? 'dark' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-2xl rounded-3xl shadow-2xl text-right overflow-hidden flex flex-col max-h-[90vh] animate-scale-up border ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-850">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-2xl border border-blue-500/10">
              <Info size={22} className="stroke-[2.5]" />
            </div>
            <div className="text-right">
              <h3 className="font-black text-base">{t.title}</h3>
              <p className="text-xs text-slate-400 font-bold">{t.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Content */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          
          {/* Logo & Intro Section */}
          <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-center gap-5 text-right ${
            isDarkMode 
              ? 'bg-gradient-to-br from-slate-850 to-slate-900/50 border-slate-800' 
              : 'bg-gradient-to-br from-blue-50/50 to-indigo-50/20 border-blue-100/50'
          }`}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-5 rounded-3xl shadow-lg relative flex-shrink-0">
              <Award size={40} className="stroke-[1.5]" />
              <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full animate-pulse">
                <Sparkles size={14} />
              </div>
            </div>
            
            <div className="space-y-2 flex-1 w-full text-center md:text-right">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h4 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isRtl ? 'مستودع المدى الذكي المتكامل' : 'Al-Mada Smart WMS'}
                </h4>
                <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full self-center ${
                  isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}>
                  {t.versionValue}
                </span>
              </div>
              <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                {isRtl 
                  ? 'منصة برمجية رائدة لإدارة وتتبع حركات القطع والمواد المخزنية، تم تصميمها وهندستها لتوفير السرعة الفائقة والتوثيق التام للأمان والموثوقية.'
                  : 'A pioneering software platform for tracking and managing warehouse items, designed to provide ultra-speed and full visual documentation.'}
              </p>
            </div>
          </div>

          {/* Core System Features */}
          <div className="space-y-3.5">
            <h4 className={`font-black text-xs tracking-wide uppercase flex items-center gap-1.5 justify-start ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              <span>{t.featuresTitle}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {t.features.map((feat, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3 text-right ${
                    isDarkMode 
                      ? 'bg-slate-850 border-slate-800/85 hover:border-slate-700 hover:bg-slate-800 text-white' 
                      : 'bg-slate-50/50 border-slate-100 hover:border-blue-200 hover:bg-white text-slate-850'
                  }`}
                >
                  <div className={`shadow-3xs flex-shrink-0 mt-0.5 border p-2 rounded-xl ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  }`}>
                    {feat.icon}
                  </div>
                  <div className="space-y-1">
                    <h5 className={`font-extrabold text-xs ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{feat.title}</h5>
                    <p className={`text-[10px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Data Card */}
          <div className="space-y-3">
            <h4 className={`font-black text-xs tracking-wide uppercase flex items-center gap-1.5 justify-start ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              <span>{t.basicDataTitle}</span>
            </h4>
            <div className={`border rounded-2xl p-4 divide-y transition-all ${
              isDarkMode ? 'bg-slate-850 border-slate-800/80 divide-slate-800 text-white' : 'bg-slate-50 border-slate-100 divide-slate-150 text-slate-800'
            }`}>
              {/* Row 1: Developer */}
              <div className="py-2.5 flex items-center justify-between text-xs font-bold">
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-500'}>{t.developerLabel}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`font-black text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.developerName}</span>
                  <span className={`text-[10px] font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} dir="ltr">
                    {isRtl ? 'للتواصل: 775104368' : 'Contact: 775104368'}
                  </span>
                </div>
              </div>
              {/* Row 2: Tech stack */}
              <div className="py-2.5 flex items-center justify-between text-xs font-bold">
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-500'}>{t.techLabel}</span>
                <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.techValue}</span>
              </div>
              {/* Row 3: Device compatibility */}
              <div className="py-2.5 flex flex-col gap-1.5 text-xs font-bold">
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-500'}>{t.platformLabel}</span>
                <div className={`flex items-center gap-2 text-[10px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Laptop size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                  <Tablet size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                  <Smartphone size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                  <span>{t.platformValue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantee stamp */}
          <div className={`border rounded-2xl p-3.5 flex items-center gap-3 justify-center ${
            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-600'
          }`}>
            <CheckCircle size={18} className="flex-shrink-0" />
            <span className="text-[10px] font-black leading-relaxed text-center">
              {isRtl 
                ? 'النظام مرخص ويعمل بكفاءة عالية على الهواتف والكمبيوتر والأجهزة اللوحية دون انقطاع.' 
                : 'The system is licensed and runs with high efficiency across PCs, tablets, and phones.'}
            </span>
          </div>

        </div>

        {/* Modal Footer with the REQUIRED Copyright text */}
        <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-850">
          <p className="text-[10px] text-slate-400 font-extrabold text-center sm:text-right leading-relaxed">
            {t.copyright}
          </p>
          <button 
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] py-2 px-5 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/20"
          >
            {t.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
};
