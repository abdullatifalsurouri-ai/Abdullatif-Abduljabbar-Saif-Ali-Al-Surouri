import { useState, useEffect } from 'react';
import { 
  Home, 
  Box as BoxIcon, 
  ArrowLeftRight, 
  BarChart2, 
  TrendingUp, 
  FileText, 
  Receipt,
  Sun,
  Moon,
  Globe,
  Settings as SettingsIcon,
  CloudCheck,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Bell,
  Maximize,
  Minimize,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Layers,
  Info,
  AlertTriangle,
  Calendar,
  X,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { AboutModal } from './components/AboutModal';
import { 
  TabType, 
  Item, 
  Movement, 
  Supplier, 
  User,
  Warehouse,
  WarehouseTransfer,
  AuditLogEntry,
  INITIAL_ITEMS, 
  INITIAL_SUPPLIERS, 
  INITIAL_MOVEMENTS,
  INITIAL_WAREHOUSES,
  INITIAL_TRANSFERS,
  INITIAL_AUDIT_LOGS,
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS
} from './types';

// Import our modular subviews
import HomeView from './components/HomeView';
import ItemsView from './components/ItemsView';
import MovementsView from './components/MovementsView';
import InventoryView from './components/InventoryView';
import ReportView from './components/ReportView';
import PrintView from './components/PrintView';
import WarehousesView from './components/WarehousesView';
import TransfersView from './components/TransfersView';
import SuppliersModal from './components/SuppliersModal';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import Toast, { ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wms_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [usersList, setUsersList] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wms_theme');
    if (saved) {
      return saved === 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('wms_theme')) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('wms_lang') as 'ar' | 'en') || 'ar';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'alerts' | 'pending' | 'system'>('all');
  const [notifications, setNotifications] = useState<{
    id: string;
    title: string;
    body: string;
    time: string;
    type: 'info' | 'warning' | 'error' | 'success';
    read: boolean;
  }[]>(() => {
    const saved = localStorage.getItem('wms_notifications');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        title: 'أهلاً بك في نظام مستودع المدى الذكي 📊',
        body: 'تم تشغيل تطبيق إدارة المستودعات بنجاح. يمكنك الآن تتبع المخزون والوارد والصرف والجرد الفوري.',
        time: 'منذ قليل',
        type: 'success',
        read: false
      },
      {
        id: '2',
        title: 'تنبيه: حماية البيانات في وضع الأوفلاين 🛡️',
        body: 'تطبيق المدى مهيأ للعمل بالكامل في وضع عدم الاتصال بالإنترنت (Offline Mode). سيتم تخزين الحركات محلياً ريثما يتوفر الاتصال.',
        time: 'منذ دقيقة',
        type: 'info',
        read: false
      },
      {
        id: '3',
        title: 'تنبيه: مراقبة حد الأمان التلقائي ⚠️',
        body: 'يقوم النظام بمراجعة مستمرة لمستويات المخزون وإشعارك بالسلع التي تقل عن الحد المطلوب تلقائياً.',
        time: 'منذ ساعة',
        type: 'warning',
        read: false
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('wms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Centralized State loaded with localStorage persistence
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('wms_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('wms_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('wms_movements');
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const saved = localStorage.getItem('wms_warehouses');
    return saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
  });

  const [transfers, setTransfers] = useState<WarehouseTransfer[]>(() => {
    const saved = localStorage.getItem('wms_transfers');
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('wms_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [isDataLocked, setIsDataLocked] = useState<boolean>(() => {
    return localStorage.getItem('wms_is_data_locked') === 'true';
  });

  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => {
    const saved = localStorage.getItem('wms_invoice_settings');
    return saved ? JSON.parse(saved) : DEFAULT_INVOICE_SETTINGS;
  });

  const [dashboardStatsConfig, setDashboardStatsConfig] = useState(() => {
    const saved = localStorage.getItem('dashboard_stats_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      showSuppliers: true,
      showItems: true,
      showTotalOutward: true,
      showTotalInward: true,
      showTotalValue: true,
      showDailyMovements: true,
      showLowStock: true
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboard_stats_config', JSON.stringify(dashboardStatsConfig));
  }, [dashboardStatsConfig]);

  // Internet connectivity state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<{ id: string; type: 'add_movement'; data: Movement }[]>(() => {
    const saved = localStorage.getItem('wms_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('wms_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Process the offline queue when internet is available
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && currentUser) {
      const syncOfflineQueue = async () => {
        addToast(
          currentLanguage === 'ar'
            ? `جاري مزامنة ${offlineQueue.length} عمليات معلقة تم إجراؤها أوفلاين...`
            : `Syncing ${offlineQueue.length} pending offline movements...`,
          'info'
        );

        // Make a sync push with the latest local movements (which already have the offline movements appended)
        const success = await pushDataToServer(items, suppliers, movements, warehouses, transfers, auditLogs, false);
        if (success) {
          addToast(
            currentLanguage === 'ar'
              ? '✓ تم مزامنة العمليات المعلقة بنجاح وتحديث السحابة!'
              : '✓ Offline movements synchronized successfully!',
            'success'
          );
          setOfflineQueue([]);
        } else {
          addToast(
            currentLanguage === 'ar'
              ? '⚠️ فشلت مزامنة العمليات المعلقة مؤقتاً، سيتم المحاولة لاحقاً.'
              : '⚠️ Offline sync failed temporarily. Retrying later...',
            'warning'
          );
        }
      };

      // Debounce slightly to ensure connection is fully established
      const timer = setTimeout(syncOfflineQueue, 2500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, offlineQueue, currentUser]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('wms_last_sync_time');
  });

  // Toast Notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast(
        currentLanguage === 'ar' 
          ? 'تم الاتصال بالإنترنت، جاري مزامنة البيانات سحابياً...' 
          : 'Connected to internet. Syncing data with cloud...', 
        'success'
      );
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast(
        currentLanguage === 'ar' 
          ? 'تم انقطاع الاتصال. يمكنك متابعة العمل كالمعتاد بدون إنترنت (أوفلاين).' 
          : 'Connection lost. Working in offline mode...', 
        'warning'
      );
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentLanguage]);

  // Auto-lock idle session tracker (10 minutes of idle time)
  const [isIdleLocked, setIsIdleLocked] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(30);

  // Expiration alert months configuration (e.g. alert if expires within N months)
  const [expirationAlertMonths, setExpirationAlertMonths] = useState<number>(() => {
    const saved = localStorage.getItem('wms_expiration_alert_months');
    return saved ? Number(saved) : 1; // Default to 1 month
  });

  useEffect(() => {
    localStorage.setItem('wms_expiration_alert_months', expirationAlertMonths.toString());
  }, [expirationAlertMonths]);

  // Request browser Notification permission if not set
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check and trigger daily reminder browser notification
  useEffect(() => {
    const checkDailyReminder = () => {
      const savedTime = localStorage.getItem('wms_daily_reminder_time') || '18:00';
      const [remHour, remMin] = savedTime.split(':').map(Number);
      
      const now = new Date();
      if (now.getHours() === remHour && now.getMinutes() === remMin) {
        // Find if any movements were created today
        const todayStr = new Date().toISOString().split('T')[0];
        const movementsToday = movements.filter((m) => m.date === todayStr).length;

        if (movementsToday === 0) {
          const lastNotifiedDate = localStorage.getItem('wms_last_notified_date');
          if (lastNotifiedDate !== todayStr) {
            localStorage.setItem('wms_last_notified_date', todayStr);
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('تنبيه المستودع اليومي 📦', {
                  body: 'تنبيه: لم يتم تسجيل أي حركة صادر أو وارد خلال هذا اليوم في المستودع حتى الآن. يرجى مراجعة المخزون والعمليات اليومية.',
                });
              } catch (e) {
                console.warn('Daily notification constructor failed, trying service worker:', e);
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification('تنبيه المستودع اليومي 📦', {
                      body: 'تنبيه: لم يتم تسجيل أي حركة صادر أو وارد خلال هذا اليوم في المستودع حتى الآن. يرجى مراجعة المخزون والعمليات اليومية.',
                    });
                  }).catch((err) => {
                    console.error('Service worker daily notification failed:', err);
                  });
                }
              }
            }
          }
        }
      }
    };

    const interval = setInterval(checkDailyReminder, 60000); // Check every minute
    checkDailyReminder(); // Run check on load

    return () => clearInterval(interval);
  }, [movements]);

  useEffect(() => {
    if (!currentUser) {
      setIsIdleLocked(false);
      return;
    }

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (isIdleLocked) return; // Don't reset if already locked
      clearTimeout(idleTimer);
      // 10 minutes = 10 * 60 * 1000 = 600,000 ms
      idleTimer = setTimeout(() => {
        setIsIdleLocked(true);
        setIdleCountdown(30);
      }, 600000); 
    };

    // Activity event listeners
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));

    // Initialize timer
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, [currentUser, isIdleLocked]);

  // Handle countdown when idle locked
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (isIdleLocked) {
      countdownInterval = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsIdleLocked(false);
            handleLogout(); // Auto logout when countdown reaches 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [isIdleLocked]);

  // PWA Install and Update Check Hook
  useEffect(() => {
    // 1. Capture PWA beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Listen to App Installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      addToast(
        currentLanguage === 'ar' ? '🎉 تم تثبيت تطبيق Inventra WMS بنجاح على جهازك!' : '🎉 Inventra WMS installed successfully!',
        'success'
      );
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Monitor and Auto-Update Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // Trigger update check on load
        reg.update();

        // Listen for new service worker being installed
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // There is an active controller, this means a new version is ready
                // 🚨 CRITICAL USER MANDATE: Logout automatically and reload
                addToast(
                  currentLanguage === 'ar'
                    ? '🔄 تم كشف تحديث جديد! جاري تسجيل الخروج والتثبيت التلقائي للأمان...'
                    : '🔄 New update detected! Logging out and installing for security...',
                  'info'
                );

                // Clear session
                localStorage.removeItem('wms_current_user');
                setCurrentUser(null);

                // Wait 2.5 seconds to show toast, then reload
                setTimeout(() => {
                  window.location.reload();
                }, 2500);
              }
            }
          };
        };
      });

      // Periodically poll the server for service worker updates (every 20 seconds)
      const interval = setInterval(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update().catch((e) => console.log('SW update check ignored', e));
          }
        });
      }, 20000);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [currentLanguage]);

  // Install trigger action
  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Intercept browser back button for mobile/tab back navigation and exit modal
  useEffect(() => {
    if (!currentUser) return;
    window.history.pushState({ tab: activeTab }, '');
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const handlePopState = (event: PopStateEvent) => {
      // Re-push state to trap next back action
      window.history.pushState({ tab: activeTab }, '');

      if (activeTab !== 'home') {
        // Go back to the main/home view
        setActiveTab('home');
      } else {
        // Already on home view, trigger the Exit confirmation warning
        setShowExitModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, currentUser]);

  // Smart Alerts for Low Stock & Near Expiration
  const [hasShownInitialAlerts, setHasShownInitialAlerts] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;

    // 1. Calculate Stocks
    const itemStocks = items.map(item => {
      const inward = movements
        .filter(m => m.itemId === item.id && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);
      const outward = movements
        .filter(m => m.itemId === item.id && m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);
      return {
        ...item,
        balance: inward - outward
      };
    });

    // 2. Low Stock Items
    const lowStockItems = itemStocks.filter(item => item.balance < item.safetyLimit);

    // 3. Expiration Check
    const alertDays = expirationAlertMonths * 30;
    const today = new Date();
    const expiryAlertLimit = new Date();
    expiryAlertLimit.setDate(today.getDate() + alertDays);

    const expiredItems: string[] = [];
    const nearExpiryItems: string[] = [];

    // Check items
    items.forEach(item => {
      if (item.expirationDate) {
        const expDate = new Date(item.expirationDate);
        if (expDate <= today) {
          expiredItems.push(item.name);
        } else if (expDate <= expiryAlertLimit) {
          nearExpiryItems.push(item.name);
        }
      }
    });

    // Check inward movements with expiration dates
    movements.forEach(m => {
      if (m.type === 'in' && m.expirationDate) {
        const item = items.find(i => i.id === m.itemId);
        const name = item ? item.name : `الصنف ${m.itemId}`;
        const expDate = new Date(m.expirationDate);
        if (expDate <= today) {
          if (!expiredItems.includes(name)) expiredItems.push(name);
        } else if (expDate <= expiryAlertLimit) {
          if (!nearExpiryItems.includes(name)) nearExpiryItems.push(name);
        }
      }
    });

    // 4. Trigger Toasts
    if (!hasShownInitialAlerts) {
      const timer = setTimeout(() => {
        if (lowStockItems.length > 0) {
          const names = lowStockItems.slice(0, 3).map(i => i.name).join('، ');
          const label = currentLanguage === 'ar'
            ? `⚠️ تنبيه مخزون منخفض: يوجد ${lowStockItems.length} أصناف تحت حد الأمان (${names}${lowStockItems.length > 3 ? '...' : ''})`
            : `⚠️ Stock alert: ${lowStockItems.length} items below safety limit (${names})`;
          addToast(label, 'warning');
        }

        if (expiredItems.length > 0) {
          const names = expiredItems.slice(0, 3).join('، ');
          const label = currentLanguage === 'ar'
            ? `🚨 انتهاء صلاحية: يوجد ${expiredItems.length} أصناف منتهية الصلاحية! (${names})`
            : `🚨 Expired: ${expiredItems.length} items have expired! (${names})`;
          addToast(label, 'error');
        }

        if (nearExpiryItems.length > 0) {
          const names = nearExpiryItems.slice(0, 3).join('، ');
          const label = currentLanguage === 'ar'
            ? `⏳ اقتراب انتهاء صلاحية: يوجد ${nearExpiryItems.length} أصناف تنتهي خلال 30 يوماً! (${names})`
            : `⏳ Near Expiry: ${nearExpiryItems.length} items expiring within 30 days! (${names})`;
          addToast(label, 'info');
        }

        setHasShownInitialAlerts(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [items, movements, hasShownInitialAlerts, currentLanguage]);

  useEffect(() => {
    setHasShownInitialAlerts(false);
  }, [items.length, movements.length]);

  // Pull data from Express server database
  const pullDataFromServer = async (showToast = false) => {
    if (!isOnline) {
      if (showToast) {
        addToast(
          currentLanguage === 'ar' 
            ? 'لا يوجد اتصال بالإنترنت لبدء جلب البيانات.' 
            : 'No internet connection to pull data.', 
          'warning'
        );
      }
      return false;
    }
    try {
      const response = await fetch('/api/sync/pull');
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          setItems(data.items);
          localStorage.setItem('wms_items', JSON.stringify(data.items));
        }
        if (data.suppliers) {
          setSuppliers(data.suppliers);
          localStorage.setItem('wms_suppliers', JSON.stringify(data.suppliers));
        }
        if (data.movements) {
          setMovements(data.movements);
          localStorage.setItem('wms_movements', JSON.stringify(data.movements));
        }
        if (data.warehouses) {
          setWarehouses(data.warehouses);
          localStorage.setItem('wms_warehouses', JSON.stringify(data.warehouses));
        }
        if (data.transfers) {
          setTransfers(data.transfers);
          localStorage.setItem('wms_transfers', JSON.stringify(data.transfers));
        }
        if (data.auditLogs) {
          setAuditLogs(data.auditLogs);
          localStorage.setItem('wms_audit_logs', JSON.stringify(data.auditLogs));
        }
        if (data.invoiceSettings) {
          setInvoiceSettings(data.invoiceSettings);
          localStorage.setItem('wms_invoice_settings', JSON.stringify(data.invoiceSettings));
        }
        
        const syncTime = new Date().toLocaleString('ar-SA', { hour12: true });
        setLastSyncTime(syncTime);
        localStorage.setItem('wms_last_sync_time', syncTime);
        if (showToast) {
          addToast(
            currentLanguage === 'ar' 
              ? 'تم جلب وتحديث قاعدة البيانات من السحابة بنجاح!' 
              : 'Data pulled and updated from cloud successfully!', 
            'success'
          );
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to pull data from cloud server:', err);
      if (showToast) {
        addToast(
          currentLanguage === 'ar' 
            ? 'تعذر جلب البيانات من السحابة. الخادم غير متصل.' 
            : 'Failed to pull data from cloud. Server is offline.', 
          'error'
        );
      }
    }
    return false;
  };

  // Push data to Express server database
  const pushDataToServer = async (
    currentItems = items,
    currentSuppliers = suppliers,
    currentMovements = movements,
    currentWarehouses = warehouses,
    currentTransfers = transfers,
    currentAuditLogs = auditLogs,
    showToast = false
  ) => {
    if (!isOnline) {
      if (showToast) {
        addToast(
          currentLanguage === 'ar' 
            ? 'تعذر إرسال التحديثات السحابية. تم الاحتفاظ بالبيانات محلياً.' 
            : 'Unable to push changes. Preserved locally.', 
          'warning'
        );
      }
      return false;
    }
    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentItems,
          suppliers: currentSuppliers,
          movements: currentMovements,
          warehouses: currentWarehouses,
          transfers: currentTransfers,
          auditLogs: currentAuditLogs,
          invoiceSettings: invoiceSettings
        })
      });
      if (response.ok) {
        const syncTime = new Date().toLocaleString('ar-SA', { hour12: true });
        setLastSyncTime(syncTime);
        localStorage.setItem('wms_last_sync_time', syncTime);
        if (showToast) {
          addToast(
            currentLanguage === 'ar' 
              ? 'تم حفظ ومزامنة جميع التغييرات السحابية بنجاح!' 
              : 'All changes synchronized with cloud successfully!', 
            'success'
          );
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to push data to cloud server:', err);
      if (showToast) {
        addToast(
          currentLanguage === 'ar' 
            ? 'فشلت مزامنة التغييرات. الخادم السحابي غير متصل.' 
            : 'Failed to synchronize changes. Cloud server is offline.', 
          'error'
        );
      }
    }
    return false;
  };

  // Manual Trigger for Sync
  const handleTriggerSync = async () => {
    addToast(
      currentLanguage === 'ar' 
        ? 'جاري بدء المزامنة الثنائية مع السحابة...' 
        : 'Starting bi-directional cloud sync...', 
      'info'
    );
    // First push local data, then pull latest to ensure everyone is unified
    const pushOk = await pushDataToServer(items, suppliers, movements, warehouses, transfers, auditLogs, false);
    const pullOk = await pullDataFromServer(false);
    
    if (pushOk && pullOk) {
      addToast(
        currentLanguage === 'ar' 
          ? 'اكتملت المزامنة الثنائية بالكامل وتحديث البيانات بنجاح' 
          : 'Bi-directional sync completed & updated successfully', 
        'success'
      );
      return true;
    } else if (pushOk || pullOk) {
      addToast(
        currentLanguage === 'ar' 
          ? 'تمت المزامنة جزئياً. يرجى مراجعة اتصال الإنترنت.' 
          : 'Sync completed partially. Please check internet connection.', 
        'warning'
      );
      return true;
    } else {
      addToast(
        currentLanguage === 'ar' 
          ? 'فشلت المزامنة. تعذر الاتصال بالخادم السحابي.' 
          : 'Sync failed. Could not contact cloud server.', 
        'error'
      );
      return false;
    }
  };

  // Pull from cloud when user logs in or boots up app online
  useEffect(() => {
    if (currentUser && isOnline) {
      pullDataFromServer();
    }
  }, [currentUser, isOnline]);

  // Debounced Auto-push when local state changes
  useEffect(() => {
    if (currentUser && isOnline) {
      const delayFn = setTimeout(() => {
        pushDataToServer(items, suppliers, movements, warehouses, transfers, auditLogs);
      }, 1500); // 1.5 seconds debounce
      return () => clearTimeout(delayFn);
    }
  }, [items, suppliers, movements, warehouses, transfers, auditLogs, isOnline, currentUser]);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('wms_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('wms_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('wms_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('wms_warehouses', JSON.stringify(warehouses));
  }, [warehouses]);

  useEffect(() => {
    localStorage.setItem('wms_transfers', JSON.stringify(transfers));
  }, [transfers]);

  useEffect(() => {
    localStorage.setItem('wms_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('wms_is_data_locked', String(isDataLocked));
  }, [isDataLocked]);

  useEffect(() => {
    localStorage.setItem('wms_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('wms_lang', currentLanguage);
  }, [currentLanguage]);

  // Handle Authentication callbacks
  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('wms_current_user', JSON.stringify(user));
    setCurrentUser(user);
    setActiveTab('home');
  };

  const handleLogout = () => {
    if (currentUser) {
      const devId = localStorage.getItem('wms_device_id');
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, deviceId: devId }),
      }).catch(err => console.error('Error release device session on server:', err));
    }
    localStorage.removeItem('wms_current_user');
    setCurrentUser(null);
    setActiveTab('home');
  };

  const logAction = (
    action: 'add' | 'edit' | 'delete' | 'sync' | 'import' | 'other',
    entityType: 'items' | 'movements' | 'suppliers' | 'warehouses' | 'transfers' | 'system',
    details: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      username: currentUser?.username || 'Guest',
      role: currentUser?.role || 'Viewer',
      action,
      entityType,
      details,
      date: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // User permission-aware lock status calculations
  // Reuses the existing client locking logic to enforce role permissions elegantly
  const isOwner = currentUser?.role === 'Owner';
  const itemsLocked = !isOwner && (isDataLocked || !currentUser || currentUser.permissions.items === 'read' || currentUser.permissions.items === 'none');
  const movementsLocked = !isOwner && (isDataLocked || !currentUser || currentUser.permissions.movements === 'read' || currentUser.permissions.movements === 'none');
  const suppliersLocked = !isOwner && (isDataLocked || !currentUser || currentUser.permissions.suppliers === 'read' || currentUser.permissions.suppliers === 'none');
  const warehousesLocked = !isOwner && (isDataLocked || !currentUser || currentUser.permissions.warehouses === 'read' || currentUser.permissions.warehouses === 'none');
  const transfersLocked = !isOwner && (isDataLocked || !currentUser || currentUser.permissions.transfers === 'read' || currentUser.permissions.transfers === 'none');

  // Handler functions for adding/modifying/deleting items
  const handleAddItem = (item: Item) => {
    if (itemsLocked) return;
    setItems((prev) => [...prev, item]);
    logAction('add', 'items', `إضافة صنف جديد: ${item.name} (رمز: ${item.id}) بسعر ${item.price} ر.س`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم إضافة الصنف "${item.name}" بنجاح وجاري التزامن...` 
        : `Successfully added item "${item.name}". Syncing...`, 
      'success'
    );
  };

  const handleImportItems = (newItems: Item[]) => {
    if (itemsLocked) return;
    setItems((prev) => [...prev, ...newItems]);
    logAction('import', 'items', `استيراد قائمة أصناف جديدة بعدد ${newItems.length} صنف من ملف CSV/Excel`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم استيراد ${newItems.length} صنف بنجاح وجاري التزامن...` 
        : `Successfully imported ${newItems.length} items. Syncing...`, 
      'success'
    );
  };

  const handleEditItem = (updatedItem: Item) => {
    if (itemsLocked) return;
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    logAction('edit', 'items', `تعديل الصنف: ${updatedItem.name} (رمز: ${updatedItem.id})`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم تحديث الصنف "${updatedItem.name}" بنجاح وجاري التزامن...` 
        : `Successfully updated item "${updatedItem.name}". Syncing...`, 
      'success'
    );
  };

  const handleDeleteItem = (id: string) => {
    if (itemsLocked) return;
    const deletedItem = items.find((item) => item.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMovements((prev) => prev.filter((m) => m.itemId !== id));
    logAction('delete', 'items', `حذف الصنف: ${deletedItem?.name || id} (رمز: ${id}) وجميع حركاته المخزنية`);
    addToast(
      currentLanguage === 'ar' 
        ? 'تم حذف الصنف والحركات المتعلقة به بنجاح!' 
        : 'Item and associated movements deleted successfully!', 
      'success'
    );
  };

  // Handler functions for adding/deleting movements
  const handleAddMovement = (movement: Movement) => {
    if (movementsLocked) return;
    setMovements((prev) => [...prev, movement]);
    
    // Update the item expiration date if the movement is an inward one and has an expirationDate
    if (movement.type === 'in' && movement.expirationDate) {
      setItems((prev) => prev.map((it) => it.id === movement.itemId ? { 
        ...it, 
        expirationDate: movement.expirationDate,
        alertBeforeMonths: movement.alertBeforeMonths 
      } : it));
    }

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, { id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, type: 'add_movement', data: movement }]);
    }

    const item = items.find((i) => i.id === movement.itemId);
    const typeStr = movement.type === 'in' ? 'وارد' : 'صرف';
    logAction(
      'add',
      'movements',
      `تسجيل حركة ${typeStr} للصنف: ${item?.name || movement.itemId} بكمية ${movement.quantity} ${item?.unit || 'حبة'} من/إلى ${movement.partner}`
    );
    addToast(
      currentLanguage === 'ar' 
        ? (isOnline ? `تم تسجيل الحركة المخزنية بنجاح وجاري التزامن...` : `تم تسجيل الحركة بنجاح محلياً (وضع الأوفلاين) وبانتظار التزامن المجدول...`)
        : (isOnline ? `Registered movement successfully. Syncing...` : `Registered movement locally (Offline Mode). Awaiting auto-sync...`), 
      'success'
    );
  };

  const handleDeleteMovement = (id: number) => {
    if (movementsLocked) return;
    const deletedMov = movements.find((m) => m.id === id);
    const item = items.find((i) => i.id === deletedMov?.itemId);
    setMovements((prev) => prev.filter((m) => m.id !== id));
    logAction('delete', 'movements', `حذف حركة مخزنية رقم #${id} للصنف: ${item?.name || deletedMov?.itemId || ''}`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم حذف الحركة المخزنية #${id} بنجاح` 
        : `Successfully deleted movement #${id}`, 
      'success'
    );
  };

  // Handler functions for adding/editing/deleting suppliers
  const handleAddSupplier = (supplier: Supplier) => {
    if (suppliersLocked) return;
    setSuppliers((prev) => [...prev, supplier]);
    logAction('add', 'suppliers', `إضافة المورد الجديد: ${supplier.name} (رمز: ${supplier.id})`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم إضافة المورد "${supplier.name}" بنجاح وجاري التزامن...` 
        : `Successfully added supplier "${supplier.name}". Syncing...`, 
      'success'
    );
  };

  const handleEditSupplier = (updatedSupplier: Supplier) => {
    if (suppliersLocked) return;
    setSuppliers((prev) => prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)));
    logAction('edit', 'suppliers', `تعديل بيانات المورد: ${updatedSupplier.name} (رمز: ${updatedSupplier.id})`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم تحديث المورد "${updatedSupplier.name}" بنجاح وجاري التزامن...` 
        : `Successfully updated supplier "${updatedSupplier.name}". Syncing...`, 
      'success'
    );
  };

  const handleDeleteSupplier = (id: string) => {
    if (suppliersLocked) return;
    const deletedSup = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    logAction('delete', 'suppliers', `حذف المورد: ${deletedSup?.name || id}`);
    addToast(
      currentLanguage === 'ar' 
        ? 'تم حذف المورد بنجاح!' 
        : 'Successfully deleted supplier!', 
      'success'
    );
  };

  // Handler functions for adding/editing/deleting warehouses
  const handleAddWarehouse = (warehouse: Warehouse) => {
    if (warehousesLocked) return;
    setWarehouses((prev) => [...prev, warehouse]);
    logAction('add', 'warehouses', `إضافة مستودع جديد: ${warehouse.name} (رمز: ${warehouse.id}) بإدارة ${warehouse.manager}`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم إضافة المستودع "${warehouse.name}" بنجاح وجاري التزامن...` 
        : `Successfully added warehouse "${warehouse.name}". Syncing...`, 
      'success'
    );
  };

  const handleEditWarehouse = (updatedWarehouse: Warehouse) => {
    if (warehousesLocked) return;
    setWarehouses((prev) => prev.map((w) => (w.id === updatedWarehouse.id ? updatedWarehouse : w)));
    logAction('edit', 'warehouses', `تعديل بيانات المستودع: ${updatedWarehouse.name} (رمز: ${updatedWarehouse.id})`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم تحديث بيانات المستودع "${updatedWarehouse.name}" بنجاح وجاري التزامن...` 
        : `Successfully updated warehouse "${updatedWarehouse.name}". Syncing...`, 
      'success'
    );
  };

  const handleDeleteWarehouse = (id: string) => {
    if (warehousesLocked) return;
    const deletedWh = warehouses.find((w) => w.id === id);
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
    logAction('delete', 'warehouses', `حذف المستودع: ${deletedWh?.name || id}`);
    addToast(
      currentLanguage === 'ar' 
        ? 'تم حذف المستودع بنجاح!' 
        : 'Successfully deleted warehouse!', 
      'success'
    );
  };

  // Handler functions for Warehouse Transfers
  const handleAddTransfer = (transfer: WarehouseTransfer) => {
    if (transfersLocked) return;
    setTransfers((prev) => [...prev, transfer]);
    const item = items.find((i) => i.id === transfer.itemId);
    const fromWh = warehouses.find((w) => w.id === transfer.fromWarehouseId)?.name || transfer.fromWarehouseId;
    const toWh = warehouses.find((w) => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId;
    logAction('add', 'transfers', `طلب تحويل مخزني لـ ${transfer.quantity} من ${item?.name || transfer.itemId} من (${fromWh}) إلى (${toWh})`);
    addToast(
      currentLanguage === 'ar' 
        ? `تم إنشاء طلب التحويل المخزني بنجاح وجاري التزامن...` 
        : `Created warehouse transfer successfully. Syncing...`, 
      'success'
    );
  };

  const handleAcceptTransfer = (transferId: string) => {
    if (transfersLocked) return;
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return;

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'accepted',
              handledBy: currentUser?.username || 'Owner',
              handledDate: new Date().toISOString().split('T')[0],
            }
          : t
      )
    );

    const outMovement: Movement = {
      id: Date.now(),
      itemId: transfer.itemId,
      quantity: transfer.quantity,
      type: 'out',
      partner: `تحويل إلى مستودع: ${warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId}`,
      date: new Date().toISOString().split('T')[0],
      warehouseId: transfer.fromWarehouseId,
    };

    const inMovement: Movement = {
      id: Date.now() + 1,
      itemId: transfer.itemId,
      quantity: transfer.quantity,
      type: 'in',
      partner: `تحويل من مستودع: ${warehouses.find(w => w.id === transfer.fromWarehouseId)?.name || transfer.fromWarehouseId}`,
      date: new Date().toISOString().split('T')[0],
      warehouseId: transfer.toWarehouseId,
    };

    setMovements((prev) => [...prev, outMovement, inMovement]);

    const item = items.find((i) => i.id === transfer.itemId);
    const fromWh = warehouses.find((w) => w.id === transfer.fromWarehouseId)?.name || transfer.fromWarehouseId;
    const toWh = warehouses.find((w) => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId;
    logAction('edit', 'transfers', `قبول التحويل المخزني رقم #${transferId} لـ ${transfer.quantity} من ${item?.name || transfer.itemId} من (${fromWh}) إلى (${toWh})`);

    addToast(
      currentLanguage === 'ar' 
        ? `تم قبول التحويل المخزني بنجاح وتحديث كميات المستودعين!` 
        : `Warehouse transfer accepted successfully. Stock levels updated!`, 
      'success'
    );
  };

  const handleRejectTransfer = (transferId: string) => {
    if (transfersLocked) return;
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return;

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'rejected',
              handledBy: currentUser?.username || 'Owner',
              handledDate: new Date().toISOString().split('T')[0],
            }
          : t
      )
    );

    const item = items.find((i) => i.id === transfer.itemId);
    logAction('edit', 'transfers', `رفض التحويل المخزني رقم #${transferId} لـ ${transfer.quantity} من ${item?.name || transfer.itemId}`);

    addToast(
      currentLanguage === 'ar' 
        ? 'تم رفض طلب التحويل المخزني.' 
        : 'Warehouse transfer request rejected.', 
      'warning'
    );
  };

  // Reset and initialize back to factory default
  const handleResetAllDataOnServer = () => {
    setItems(INITIAL_ITEMS);
    setSuppliers(INITIAL_SUPPLIERS);
    setMovements(INITIAL_MOVEMENTS);
    setWarehouses(INITIAL_WAREHOUSES);
    setTransfers(INITIAL_TRANSFERS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.removeItem('wms_item_groups');
    setTimeout(() => {
      pushDataToServer(INITIAL_ITEMS, INITIAL_SUPPLIERS, INITIAL_MOVEMENTS, INITIAL_WAREHOUSES, INITIAL_TRANSFERS, INITIAL_AUDIT_LOGS);
    }, 200);
  };

  // If user is not logged in, force elegant login screen
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={handleLoginSuccess} 
        currentLanguage={currentLanguage} 
        onLanguageChange={setCurrentLanguage} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
      />
    );
  }

  // Render the appropriate subview based on current active tab and user permissions
  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            items={items}
            movements={movements}
            suppliers={suppliers}
            isDataLocked={isDataLocked}
            onToggleLock={(locked) => {
              if (currentUser.role === 'Owner' || currentUser.role === 'Admin') {
                setIsDataLocked(locked);
              } else {
                alert('عذراً، تفعيل أو إلغاء قفل البيانات يتطلب صلاحية المالك أو المدير!');
              }
            }}
            onNavigate={(tab) => {
              // Ensure navigation is permitted
              const isOwnerUser = currentUser?.role === 'Owner';
              if (!isOwnerUser) {
                if (tab === 'items' && currentUser.permissions.items === 'none') return;
                if (tab === 'movements' && currentUser.permissions.movements === 'none') return;
                if ((tab === 'inventory' || tab === 'report' || tab === 'print') && currentUser.permissions.reports === 'none') return;
              }
              setActiveTab(tab);
            }}
            onOpenSuppliers={() => {
              const isOwnerUser = currentUser?.role === 'Owner';
              if (isOwnerUser || currentUser.permissions.suppliers !== 'none') {
                setIsSuppliersOpen(true);
              } else {
                alert('عذراً، صلاحية الوصول لسجلات الموردين محجوبة عن حسابك الحالي.');
              }
            }}
            onImportData={(importedItems, importedSuppliers, importedMovements) => {
              if (itemsLocked || suppliersLocked || movementsLocked) {
                alert('⚠️ لا يمكن استيراد البيانات لأن حسابك لا يملك صلاحية الكتابة والتعديل أو قفل البيانات مفعّل.');
                return;
              }
              setItems(importedItems);
              setSuppliers(importedSuppliers);
              setMovements(importedMovements);
            }}
            onResetData={() => {
              if (currentUser.role !== 'Owner') {
                alert('تصفير البيانات مقتصر فقط على مالك النظام.');
                return;
              }
              handleResetAllDataOnServer();
            }}
            currentUser={currentUser}
            auditLogs={auditLogs}
            currentLanguage={currentLanguage}
            dashboardStatsConfig={dashboardStatsConfig}
          />
        );
      case 'items':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.items === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الأصناف غير متاح لحسابك الحالي.</div>;
        return (
          <ItemsView
            items={items}
            movements={movements}
            currentUser={currentUser}
            isDataLocked={itemsLocked}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onImportItems={handleImportItems}
          />
        );
      case 'movements':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.movements === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الحركات غير متاح لحسابك الحالي.</div>;
        return (
          <MovementsView
            movements={movements}
            items={items}
            suppliers={suppliers}
            warehouses={warehouses}
            currentUser={currentUser}
            isDataLocked={movementsLocked}
            onAddMovement={handleAddMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        );
      case 'warehouses':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.warehouses === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح المستودعات غير متاح لحسابك الحالي.</div>;
        return (
          <WarehousesView
            warehouses={warehouses}
            users={usersList}
            items={items}
            movements={movements}
            isDataLocked={warehousesLocked}
            onAddWarehouse={handleAddWarehouse}
            onEditWarehouse={handleEditWarehouse}
            onDeleteWarehouse={handleDeleteWarehouse}
          />
        );
      case 'transfers':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.transfers === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تحويلات المستودعات غير متاحة لحسابك الحالي.</div>;
        return (
          <TransfersView
            transfers={transfers}
            warehouses={warehouses}
            items={items}
            currentUser={currentUser}
            isDataLocked={transfersLocked}
            onAddTransfer={handleAddTransfer}
            onAcceptTransfer={handleAcceptTransfer}
            onRejectTransfer={handleRejectTransfer}
          />
        );
      case 'inventory':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الجرد مخفي عن حسابك الحالي.</div>;
        return (
          <InventoryView
            items={items}
            movements={movements}
            warehouses={warehouses}
            invoiceSettings={invoiceSettings}
            currentUser={currentUser}
            onAddMovement={handleAddMovement}
            isDataLocked={movementsLocked}
          />
        );
      case 'report':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، التقارير غير متاحة لحسابك الحالي.</div>;
        return <ReportView items={items} movements={movements} suppliers={suppliers} warehouses={warehouses} invoiceSettings={invoiceSettings} currentUser={currentUser} />;
      case 'print':
        if (currentUser?.role !== 'Owner' && currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، السندات غير متاحة لحسابك الحالي.</div>;
        return <PrintView movements={movements} items={items} warehouses={warehouses} invoiceSettings={invoiceSettings} currentUser={currentUser} />;
      case 'settings':
        return (
          <SettingsView
            currentUser={currentUser}
            onLogout={handleLogout}
            isDataLocked={isDataLocked}
            onToggleLock={(locked) => {
              if (currentUser.role === 'Owner' || currentUser.role === 'Admin') {
                setIsDataLocked(locked);
              } else {
                alert('تعديل قفل البيانات مقتصر على المالك أو المدير!');
              }
            }}
            onTriggerSync={handleTriggerSync}
            lastSyncTime={lastSyncTime}
            isOnline={isOnline}
            onResetAllData={handleResetAllDataOnServer}
            warehouses={warehouses}
            auditLogs={auditLogs}
            items={items}
            movements={movements}
            suppliers={suppliers}
            transfers={transfers}
            dashboardStatsConfig={dashboardStatsConfig}
            onChangeDashboardStatsConfig={setDashboardStatsConfig}
            invoiceSettings={invoiceSettings}
            expirationAlertMonths={expirationAlertMonths}
            onUpdateExpirationAlertMonths={setExpirationAlertMonths}
            onUpdateInvoiceSettings={(newSettings) => {
              setInvoiceSettings(newSettings);
              localStorage.setItem('wms_invoice_settings', JSON.stringify(newSettings));
              // Save it local, and also immediately trigger background push to sync
              pushDataToServer(items, suppliers, movements, warehouses, transfers, auditLogs, false);
            }}
            currentLanguage={currentLanguage}
          />
        );
      default:
        return null;
    }
  };

  const translations = {
    ar: {
      title: "مستودع المدى الذكي",
      readOnly: "وضع القراءة فقط 🔒",
      activeStaff: "أمين المستودع مفعّل",
      navHome: "الرئيسية",
      navItems: "الأصناف",
      navMovements: "الحركات",
      navInventory: "الجرد",
      navReport: "التقرير",
      navPrint: "السندات",
      navWarehouses: "المستودعات",
      navTransfers: "التحويلات المخزنية",
      navSettings: "الإعدادات",
      navAbout: "حول التطبيق"
    },
    en: {
      title: "Al-Mada Smart WMS",
      readOnly: "Read-Only Mode 🔒",
      activeStaff: "Storekeeper Active",
      navHome: "Home",
      navItems: "Items",
      navMovements: "Movements",
      navInventory: "Inventory",
      navReport: "Report",
      navPrint: "Vouchers",
      navWarehouses: "Warehouses",
      navTransfers: "Inventory Transfers",
      navSettings: "Settings",
      navAbout: "About App"
    }
  };

  const t = translations[currentLanguage];

  // Find transfers that are pending and belong to the current user's managed warehouse
  const managedWarehouseIds = warehouses
    .filter((wh) => wh.manager.toLowerCase() === (currentUser?.username || '').toLowerCase())
    .map((wh) => wh.id);

  const pendingIncomingTransfersCount = transfers.filter(
    (tr) => tr.status === 'pending' && managedWarehouseIds.includes(tr.toWarehouseId)
  ).length;

  // Calculate active alerts dynamically for the notification hub
  const lowStockCount = items.map(item => {
    const inward = movements
      .filter(m => m.itemId === item.id && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);
    const outward = movements
      .filter(m => m.itemId === item.id && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);
    return {
      ...item,
      balance: inward - outward
    };
  }).filter(item => item.balance < item.safetyLimit).length;

  const todayDate = new Date();
  const alertDays = (expirationAlertMonths || 1) * 30;
  const expiryLimitDate = new Date();
  expiryLimitDate.setDate(todayDate.getDate() + alertDays);

  const expiredCount = items.filter(item => item.expirationDate && new Date(item.expirationDate) <= todayDate).length;
  const nearExpiryCount = items.filter(item => {
    if (!item.expirationDate) return false;
    const exp = new Date(item.expirationDate);
    return exp > todayDate && exp <= expiryLimitDate;
  }).length;

  // Sync system alerts into the main notifications array
  useEffect(() => {
    let changed = false;
    let updated = [...notifications];

    // Low stock
    const lowStockId = 'sys-low-stock';
    const hasLowStock = lowStockCount > 0;
    const existingLow = updated.find(n => n.id === lowStockId);
    if (hasLowStock) {
      const bodyText = `تنبيه: هناك ${lowStockCount} أصناف مخزنية انخفضت كميتها الحالية عن حد الأمان المسجل.`;
      if (!existingLow || existingLow.body !== bodyText) {
        updated = updated.filter(n => n.id !== lowStockId);
        updated.unshift({
          id: lowStockId,
          title: 'مخزون منخفض تحت حد الأمان ⚠️',
          body: bodyText,
          time: 'تحديث فوري',
          type: 'warning',
          read: false
        });
        changed = true;
      }
    } else if (existingLow) {
      updated = updated.filter(n => n.id !== lowStockId);
      changed = true;
    }

    // Expiry
    const expiryId = 'sys-expiry-warning';
    const hasExpiry = (expiredCount > 0 || nearExpiryCount > 0);
    const existingExpiry = updated.find(n => n.id === expiryId);
    if (hasExpiry) {
      const bodyText = `تنبيه: وجدنا ${expiredCount} أصناف منتهية الصلاحية بالكامل، و ${nearExpiryCount} أصناف على وشك الانتهاء خلال ${expirationAlertMonths} أشهر.`;
      if (!existingExpiry || existingExpiry.body !== bodyText) {
        updated = updated.filter(n => n.id !== expiryId);
        updated.unshift({
          id: expiryId,
          title: 'تنبيهات تاريخ الصلاحية 📅',
          body: bodyText,
          time: 'تحديث فوري',
          type: 'error',
          read: false
        });
        changed = true;
      }
    } else if (existingExpiry) {
      updated = updated.filter(n => n.id !== expiryId);
      changed = true;
    }

    // Transfers
    const transferId = 'sys-transfer-warning';
    const hasTransfer = pendingIncomingTransfersCount > 0;
    const existingTransfer = updated.find(n => n.id === transferId);
    if (hasTransfer) {
      const bodyText = `لديك ${pendingIncomingTransfersCount} طلبات تحويل واردة إلى مستودعك بانتظار المراجعة والاعتماد.`;
      if (!existingTransfer || existingTransfer.body !== bodyText) {
        updated = updated.filter(n => n.id !== transferId);
        updated.unshift({
          id: transferId,
          title: 'طلبات تحويل معلقة واردة 🚚',
          body: bodyText,
          time: 'تحديث فوري',
          type: 'info',
          read: false
        });
        changed = true;
      }
    } else if (existingTransfer) {
      updated = updated.filter(n => n.id !== transferId);
      changed = true;
    }

    if (changed) {
      setNotifications(updated);
    }
  }, [lowStockCount, expiredCount, nearExpiryCount, pendingIncomingTransfersCount]);

  const totalNotificationsBadgeCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notif => {
    if (notificationFilter === 'all') return true;
    if (notificationFilter === 'alerts') {
      return notif.type === 'warning' || notif.type === 'error' || notif.id === 'sys-low-stock' || notif.id === 'sys-expiry-warning';
    }
    if (notificationFilter === 'pending') {
      return notif.id === 'sys-transfer-warning' || notif.title.includes('تحويل') || notif.title.includes('مهمة') || notif.body.includes('طلب');
    }
    if (notificationFilter === 'system') {
      const isPending = notif.id === 'sys-transfer-warning' || notif.title.includes('تحويل') || notif.title.includes('مهمة') || notif.body.includes('طلب');
      const isAlert = notif.type === 'warning' || notif.type === 'error' || notif.id === 'sys-low-stock' || notif.id === 'sys-expiry-warning';
      return !isPending && !isAlert;
    }
    return true;
  });

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'} flex flex-col pb-24 font-sans select-none transition-colors duration-200`} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Banner (Print-only Hidden or Styled properly) */}
      <header className={`border-b ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} py-4 px-6 sticky top-0 z-40 print:hidden shadow-xs`}>
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {invoiceSettings?.logo ? (
              <img src={invoiceSettings.logo} alt="Company Logo" className="w-9 h-9 object-contain rounded-xl shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-blue-600 text-white p-2 rounded-2xl shadow-xs">
                <Receipt size={20} className="stroke-[2.5]" />
              </div>
            )}
            <div className="flex flex-col text-right">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-800 dark:text-white">
                {invoiceSettings?.name || t.title}
              </span>
              {invoiceSettings?.name && (
                <span className="text-[9px] text-slate-400 font-bold leading-none">
                  {t.title}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline Pending Sync Badge */}
            {offlineQueue.length > 0 && (
              <span className="animate-pulse bg-rose-500 text-white font-black text-[10px] sm:text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shadow-md border border-rose-600 shrink-0">
                <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                {currentLanguage === 'ar' 
                  ? `${offlineQueue.length} عمليات بانتظار المزامنة` 
                  : `${offlineQueue.length} ops pending sync`}
              </span>
            )}

            {/* Active Employee/Staff Status Badge */}
            <span className={`text-[10px] sm:text-xs font-black px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all border ${
              isDarkMode 
                ? 'bg-blue-950/40 border-blue-900/30 text-blue-400' 
                : 'bg-blue-50/80 border-blue-100/50 text-blue-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              {isDataLocked ? t.readOnly : (currentLanguage === 'ar' ? `الموظف: ${currentUser.username} مفعّل` : `Staff: ${currentUser.username} Active`)}
            </span>
            
            {/* Divider */}
            <span className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            {/* Icons Button Group */}
            <div className={`flex items-center gap-1 p-1 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              {/* About App Info Button */}
              <div className="group relative">
                <button
                  onClick={() => setShowAboutModal(true)}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs'
                  }`}
                  title={currentLanguage === 'ar' ? 'حول التطبيق ومميزاته' : 'About App & Features'}
                >
                  <Info size={17} className="stroke-[2.5]" />
                </button>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 dark:bg-slate-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {currentLanguage === 'ar' ? 'حول التطبيق ℹ️' : 'About App ℹ️'}
                </div>
              </div>

              {/* Language Toggle Button */}
              <div className="group relative">
                <button
                  onClick={() => setCurrentLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-black ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs'
                  }`}
                  title={currentLanguage === 'ar' ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}
                >
                  <Globe size={17} className="stroke-[2.5]" />
                  <span className="text-[9px] uppercase tracking-wider font-extrabold">{currentLanguage === 'ar' ? 'EN' : 'AR'}</span>
                </button>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 dark:bg-slate-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {currentLanguage === 'ar' ? 'تغيير اللغة 🌐' : 'Switch Language 🌐'}
                </div>
              </div>

              {/* Fullscreen Toggle Button */}
              <div className="group relative">
                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs'
                  }`}
                  title={isFullscreen ? (currentLanguage === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit Fullscreen') : (currentLanguage === 'ar' ? 'وضع ملء الشاشة' : 'Fullscreen Mode')}
                >
                  {isFullscreen ? <Minimize size={17} className="stroke-[2.5]" /> : <Maximize size={17} className="stroke-[2.5]" />}
                </button>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 dark:bg-slate-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {isFullscreen ? (currentLanguage === 'ar' ? 'إلغاء ملء الشاشة 🖥️' : 'Exit Fullscreen 🖥️') : (currentLanguage === 'ar' ? 'ملء الشاشة 🖥️' : 'Fullscreen 🖥️')}
                </div>
              </div>

              {/* Dark Mode Toggle Button */}
              <div className="group relative">
                <button
                  onClick={() => setIsDarkMode(prev => !prev)}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-white text-slate-600 hover:text-amber-500 hover:shadow-2xs'
                  }`}
                  title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                >
                  {isDarkMode ? <Sun size={17} className="stroke-[2.5]" /> : <Moon size={17} className="stroke-[2.5]" />}
                </button>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 dark:bg-slate-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {isDarkMode ? (currentLanguage === 'ar' ? 'المظهر النهاري ☀️' : 'Light Mode ☀️') : (currentLanguage === 'ar' ? 'المظهر الليلي 🌙' : 'Dark Mode 🌙')}
                </div>
              </div>

              {/* Notification Toggle Button */}
              <div className="group relative">
                <button
                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
                    isNotificationsOpen 
                      ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' 
                      : (isDarkMode ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs')
                  }`}
                  title={currentLanguage === 'ar' ? 'التنبيهات والفعاليات' : 'Notifications & Events'}
                >
                  <Bell size={17} className="stroke-[2.5]" />
                  {totalNotificationsBadgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                      {totalNotificationsBadgeCount}
                    </span>
                  )}
                </button>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 dark:bg-slate-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {currentLanguage === 'ar' ? 'مركز التنبيهات 🔔' : 'Notifications 🔔'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== NOTIFICATION DRAWER ==================== */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end print:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsNotificationsOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
          />
          
          {/* Drawer content */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-slide-in-from-right duration-300 text-right">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600 stroke-[2.5]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                  {currentLanguage === 'ar' ? 'مركز التنبيهات والفعاليات' : 'Notifications & Warehouse Events'}
                </h3>
              </div>
            </div>

            {/* Sub-header Actions */}
            {notifications.length > 0 && (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setNotifications([]);
                    addToast(currentLanguage === 'ar' ? '✓ تم مسح جميع التنبيهات' : '✓ Cleared all notifications', 'info');
                  }}
                  className="text-red-500 hover:text-red-600 font-extrabold cursor-pointer hover:underline"
                >
                  {currentLanguage === 'ar' ? 'مسح الكل' : 'Clear All'}
                </button>
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    addToast(currentLanguage === 'ar' ? '✓ تم تحديد الكل كمقروء' : '✓ Marked all as read', 'success');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-extrabold cursor-pointer hover:underline"
                >
                  {currentLanguage === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}
                </button>
              </div>
            )}

            {/* Notification Type Filters */}
            <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
              <button
                onClick={() => setNotificationFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  notificationFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {currentLanguage === 'ar' ? 'الكل' : 'All'} ({notifications.length})
              </button>
              <button
                onClick={() => setNotificationFilter('alerts')}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  notificationFilter === 'alerts'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AlertTriangle size={11} className="shrink-0" />
                <span>{currentLanguage === 'ar' ? 'تنبيهات' : 'Alerts'}</span>
                <span>({notifications.filter(n => n.type === 'warning' || n.type === 'error' || n.id === 'sys-low-stock' || n.id === 'sys-expiry-warning').length})</span>
              </button>
              <button
                onClick={() => setNotificationFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  notificationFilter === 'pending'
                    ? 'bg-purple-500 border-purple-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowLeftRight size={11} className="shrink-0" />
                <span>{currentLanguage === 'ar' ? 'مهام معلقة' : 'Pending Tasks'}</span>
                <span>({notifications.filter(n => n.id === 'sys-transfer-warning' || n.title.includes('تحويل') || n.title.includes('مهمة') || n.body.includes('طلب')).length})</span>
              </button>
              <button
                onClick={() => setNotificationFilter('system')}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  notificationFilter === 'system'
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <SettingsIcon size={11} className="shrink-0" />
                <span>{currentLanguage === 'ar' ? 'تحديثات نظام' : 'System Updates'}</span>
                <span>({notifications.filter(n => {
                  const isPending = n.id === 'sys-transfer-warning' || n.title.includes('تحويل') || n.title.includes('مهمة') || n.body.includes('طلب');
                  const isAlert = n.type === 'warning' || n.type === 'error' || n.id === 'sys-low-stock' || n.id === 'sys-expiry-warning';
                  return !isPending && !isAlert;
                }).length})</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              
              {/* Browser notification activation card */}
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 p-4 rounded-2xl text-center space-y-2.5">
                  <p className="text-xs font-black text-blue-900 dark:text-blue-300">هل تود تفعيل التنبيهات الفورية؟ 🔔</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    تلقّ إشعارات مباشرة على سطح المكتب عند انخفاض المخزون أو اقتراب انتهاء الصلاحية حتى لو كان التطبيق مغلقاً (Background Service Worker).
                  </p>
                  <button
                    onClick={() => {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          addToast('✓ تم تفعيل تنبيهات المتصفح بنجاح!', 'success');
                          new Notification('نظام المدى الذكي WMS 🔔', {
                            body: 'تم تفعيل التنبيهات الفورية وبث المخزون الخلفي بنجاح.',
                            icon: '/icon.svg'
                          });
                        }
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] py-2 px-4 rounded-xl shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 inline-block"
                  >
                    السماح بالتنبيهات الآن
                  </button>
                </div>
              )}

              {/* SECTION 1: INTERACTIVE SYSTEM ALERTS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {currentLanguage === 'ar' ? 'التنبيهات والفعاليات' : 'Active Critical Alerts'}
                </h4>

                {filteredNotifications.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-950/30 p-6 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                    {currentLanguage === 'ar' 
                      ? (notifications.length === 0 ? '✅ كل شيء ممتاز! لا توجد تنبيهات نشطة حالياً.' : 'ℹ️ لا توجد تنبيهات نشطة حالياً تحت هذا التصنيف.')
                      : (notifications.length === 0 ? '✅ Perfect! No active alerts currently.' : 'ℹ️ No active alerts under this category.')
                    }
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredNotifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          // Mark as read
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          // Route if applicable
                          if (notif.id === 'sys-low-stock') {
                            setActiveTab('home');
                            setIsNotificationsOpen(false);
                          } else if (notif.id === 'sys-expiry-warning') {
                            setActiveTab('items');
                            setIsNotificationsOpen(false);
                          } else if (notif.id === 'sys-transfer-warning') {
                            setActiveTab('transfers');
                            setIsNotificationsOpen(false);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all relative group text-right flex items-start gap-3 cursor-pointer ${
                          notif.read 
                            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-75' 
                            : 'bg-white dark:bg-slate-850 shadow-xs border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        {/* Type indicator icon */}
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          notif.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                          notif.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                          notif.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {notif.type === 'error' ? <Calendar size={15} /> :
                           notif.type === 'warning' ? <AlertTriangle size={15} /> :
                           notif.type === 'success' ? <CheckCircle size={15} /> :
                           <Info size={15} />}
                        </div>

                        {/* Content */}
                        <div className="space-y-1 flex-1 text-right">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-bold text-slate-400 font-mono">{notif.time}</span>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {notif.title}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {notif.body}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notif.read && (
                          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}

                        {/* Dismiss action button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications(prev => prev.filter(n => n.id !== notif.id));
                            addToast(currentLanguage === 'ar' ? '✓ تم حذف التنبيه' : '✓ Notification dismissed', 'info');
                          }}
                          className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                          title={currentLanguage === 'ar' ? 'حذف الإشعار' : 'Dismiss'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: RECENT AUDIT LOGS / EVENTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {currentLanguage === 'ar' ? 'أحدث سجلات الفعاليات والعمليات' : 'Recent Event & Activity Logs'}
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.slice(0, 10).map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-800/80 rounded-2xl text-right transition-all flex items-start gap-2.5`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                        log.action === 'add' ? 'bg-emerald-500' : log.action === 'delete' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{log.timestamp.split('T')[0] || log.timestamp}</span>
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">بواسطة: {log.user}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed truncate">
                          {log.details}
                        </p>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 inline-block font-mono">
                          {log.section}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* More Menu Floating Popup */}
      {isMoreMenuOpen && (
        <div className="fixed bottom-22 left-4 right-4 max-w-sm mx-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-4.5 z-45 animate-fade-in print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-500 stroke-[2.5]" />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                {currentLanguage === 'ar' ? 'خيارات إضافية' : 'More Options'}
              </span>
            </div>
            <button
              onClick={() => setIsMoreMenuOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5">
            {/* Tab: التقرير */}
            {currentUser.permissions.reports !== 'none' && (
              <button
                onClick={() => {
                  setActiveTab('report');
                  setIsMoreMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <TrendingUp size={15} className="stroke-[2.5]" />
                <span className="text-[10px] font-bold">{t.navReport}</span>
              </button>
            )}

            {/* Tab: السندات */}
            {currentUser.permissions.reports !== 'none' && (
              <button
                onClick={() => {
                  setActiveTab('print');
                  setIsMoreMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText size={15} className="stroke-[2.5]" />
                <span className="text-[10px] font-bold">{t.navPrint}</span>
              </button>
            )}

            {/* Tab: المستودعات */}
            {currentUser.permissions.warehouses !== 'none' && (
              <button
                onClick={() => {
                  setActiveTab('warehouses');
                  setIsMoreMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'warehouses'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <WarehouseIcon size={15} className="stroke-[2.5]" />
                <span className="text-[10px] font-bold">{t.navWarehouses}</span>
              </button>
            )}

            {/* Tab: التحويلات المخزنية */}
            {currentUser.permissions.transfers !== 'none' && (
              <button
                onClick={() => {
                  setActiveTab('transfers');
                  setIsMoreMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                  activeTab === 'transfers'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  {pendingIncomingTransfersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white animate-bounce shadow-xs">
                      {pendingIncomingTransfersCount}
                    </span>
                  )}
                  <Bell size={15} className="stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold">{t.navTransfers}</span>
              </button>
            )}

            {/* Tab: الإعدادات */}
            <button
              onClick={() => {
                setActiveTab('settings');
                setIsMoreMenuOpen(false);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                  : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <SettingsIcon size={15} className="stroke-[2.5]" />
              <span className="text-[10px] font-bold">{t.navSettings}</span>
            </button>

            {/* Tab: حول التطبيق */}
            <button
              onClick={() => {
                setShowAboutModal(true);
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
            >
              <Info size={15} className="stroke-[2.5] text-blue-500" />
              <span className="text-[10px] font-bold">{t.navAbout}</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 px-2 z-40 print:hidden shadow-lg rounded-t-3xl dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl w-full mx-auto flex items-center justify-around">
          
          {/* Tab: الرئيسية */}
          <button
            onClick={() => {
              setActiveTab('home');
              setIsMoreMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer group relative ${
              activeTab === 'home' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">{t.navHome}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none border border-white/10 text-center">
              {currentLanguage === 'ar' ? 'لوحة التحكم الإحصائية العامة للعمليات 📊' : 'Operations Dashboard 📊'}
            </div>
          </button>
 
          {/* Tab: الأصناف */}
          {currentUser.permissions.items !== 'none' && (
            <button
              onClick={() => {
                setActiveTab('items');
                setIsMoreMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer group relative ${
                activeTab === 'items' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <BoxIcon size={20} className={activeTab === 'items' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navItems}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none border border-white/10 text-center">
                {currentLanguage === 'ar' ? 'إدارة وإدخال وتعديل قائمة الأصناف 📦' : 'Items & Catalog Management 📦'}
              </div>
            </button>
          )}
 
          {/* Tab: الحركات */}
          {currentUser.permissions.movements !== 'none' && (
            <button
              onClick={() => {
                setActiveTab('movements');
                setIsMoreMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer group relative ${
                activeTab === 'movements' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <ArrowLeftRight size={20} className={activeTab === 'movements' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navMovements}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none border border-white/10 text-center">
                {currentLanguage === 'ar' ? 'تقييد ومراقبة عمليات التوريد والصرف 🔄' : 'Inward & Outward Movements 🔄'}
              </div>
            </button>
          )}
 
          {/* Tab: الجرد */}
          {currentUser.permissions.reports !== 'none' && (
            <button
              onClick={() => {
                setActiveTab('inventory');
                setIsMoreMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer group relative ${
                activeTab === 'inventory' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <BarChart2 size={20} className={activeTab === 'inventory' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navInventory}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none border border-white/10 text-center">
                {currentLanguage === 'ar' ? 'كشوفات جرد المخزون، النواقص والكميات 📋' : 'Inventory Audits & Reports 📋'}
              </div>
            </button>
          )}

          {/* Tab: المزيد */}
          <button
            onClick={() => setIsMoreMenuOpen(prev => !prev)}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer relative group ${
              ['report', 'print', 'warehouses', 'transfers', 'settings'].includes(activeTab) || isMoreMenuOpen
                ? 'text-blue-600 scale-105' 
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            {pendingIncomingTransfersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white animate-bounce shadow-xs">
                {pendingIncomingTransfersCount}
              </span>
            )}
            <MoreHorizontal size={20} className={['report', 'print', 'warehouses', 'transfers', 'settings'].includes(activeTab) || isMoreMenuOpen ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">{currentLanguage === 'ar' ? 'المزيد ☰' : 'More ☰'}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 hidden group-hover:block bg-slate-950 text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none border border-white/10 text-center">
              {currentLanguage === 'ar' ? 'القائمة الإضافية: المستودعات، الإعدادات والسندات ⚙️' : 'More: Warehouses, Settings & Vouchers ⚙️'}
            </div>
          </button>
 
        </div>
      </nav>

      {/* Global Suppliers Modal Manager */}
      <SuppliersModal
        isOpen={isSuppliersOpen}
        onClose={() => setIsSuppliersOpen(false)}
        suppliers={suppliers}
        isDataLocked={suppliersLocked}
        onAddSupplier={handleAddSupplier}
        onEditSupplier={handleEditSupplier}
        onDeleteSupplier={handleDeleteSupplier}
      />

      {/* PWA Floating Install Notification Card */}
      {showInstallBtn && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-3xl shadow-2xl border border-blue-500/30 flex items-center justify-between gap-3 relative overflow-hidden" dir="rtl">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📲</span>
              <div className="text-right">
                <h4 className="font-extrabold text-xs">تثبيت تطبيق Inventra WMS</h4>
                <p className="text-[10px] text-blue-100 font-medium mt-0.5">ثبّت التطبيق على شاشتك الرئيسية للوصول السريع بضغطة واحدة.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallApp}
                className="bg-white hover:bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                تثبيت الآن
              </button>
              <button
                onClick={() => setShowInstallBtn(false)}
                className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Toast Notification Component */}
      <Toast 
        toasts={toasts} 
        onClose={removeToast} 
        currentLanguage={currentLanguage} 
      />

      {/* Auto-Lock Idle Time Modal */}
      {isIdleLocked && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6 text-center animate-scale-up">
            <div className="mx-auto bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex items-center justify-center">
              <Lock size={28} className="stroke-[2.5]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-800">🔒 تم قفل الجلسة مؤقتاً لخمول التطبيق</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                لم نكتشف أي حركة منك منذ أكثر من 10 دقائق. لتأمين بيانات مستودعاتك وحمايتها، تم قفل الشاشة مؤقتاً.
              </p>
              <div className="bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-100 font-black text-[10px] inline-block">
                متبقي {idleCountdown} ثانية قبل تسجيل الخروج التلقائي
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsIdleLocked(false);
                  setIdleCountdown(30);
                  addToast(
                    currentLanguage === 'ar' ? '✓ تم تجديد الجلسة بنجاح' : '✓ Session renewed successfully',
                    'success'
                  );
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                العودة ومواصلة العمل
              </button>
              <button
                onClick={() => {
                  setIsIdleLocked(false);
                  handleLogout();
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black py-3 rounded-2xl transition-all cursor-pointer"
              >
                تسجيل الخروج الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit App Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6 text-center animate-scale-up">
            <div className="mx-auto bg-rose-50 text-rose-600 w-14 h-14 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={28} className="stroke-[2.5]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">هل تريد الخروج من التطبيق فعلاً؟ ⚠️</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                سيؤدي ذلك إلى قفل الجلسة وتأمين المستودع، وستحتاج إلى إعادة تسجيل الدخول عند فتح التطبيق مجدداً.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  localStorage.removeItem('wms_current_user');
                  setCurrentUser(null);
                  setShowExitModal(false);
                  addToast(
                    currentLanguage === 'ar' ? '🔒 تم تسجيل خروجك وتأمين المستودع بنجاح' : '🔒 Logged out and secured successfully',
                    'success'
                  );
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-3.5 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                نعم، خروج
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        currentLanguage={currentLanguage}
        isDarkMode={isDarkMode}
      />

    </div>
  );
}
