export interface Item {
  id: string; // e.g., 'PROD-001'
  name: string;
  safetyLimit: number;
  unit: string;
  price: number;
  currency?: string; // العملة: ر.ي، ر.س، دولار
  category?: string; // التصنيف
  description?: string; // وصف المنتج
  expirationDate?: string; // تاريخ انتهاء الصلاحية
}

export interface Movement {
  id: number; // e.g., 1001, 1002
  itemId: string;
  quantity: number;
  type: 'in' | 'out'; // 'in' = وارد, 'out' = صرف
  partner: string; // Supplier (المورد) or Client (العميل)
  date: string; // YYYY-MM-DD
  photo?: string; // Base64 data URI of captured camera photo
  warehouseId?: string; // Associate movement with a warehouse
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Warehouse {
  id: string; // e.g., WH-001
  name: string;
  manager: string; // Username of manager
  location?: string;
}

export interface WarehouseTransfer {
  id: string; // e.g., TR-1001
  fromWarehouseId: string;
  toWarehouseId: string;
  itemId: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected';
  date: string;
  createdBy: string; // Sender username
  handledBy?: string; // Receiver/Target manager username
  handledDate?: string;
}

export type TabType = 'home' | 'items' | 'movements' | 'inventory' | 'warehouses' | 'transfers' | 'report' | 'print' | 'settings';

export type RoleType = 'Owner' | 'Admin' | 'Storekeeper' | 'Viewer';

export interface UserPermissions {
  items: 'read' | 'write' | 'none';
  movements: 'read' | 'write' | 'none';
  reports: 'read' | 'none';
  suppliers: 'read' | 'write' | 'none';
  settings: 'read' | 'write' | 'none';
  warehouses: 'read' | 'write' | 'none';
  transfers: 'read' | 'write' | 'none';
  // صلاحيات العمليات
  canAddIncoming?: boolean;
  canAddOutgoing?: boolean;
  canApproveTransfer?: boolean;
  canEditPrices?: boolean;
  canImportExportCSV?: boolean;
  canResetSystem?: boolean;
}

export interface User {
  username: string;
  role: RoleType;
  permissions: UserPermissions;
  warehouseId?: string; // Link user with managed warehouse
  maxDevices?: number; // كم عدد الأجهزة المسموح بها لفتح نفس الحساب في نفس الوقت
}

export interface AuditLogEntry {
  id: string;
  username: string;
  role: string;
  action: 'add' | 'edit' | 'delete' | 'sync' | 'import' | 'other';
  entityType: 'items' | 'movements' | 'suppliers' | 'warehouses' | 'transfers' | 'system';
  details: string;
  date: string;
}

export interface SyncPayload {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  transfers: WarehouseTransfer[];
  auditLogs?: AuditLogEntry[];
  groups?: any[]; // optional groups array
}

export type ReportFilterType = 'monthly' | 'top-moving' | 'items' | 'suppliers';

// Initial data corresponding exactly to the provided screenshots
export const INITIAL_ITEMS: Item[] = [
  {
    id: 'PROD-001',
    name: 'شاحن متنقل بقوة 20 واط',
    safetyLimit: 10,
    unit: 'حبة',
    price: 45,
    category: 'شواحن',
    description: 'شاحن سريع يدعم تقنية PD لشحن الأجهزة الذكية بكفاءة وسرعة فائقة.',
  },
  {
    id: 'PROD-002',
    name: 'سماعة بلوتوث لاسلكية',
    safetyLimit: 15,
    unit: 'حبة',
    price: 85,
    category: 'سماعات',
    description: 'سماعة رأس لاسلكية مريحة مع عزل ضوضاء ممتاز وبطارية تدوم طويلاً.',
  },
  {
    id: 'PROD-003',
    name: 'كابل شحن سريع 1.2 متر',
    safetyLimit: 30,
    unit: 'حبة',
    price: 15,
    category: 'كابلات',
    description: 'كابل مقاوم للقطع ومصنوع من النسيج المتين يدعم نقل البيانات والشحن السريع.',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'شركة المدي لإكسسوارات الجوالات',
    phone: '0501234567',
    email: 'info@al-mady.com',
  },
  {
    id: 'SUP-002',
    name: 'مؤسسة المنتج الراقي للتجارة',
    phone: '0559876543',
    email: 'sales@raqi-product.com',
  },
];

export const INITIAL_MOVEMENTS: Movement[] = [
  {
    id: 1001,
    itemId: 'PROD-001',
    quantity: 100,
    type: 'in',
    partner: 'شركة المدي لإكسسوارات الجوالات',
    date: '2026-06-01',
  },
  {
    id: 1002,
    itemId: 'PROD-002',
    quantity: 50,
    type: 'in',
    partner: 'مؤسسة المنتج الراقي للتجارة',
    date: '2026-06-02',
  },
  {
    id: 1003,
    itemId: 'PROD-003',
    quantity: 200,
    type: 'in',
    partner: 'شركة المدي لإكسسوارات الجوالات',
    date: '2026-06-03',
  },
  {
    id: 1004,
    itemId: 'PROD-001',
    quantity: 20,
    type: 'out',
    partner: 'شركة الوفاء للاتصالات',
    date: '2026-06-10',
  },
  {
    id: 1005,
    itemId: 'PROD-002',
    quantity: 42,
    type: 'out',
    partner: 'مكتبة جرير',
    date: '2026-06-12',
  },
  {
    id: 1006,
    itemId: 'PROD-003',
    quantity: 180,
    type: 'out',
    partner: 'المدى المتقدم لخدمات الجوال',
    date: '2026-06-15',
  },
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'WH-001',
    name: 'المستودع الرئيسي - الرياض',
    manager: 'Owner',
    location: 'الرياض - حي الملز',
  },
  {
    id: 'WH-002',
    name: 'مستودع الغربية - جدة',
    manager: 'admin',
    location: 'جدة - المنطقة الصناعية',
  },
];

export const INITIAL_TRANSFERS: WarehouseTransfer[] = [
  {
    id: 'TR-1001',
    fromWarehouseId: 'WH-001',
    toWarehouseId: 'WH-002',
    itemId: 'PROD-001',
    quantity: 15,
    status: 'pending',
    date: '2026-06-25',
    createdBy: 'Owner',
    handledBy: 'admin',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    username: 'System',
    role: 'Owner',
    action: 'other',
    entityType: 'system',
    details: 'تهيئة النظام وتثبيت الإعدادات الافتراضية للمستودع',
    date: '2026-06-27T10:00:00.000Z'
  }
];
