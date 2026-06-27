export interface Item {
  id: string; // e.g., 'PROD-001'
  name: string;
  safetyLimit: number;
  unit: string;
  price: number;
}

export interface Movement {
  id: number; // e.g., 1001, 1002
  itemId: string;
  quantity: number;
  type: 'in' | 'out'; // 'in' = وارد, 'out' = صرف
  partner: string; // Supplier (المورد) or Client (العميل)
  date: string; // YYYY-MM-DD
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export type TabType = 'home' | 'items' | 'movements' | 'inventory' | 'report' | 'print';

export type ReportFilterType = 'monthly' | 'items' | 'suppliers';

// Initial data corresponding exactly to the provided screenshots
export const INITIAL_ITEMS: Item[] = [
  {
    id: 'PROD-001',
    name: 'شاحن متنقل بقوة 20 واط',
    safetyLimit: 10,
    unit: 'حبة',
    price: 45,
  },
  {
    id: 'PROD-002',
    name: 'سماعة بلوتوث لاسلكية',
    safetyLimit: 15,
    unit: 'حبة',
    price: 85,
  },
  {
    id: 'PROD-003',
    name: 'كابل شحن سريع 1.2 متر',
    safetyLimit: 30,
    unit: 'حبة',
    price: 15,
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
