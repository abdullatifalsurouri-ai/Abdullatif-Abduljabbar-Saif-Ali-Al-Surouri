import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, User as UserIcon, AlertCircle, RefreshCw, Globe, Share2, Check, Users, Smartphone, ArrowDownToLine, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  currentLanguage: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
}

export default function LoginView({ onLoginSuccess, currentLanguage, onLanguageChange }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
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

  // Silently pre-fetch and cache users list for offline availability and public display
  useEffect(() => {
    const cacheUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('wms_cached_users', JSON.stringify(data));
          setAvailableUsers(data);
        } else {
          // fallback to localStorage cache
          const cachedUsersStr = localStorage.getItem('wms_cached_users');
          if (cachedUsersStr) {
            setAvailableUsers(JSON.parse(cachedUsersStr));
          }
        }
      } catch (err) {
        console.warn('Unable to sync users list for offline use, using existing cache:', err);
        const cachedUsersStr = localStorage.getItem('wms_cached_users');
        if (cachedUsersStr) {
          try {
            setAvailableUsers(JSON.parse(cachedUsersStr));
          } catch (e) {}
        }
      }
    };
    cacheUsers();
  }, []);

  const getDeviceId = () => {
    let devId = localStorage.getItem('wms_device_id');
    if (!devId) {
      devId = 'device-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
      localStorage.setItem('wms_device_id', devId);
    }
    return devId;
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const t = {
    ar: {
      title: 'مستودع المدى الذكي',
      sub: 'بوابة تسجيل الدخول الآمن للمستودع والتوثيق السحابي',
      cardTitle: 'المصادقة الأمنية',
      cardSub: 'نظام الـ WMS المتقدم',
      userLabel: 'اسم المستخدم',
      userPlaceholder: 'أدخل اسم المستخدم (مثال: admin)',
      passLabel: 'كلمة المرور السرية',
      passPlaceholder: 'أدخل رمز المرور السري',
      loginBtnLoading: 'يرجى الانتظار، جاري التحقق...',
      loginBtn: 'دخول آمن للنظام وتزامن البيانات',
      footer: '© ٢٠٢٦ مستودع المدى الذكي WMS. جميع الحقوق محفوظة للمهندس عبداللطيف السروري.',
      emptyError: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      offlineError: 'تم تسجيل الدخول محلياً (وضع أوفلاين) - تعذر الاتصال بالخادم السحابي.',
      invalidError: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      shareBtn: 'مشاركة التطبيق ودعوة الآخرين 🔗',
      shareCopiedText: 'تم نسخ رابط التطبيق بنجاح! جاهز للمشاركة 🚀',
      publicAccessTitle: 'المستخدمين النشطين (الدخول العام السريع) 🌐',
      publicAccessSub: 'اختر أي حساب للدخول المباشر واختبار مميزات النظام:',
    },
    en: {
      title: 'Al-Mada Smart WMS',
      sub: 'Secure login gate for warehouse management & cloud synchronization',
      cardTitle: 'Security Authentication',
      cardSub: 'Advanced WMS System',
      userLabel: 'Username',
      userPlaceholder: 'Enter username (e.g., admin)',
      passLabel: 'Secret Password',
      passPlaceholder: 'Enter your secret password',
      loginBtnLoading: 'Please wait, verifying...',
      loginBtn: 'Secure Log In & Data Sync',
      footer: '© 2026 Al-Mada Smart WMS. All rights reserved to Eng. Abdullatif Alsurouri.',
      emptyError: 'Please enter both username and password',
      offlineError: 'Logged in locally (Offline mode) - Could not contact cloud server.',
      invalidError: 'Incorrect username or password',
      shareBtn: 'Share App & Invite Others 🔗',
      shareCopiedText: 'App link copied to clipboard! Ready to share 🚀',
      publicAccessTitle: 'Public Entry Accounts 🌐',
      publicAccessSub: 'Select any user to auto-fill credentials & log in instantly:',
    },
  }[currentLanguage];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError(t.emptyError);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Try server-side authentication with deviceId support
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password, deviceId: getDeviceId() }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || t.invalidError);
      } else {
        // Successful online login -> cache the logged-in user
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.warn('Network issue or server offline. Checking local cache...', err);
      
      // 2. Fallback to Local Authentication (Offline support)
      const cachedUsersStr = localStorage.getItem('wms_cached_users');
      if (cachedUsersStr) {
        try {
          const cachedUsers = JSON.parse(cachedUsersStr);
          const matchedUser = cachedUsers.find(
            (u: any) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password === password
          );

          if (matchedUser) {
            // Successful offline login!
            const safeUser: User = {
              username: matchedUser.username,
              role: matchedUser.role,
              permissions: matchedUser.permissions,
            };
            onLoginSuccess(safeUser);
            return;
          }
        } catch (jsonErr) {
          console.error('Error parsing cached users list:', jsonErr);
        }
      }

      // If no match was found locally or local storage is empty
      setError(t.invalidError + ' (أوفلاين - لا توجد بيانات مسجلة مسبقاً)');
    } finally {
      setIsLoading(false);
    }
  };

  const selectPublicUser = (user: any) => {
    setUsername(user.username);
    setPassword(user.password || '');
    setError(null);
  };

  const isRtl = currentLanguage === 'ar';

  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 font-sans relative overflow-hidden selection:bg-blue-500/30 selection:text-blue-300`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Language Toggle & Share Button in separate corners */}
      <div className={`absolute top-6 ${isRtl ? 'right-6' : 'left-6'} z-50`}>
        <button
          onClick={handleCopyShareLink}
          className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 p-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black shadow-md"
          title={t.shareBtn}
        >
          {shareCopied ? <Check size={13} className="text-emerald-400 animate-bounce" /> : <Share2 size={13} className="text-emerald-400" />}
          <span>{shareCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'مشاركة التطبيق 🔗' : 'Share App 🔗')}</span>
        </button>
      </div>

      <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-50`}>
        <button
          onClick={() => onLanguageChange(currentLanguage === 'ar' ? 'en' : 'ar')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 p-2.5 px-4 rounded-2xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-lg"
          title={isRtl ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}
        >
          <Globe size={16} className="stroke-[2.5] text-blue-400" />
          <span className="uppercase tracking-wider">{isRtl ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* Dynamic Grid Background Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10 space-y-6 animate-fade-in">
        {/* Title and Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-3.5 rounded-3xl shadow-xl shadow-blue-500/10 border border-blue-400/20 hover:scale-105 transition-all">
            <Shield size={32} className="stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{t.title}</h1>
            <p className="text-slate-400 text-xs font-bold">{t.sub}</p>
          </div>
        </div>

        {/* Share Banner Alert */}
        {shareCopied && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold p-4 rounded-2xl text-center animate-bounce shadow-lg">
            {t.shareCopiedText}
          </div>
        )}

        {/* Login Form Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-7 space-y-6">
          <div className={`flex items-center justify-between border-b border-slate-800 pb-4`}>
            <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{t.cardTitle}</span>
            <span className="text-[10px] text-slate-500 font-bold">{t.cardSub}</span>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold p-3.5 rounded-2xl flex items-start gap-2.5 animate-slide-down">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span className={`leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-black text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{t.userLabel}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-500`}>
                  <UserIcon size={16} className="stroke-[2]" />
                </div>
                <input
                  type="text"
                  required
                  placeholder={t.userPlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs px-4 py-3.5 rounded-2xl outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-bold ${
                    isRtl ? 'pr-10.5 text-right' : 'pl-10.5 text-left'
                  }`}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-black text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{t.passLabel}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-500`}>
                  <KeyRound size={16} className="stroke-[2]" />
                </div>
                <input
                  type="password"
                  required
                  placeholder={t.passPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs px-4 py-3.5 rounded-2xl outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono ${
                    isRtl ? 'pr-10.5 text-right' : 'pl-10.5 text-left'
                  }`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white text-xs font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:scale-100"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{t.loginBtnLoading}</span>
                </>
              ) : (
                <span>{t.loginBtn}</span>
              )}
            </button>
          </form>

          {/* Quick entry / public testing selector */}
          {availableUsers.filter(u => u.username.toLowerCase() !== 'owner').length > 0 && (
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Users size={14} className="stroke-[2.5]" />
                <span className="text-[11px] font-black uppercase tracking-wider">{t.publicAccessTitle}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{t.publicAccessSub}</p>
              
              <div className="grid grid-cols-2 gap-2">
                {availableUsers.filter(u => u.username.toLowerCase() !== 'owner').map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => selectPublicUser(user)}
                    className={`p-2.5 rounded-xl border transition-all text-right cursor-pointer flex flex-col justify-between ${
                      username === user.username
                        ? 'bg-blue-600/15 border-blue-500/50 text-blue-300'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[11px] font-black">{user.username}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1">
                      {currentLanguage === 'ar' ? 'صلاحية:' : 'Role:'} {user.role}
                    </span>
                    {user.maxDevices && (
                      <span className="text-[8px] font-medium text-slate-600 mt-0.5">
                        {currentLanguage === 'ar' ? `الأجهزة: ${user.maxDevices}` : `Devices: ${user.maxDevices}`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PWA Install Guide Card */}
        <div className="bg-slate-900/60 border border-slate-800/60 backdrop-blur-md rounded-3xl p-5 space-y-3.5 text-right">
          <div className="flex items-center gap-2.5 text-blue-400">
            <Smartphone size={18} className="stroke-[2.5]" />
            <h3 className="font-extrabold text-xs text-slate-200">
              {isRtl ? 'كيف تشارك أو تستخدم التطبيق كأيقونة؟ 📱' : 'How to use or share the app as an icon? 📱'}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            {isRtl 
              ? 'بما أن هذا تطبيق ويب ذكي متطور (PWA)، يمكنك تثبيته مباشرة على شاشة جوالك كأيقونة تطبيق كاملة ومستقلة دون الحاجة لمتجر التطبيقات!' 
              : 'Since this is a smart progressive web app (PWA), you can install it directly on your home screen as a full, independent app icon without needing any App Store!'}
          </p>

          <div className="flex gap-2">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] py-2.5 px-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowDownToLine size={13} className="stroke-[2.5]" />
                <span>{isRtl ? 'تثبيت كأيقونة الآن' : 'Install as Icon Now'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold text-[10px] py-2.5 px-3 rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Info size={13} />
              <span>{isRtl ? 'شرح طريقة التثبيت بالتفصيل' : 'Detailed Installation Guide'}</span>
              {showInstructions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {showInstructions && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3 text-[10px] text-slate-400 font-semibold leading-relaxed animate-fade-in">
              <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/40 space-y-2.5">
                {/* iOS instructions */}
                <div className="space-y-1">
                  <span className="font-extrabold text-blue-400 flex items-center gap-1">
                    🍏 هواتف آيفون (iPhone / Safari):
                  </span>
                  <p className="text-slate-500 pr-1 text-[9px]">
                    افتح الرابط في متصفح <strong className="text-slate-300 font-extrabold">Safari</strong> 👈 اضغط على زر <strong className="text-slate-300 font-extrabold">"مشاركة" (المربع مع السهم)</strong> 👈 اختر <strong className="text-slate-300 font-extrabold">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</strong>.
                  </p>
                </div>

                {/* Android instructions */}
                <div className="space-y-1 border-t border-slate-800/60 pt-2.5">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                    🤖 هواتف أندرويد (Android / Chrome):
                  </span>
                  <p className="text-slate-500 pr-1 text-[9px]">
                    افتح الرابط في متصفح <strong className="text-slate-300 font-extrabold">Chrome</strong> 👈 اضغط على زر <strong className="text-slate-300 font-extrabold">الثلاث نقاط (⋮)</strong> في الأعلى 👈 اختر <strong className="text-slate-300 font-extrabold">"إضافة إلى الشاشة الرئيسية"</strong> أو <strong className="text-slate-300 font-extrabold">"تثبيت التطبيق"</strong>.
                  </p>
                </div>

                {/* PC/Desktop instructions */}
                <div className="space-y-1 border-t border-slate-800/60 pt-2.5">
                  <span className="font-extrabold text-indigo-400 flex items-center gap-1">
                    💻 أجهزة الكمبيوتر (Desktop / Chrome):
                  </span>
                  <p className="text-slate-500 pr-1 text-[9px]">
                    اضغط على أيقونة <strong className="text-slate-300 font-extrabold">الشاشة مع السهم</strong> في شريط العناوين بالأعلى 👈 اختر <strong className="text-slate-300 font-extrabold">"تثبيت" (Install)</strong> لتثبيته كبرنامج مستقل على سطح المكتب.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-600 font-bold text-center">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
