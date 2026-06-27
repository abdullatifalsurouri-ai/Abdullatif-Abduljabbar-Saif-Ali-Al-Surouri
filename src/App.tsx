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
  RefreshCw
} from 'lucide-react';
import { 
  TabType, 
  Item, 
  Movement, 
  Supplier, 
  User,
  INITIAL_ITEMS, 
  INITIAL_SUPPLIERS, 
  INITIAL_MOVEMENTS 
} from './types';

// Import our modular subviews
import HomeView from './components/HomeView';
import ItemsView from './components/ItemsView';
import MovementsView from './components/MovementsView';
import InventoryView from './components/InventoryView';
import ReportView from './components/ReportView';
import PrintView from './components/PrintView';
import SuppliersModal from './components/SuppliersModal';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import Toast, { ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wms_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('wms_theme') === 'dark';
  });
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('wms_lang') as 'ar' | 'en') || 'ar';
  });

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

  const [isDataLocked, setIsDataLocked] = useState<boolean>(() => {
    return localStorage.getItem('wms_is_data_locked') === 'true';
  });

  // Internet connectivity state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
          movements: currentMovements
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
    const pushOk = await pushDataToServer(items, suppliers, movements, false);
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
        pushDataToServer(items, suppliers, movements);
      }, 1500); // 1.5 seconds debounce
      return () => clearTimeout(delayFn);
    }
  }, [items, suppliers, movements, isOnline, currentUser]);

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
    localStorage.removeItem('wms_current_user');
    setCurrentUser(null);
    setActiveTab('home');
  };

  // User permission-aware lock status calculations
  // Reuses the existing client locking logic to enforce role permissions elegantly
  const itemsLocked = isDataLocked || !currentUser || currentUser.permissions.items === 'read' || currentUser.permissions.items === 'none';
  const movementsLocked = isDataLocked || !currentUser || currentUser.permissions.movements === 'read' || currentUser.permissions.movements === 'none';
  const suppliersLocked = isDataLocked || !currentUser || currentUser.permissions.suppliers === 'read' || currentUser.permissions.suppliers === 'none';

  // Handler functions for adding/modifying/deleting items
  const handleAddItem = (item: Item) => {
    if (itemsLocked) return;
    setItems((prev) => [...prev, item]);
    addToast(
      currentLanguage === 'ar' 
        ? `تم إضافة الصنف "${item.name}" بنجاح وجاري التزامن...` 
        : `Successfully added item "${item.name}". Syncing...`, 
      'success'
    );
  };

  const handleEditItem = (updatedItem: Item) => {
    if (itemsLocked) return;
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    addToast(
      currentLanguage === 'ar' 
        ? `تم تحديث الصنف "${updatedItem.name}" بنجاح وجاري التزامن...` 
        : `Successfully updated item "${updatedItem.name}". Syncing...`, 
      'success'
    );
  };

  const handleDeleteItem = (id: string) => {
    if (itemsLocked) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMovements((prev) => prev.filter((m) => m.itemId !== id));
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
    addToast(
      currentLanguage === 'ar' 
        ? `تم تسجيل الحركة المخزنية بنجاح وجاري التزامن...` 
        : `Registered movement successfully. Syncing...`, 
      'success'
    );
  };

  const handleDeleteMovement = (id: number) => {
    if (movementsLocked) return;
    setMovements((prev) => prev.filter((m) => m.id !== id));
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
    addToast(
      currentLanguage === 'ar' 
        ? `تم تحديث المورد "${updatedSupplier.name}" بنجاح وجاري التزامن...` 
        : `Successfully updated supplier "${updatedSupplier.name}". Syncing...`, 
      'success'
    );
  };

  const handleDeleteSupplier = (id: string) => {
    if (suppliersLocked) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    addToast(
      currentLanguage === 'ar' 
        ? 'تم حذف المورد بنجاح!' 
        : 'Successfully deleted supplier!', 
      'success'
    );
  };

  // Reset and initialize back to factory default
  const handleResetAllDataOnServer = () => {
    setItems(INITIAL_ITEMS);
    setSuppliers(INITIAL_SUPPLIERS);
    setMovements(INITIAL_MOVEMENTS);
    localStorage.removeItem('wms_item_groups');
    setTimeout(() => {
      pushDataToServer(INITIAL_ITEMS, INITIAL_SUPPLIERS, INITIAL_MOVEMENTS);
    }, 200);
  };

  // If user is not logged in, force elegant login screen
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={handleLoginSuccess} 
        currentLanguage={currentLanguage} 
        onLanguageChange={setCurrentLanguage} 
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
              if (tab === 'items' && currentUser.permissions.items === 'none') return;
              if (tab === 'movements' && currentUser.permissions.movements === 'none') return;
              if ((tab === 'inventory' || tab === 'report' || tab === 'print') && currentUser.permissions.reports === 'none') return;
              setActiveTab(tab);
            }}
            onOpenSuppliers={() => {
              if (currentUser.permissions.suppliers !== 'none') {
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
          />
        );
      case 'items':
        if (currentUser.permissions.items === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الأصناف غير متاح لحسابك الحالي.</div>;
        return (
          <ItemsView
            items={items}
            movements={movements}
            isDataLocked={itemsLocked}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        );
      case 'movements':
        if (currentUser.permissions.movements === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الحركات غير متاح لحسابك الحالي.</div>;
        return (
          <MovementsView
            movements={movements}
            items={items}
            suppliers={suppliers}
            isDataLocked={movementsLocked}
            onAddMovement={handleAddMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        );
      case 'inventory':
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الجرد مخفي عن حسابك الحالي.</div>;
        return <InventoryView items={items} movements={movements} />;
      case 'report':
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، التقارير غير متاحة لحسابك الحالي.</div>;
        return <ReportView items={items} movements={movements} suppliers={suppliers} />;
      case 'print':
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، السندات غير متاحة لحسابك الحالي.</div>;
        return <PrintView movements={movements} items={items} />;
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
      navSettings: "الإعدادات"
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
      navSettings: "Settings"
    }
  };

  const t = translations[currentLanguage];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'} flex flex-col pb-24 font-sans select-none transition-colors duration-200`} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Banner (Print-only Hidden or Styled properly) */}
      <header className={`border-b ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} py-4 px-6 sticky top-0 z-40 print:hidden shadow-xs`}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-2xl shadow-xs">
              <Receipt size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-right">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                {t.title}
              </span>
              <span className="text-[8px] text-slate-400 font-bold">
                الموظف الحالي: {currentUser.username} ({currentUser.role})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full ${
              isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              {isDataLocked ? t.readOnly : t.activeStaff}
            </span>
            
            {/* Language Toggle Button */}
            <button
              onClick={() => setCurrentLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={currentLanguage === 'ar' ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}
            >
              <Globe size={16} className="stroke-[2.5]" />
              <span className="text-[10px] uppercase">{currentLanguage === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDarkMode ? <Sun size={18} className="stroke-[2.5]" /> : <Moon size={18} className="stroke-[2.5]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Persistent Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3.5 px-2 z-40 print:hidden shadow-lg rounded-t-3xl dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          
          {/* Tab: الرئيسية */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'home' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">{t.navHome}</span>
          </button>

          {/* Tab: الأصناف */}
          {currentUser.permissions.items !== 'none' && (
            <button
              onClick={() => setActiveTab('items')}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'items' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <BoxIcon size={20} className={activeTab === 'items' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navItems}</span>
            </button>
          )}

          {/* Tab: الحركات */}
          {currentUser.permissions.movements !== 'none' && (
            <button
              onClick={() => setActiveTab('movements')}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'movements' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <ArrowLeftRight size={20} className={activeTab === 'movements' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navMovements}</span>
            </button>
          )}

          {/* Tab: الجرد */}
          {currentUser.permissions.reports !== 'none' && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'inventory' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <BarChart2 size={20} className={activeTab === 'inventory' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navInventory}</span>
            </button>
          )}

          {/* Tab: التقرير */}
          {currentUser.permissions.reports !== 'none' && (
            <button
              onClick={() => setActiveTab('report')}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'report' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <TrendingUp size={20} className={activeTab === 'report' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navReport}</span>
            </button>
          )}

          {/* Tab: السندات */}
          {currentUser.permissions.reports !== 'none' && (
            <button
              onClick={() => setActiveTab('print')}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'print' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <FileText size={20} className={activeTab === 'print' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navPrint}</span>
            </button>
          )}

          {/* Tab: الإعدادات */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'settings' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <SettingsIcon size={20} className={activeTab === 'settings' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">{t.navSettings}</span>
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

      {/* Visual Toast Notification Component */}
      <Toast 
        toasts={toasts} 
        onClose={removeToast} 
        currentLanguage={currentLanguage} 
      />

    </div>
  );
}
