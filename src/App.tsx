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
  Layers
} from 'lucide-react';
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
  INITIAL_AUDIT_LOGS
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
    return localStorage.getItem('wms_theme') === 'dark';
  });
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('wms_lang') as 'ar' | 'en') || 'ar';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          auditLogs: currentAuditLogs
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
  const itemsLocked = isDataLocked || !currentUser || currentUser.permissions.items === 'read' || currentUser.permissions.items === 'none';
  const movementsLocked = isDataLocked || !currentUser || currentUser.permissions.movements === 'read' || currentUser.permissions.movements === 'none';
  const suppliersLocked = isDataLocked || !currentUser || currentUser.permissions.suppliers === 'read' || currentUser.permissions.suppliers === 'none';
  const warehousesLocked = isDataLocked || !currentUser || currentUser.permissions.warehouses === 'read' || currentUser.permissions.warehouses === 'none';
  const transfersLocked = isDataLocked || !currentUser || currentUser.permissions.transfers === 'read' || currentUser.permissions.transfers === 'none';

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
    const item = items.find((i) => i.id === movement.itemId);
    const typeStr = movement.type === 'in' ? 'وارد' : 'صرف';
    logAction(
      'add',
      'movements',
      `تسجيل حركة ${typeStr} للصنف: ${item?.name || movement.itemId} بكمية ${movement.quantity} ${item?.unit || 'حبة'} من/إلى ${movement.partner}`
    );
    addToast(
      currentLanguage === 'ar' 
        ? `تم تسجيل الحركة المخزنية بنجاح وجاري التزامن...` 
        : `Registered movement successfully. Syncing...`, 
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
            currentUser={currentUser}
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
            onImportItems={handleImportItems}
          />
        );
      case 'movements':
        if (currentUser.permissions.movements === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الحركات غير متاح لحسابك الحالي.</div>;
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
        if (currentUser.permissions.warehouses === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح المستودعات غير متاح لحسابك الحالي.</div>;
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
        if (currentUser.permissions.transfers === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تحويلات المستودعات غير متاحة لحسابك الحالي.</div>;
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
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، تصفح الجرد مخفي عن حسابك الحالي.</div>;
        return <InventoryView items={items} movements={movements} warehouses={warehouses} />;
      case 'report':
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، التقارير غير متاحة لحسابك الحالي.</div>;
        return <ReportView items={items} movements={movements} suppliers={suppliers} warehouses={warehouses} />;
      case 'print':
        if (currentUser.permissions.reports === 'none') return <div className="text-center py-12 text-slate-400 font-bold">🔒 عذراً، السندات غير متاحة لحسابك الحالي.</div>;
        return <PrintView movements={movements} items={items} warehouses={warehouses} />;
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
      navWarehouses: "Warehouses",
      navTransfers: "Inventory Transfers",
      navSettings: "Settings"
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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'} flex flex-col pb-24 font-sans select-none transition-colors duration-200`} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Banner (Print-only Hidden or Styled properly) */}
      <header className={`border-b ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} py-4 px-6 sticky top-0 z-40 print:hidden shadow-xs`}>
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl w-full mx-auto flex items-center justify-between">
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

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800 text-teal-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isFullscreen ? (currentLanguage === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit Fullscreen') : (currentLanguage === 'ar' ? 'وضع ملء الشاشة' : 'Fullscreen Mode')}
            >
              {isFullscreen ? <Minimize size={18} className="stroke-[2.5]" /> : <Maximize size={18} className="stroke-[2.5]" />}
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
              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer col-span-2 ${
                activeTab === 'settings'
                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-black'
                  : 'bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <SettingsIcon size={15} className="stroke-[2.5]" />
              <span className="text-[10px] font-bold">{t.navSettings}</span>
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
              onClick={() => {
                setActiveTab('items');
                setIsMoreMenuOpen(false);
              }}
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
              onClick={() => {
                setActiveTab('movements');
                setIsMoreMenuOpen(false);
              }}
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
              onClick={() => {
                setActiveTab('inventory');
                setIsMoreMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'inventory' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <BarChart2 size={20} className={activeTab === 'inventory' ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-[10px] font-black">{t.navInventory}</span>
            </button>
          )}

          {/* Tab: المزيد */}
          <button
            onClick={() => setIsMoreMenuOpen(prev => !prev)}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
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
