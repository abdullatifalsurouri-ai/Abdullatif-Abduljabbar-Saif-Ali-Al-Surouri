import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, User as UserIcon, AlertCircle, RefreshCw, Globe, Share2, Check, Users, Smartphone, ArrowDownToLine, Info, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { User } from '../types';
import { AboutModal } from './AboutModal';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  currentLanguage: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function LoginView({ onLoginSuccess, currentLanguage, onLanguageChange, isDarkMode, onToggleDarkMode }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

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
      footer: '© 2026 جميع الحقوق محفوظة – المهندس عبداللطيف عبدالجبار السروري.',
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
      footer: '© 2026 All Rights Reserved – Eng. Abdullatif Abduljabbar Alsurouri.',
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
    const trimmedPassword = password.trim();
    if (!trimmedUser || !trimmedPassword) {
      setError(t.emptyError);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Try server-side authentication with deviceId support
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPassword, deviceId: getDeviceId() }),
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
            (u: any) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password.trim() === trimmedPassword
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 selection:bg-blue-500/30 selection:text-blue-300 dark' : 'bg-slate-50 text-slate-850 selection:bg-blue-500/10 selection:text-blue-800'} flex flex-col justify-center items-center px-4 py-12 font-sans relative overflow-hidden transition-colors duration-200`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Positioned top action elements (Right: Share, Center: About, Left: Language and Dark mode) - raised slightly to top-4 to clear the logo */}
      {/* Top Right: Share App */}
      <div className="absolute top-4 right-4 sm:right-6 z-50">
        <button
          onClick={handleCopyShareLink}
          className={`${isDarkMode ? 'bg-emerald-950/85 hover:bg-emerald-900 text-emerald-400 border-emerald-800/60' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'} p-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border shadow-md hover:scale-[1.02] active:scale-[0.98]`}
          title={t.shareBtn}
        >
          {shareCopied ? <Check size={13} className="text-emerald-400 animate-bounce" /> : <Share2 size={13} />}
          <span>{shareCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'مشاركة التطبيق' : 'Share App')}</span>
        </button>
      </div>

      {/* Top Center: About App */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setShowAboutModal(true)}
          className={`${isDarkMode ? 'bg-blue-950/85 hover:bg-blue-900 text-blue-400 border-blue-800/60' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'} p-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap animate-pulse`}
          title={isRtl ? 'حول التطبيق ومميزاته' : 'About App & Features'}
        >
          <Info size={13} />
          <span>{isRtl ? 'حول التطبيق' : 'About App'}</span>
        </button>
      </div>

      {/* Top Left: Language and Dark Mode Toggle */}
      <div className="absolute top-4 left-4 sm:left-6 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className={`${isDarkMode ? 'bg-slate-900/90 text-amber-400 border-slate-800/60 hover:bg-slate-800' : 'bg-white text-amber-500 border-slate-200 hover:bg-slate-100'} border p-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]`}
          title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <button
          type="button"
          onClick={() => onLanguageChange(currentLanguage === 'ar' ? 'en' : 'ar')}
          className={`${isDarkMode ? 'bg-slate-900/90 text-slate-300 border-slate-800/60 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'} border p-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]`}
          title={isRtl ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}
        >
          <Globe size={13} className="text-blue-500" />
          <span className="uppercase tracking-wider">{isRtl ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* Dynamic Grid Background Accent */}
      <div className={`absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 ${
        isDarkMode 
          ? 'bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)]' 
          : 'bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]'
      }`}></div>
      
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
            <h1 className={`text-2xl font-black tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
            <p className={`text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.sub}</p>
          </div>
        </div>

        {/* Share Banner Alert */}
        {shareCopied && (
          <div className={`border text-xs font-bold p-4 rounded-2xl text-center animate-bounce shadow-lg ${
            isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {t.shareCopiedText}
          </div>
        )}

        {/* Login Form Card */}
        <div className={`p-7 space-y-6 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-200 border ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80'
        }`}>
          <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{t.cardTitle}</span>
            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.cardSub}</span>
          </div>

          {error && (
            <div className={`border text-xs font-bold p-3.5 rounded-2xl flex items-start gap-2.5 animate-slide-down ${
              isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-750'
            }`}>
              <AlertCircle size={16} className={`shrink-0 mt-0.5 ${isDarkMode ? 'text-rose-400' : 'text-rose-500'}`} />
              <span className={`leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} ${isRtl ? 'text-right' : 'text-left'}`}>{t.userLabel}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <UserIcon size={16} className="stroke-[2]" />
                </div>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="username"
                  placeholder={t.userPlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full border text-xs px-4 py-3.5 rounded-2xl outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-bold ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-650' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  } ${isRtl ? 'pr-10.5 text-right' : 'pl-10.5 text-left'}`}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} ${isRtl ? 'text-right' : 'text-left'}`}>{t.passLabel}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <KeyRound size={16} className="stroke-[2]" />
                </div>
                <input
                  type="password"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="current-password"
                  placeholder={t.passPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full border text-xs px-4 py-3.5 rounded-2xl outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-650' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  } ${isRtl ? 'pr-10.5 text-right' : 'pl-10.5 text-left'}`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white text-xs font-black py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 ${
                isDarkMode ? 'shadow-blue-600/10' : 'shadow-blue-600/20'
              }`}
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
            <div className={`border-t pt-5 space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className={`flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <Users size={14} className="stroke-[2.5]" />
                <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{t.publicAccessTitle}</span>
              </div>
              <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.publicAccessSub}</p>
              
              <div className="grid grid-cols-2 gap-2">
                {availableUsers.filter(u => u.username.toLowerCase() !== 'owner').map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => selectPublicUser(user)}
                    className={`p-2.5 rounded-xl border transition-all text-right cursor-pointer flex flex-col justify-between ${
                      username === user.username
                        ? isDarkMode 
                          ? 'bg-blue-600/15 border-blue-500/50 text-blue-300' 
                          : 'bg-blue-50 border-blue-500/40 text-blue-700'
                        : isDarkMode 
                          ? 'bg-slate-950 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <span className="text-[11px] font-black">{user.username}</span>
                    <span className={`text-[9px] font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {currentLanguage === 'ar' ? 'صلاحية:' : 'Role:'} {user.role}
                    </span>
                    {user.maxDevices && (
                      <span className={`text-[8px] font-medium mt-0.5 ${isDarkMode ? 'text-slate-650' : 'text-slate-450'}`}>
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
        <div className={`backdrop-blur-md rounded-3xl p-5 space-y-3.5 text-right border transition-all duration-250 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-100/60 border-slate-200/80'
        }`}>
          <div className={`flex items-center gap-2.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            <Smartphone size={18} className="stroke-[2.5]" />
            <h3 className={`font-extrabold text-xs transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {isRtl ? 'كيف تشارك أو تستخدم التطبيق كأيقونة؟ 📱' : 'How to use or share the app as an icon? 📱'}
            </h3>
          </div>
          <p className={`text-[10px] font-bold leading-relaxed transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
              className={`flex-1 font-extrabold text-[10px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700/60' 
                  : 'bg-slate-200/60 hover:bg-slate-200 text-slate-750 border-slate-300'
              }`}
            >
              <Info size={13} />
              <span>{isRtl ? 'شرح طريقة التثبيت بالتفصيل' : 'Detailed Installation Guide'}</span>
              {showInstructions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {showInstructions && (
            <div className={`pt-2 border-t space-y-3 text-[10px] font-semibold leading-relaxed animate-fade-in ${
              isDarkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-200/80 text-slate-600'
            }`}>
              <div className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800/40' : 'bg-white border-slate-200/80'
              } space-y-2.5`}>
                {/* iOS instructions */}
                <div className="space-y-1">
                  <span className={`font-extrabold flex items-center gap-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    🍏 هواتف آيفون (iPhone / Safari):
                  </span>
                  <p className="pr-1 text-[9px] text-slate-500">
                    افتح الرابط في متصفح <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Safari</strong> 👈 اضغط على زر <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>"مشاركة" (المربع مع السهم)</strong> 👈 اختر <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</strong>.
                  </p>
                </div>

                {/* Android instructions */}
                <div className={`space-y-1 border-t pt-2.5 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <span className={`font-extrabold flex items-center gap-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    🤖 هواتف أندرويد (Android / Chrome):
                  </span>
                  <p className="pr-1 text-[9px] text-slate-500">
                    افتح الرابط في متصفح <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Chrome</strong> 👈 اضغط على زر <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>الثلاث نقاط (⋮)</strong> في الأعلى 👈 اختر <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>"إضافة إلى الشاشة الرئيسية"</strong> أو <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>"تثبيت التطبيق"</strong>.
                  </p>
                </div>

                {/* PC/Desktop instructions */}
                <div className={`space-y-1 border-t pt-2.5 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <span className={`font-extrabold flex items-center gap-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    💻 أجهزة الكمبيوتر (Desktop / Chrome):
                  </span>
                  <p className="pr-1 text-[9px] text-slate-500">
                    اضغط على أيقونة <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>الشاشة مع السهم</strong> في شريط العناوين بالأعلى 👈 اختر <strong className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>"تثبيت" (Install)</strong> لتثبيته كبرنامج مستقل على سطح المكتب.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className={`text-[10px] font-bold text-center transition-colors ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          {t.footer}
        </p>
      </div>

      <AboutModal 
        isOpen={showAboutModal} 
        onClose={() => setShowAboutModal(false)} 
        currentLanguage={currentLanguage} 
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
