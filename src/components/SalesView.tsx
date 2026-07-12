import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  X, 
  Check, 
  Search, 
  Lock, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Printer,
  FileText,
  ShoppingBag,
  ShoppingCart,
  Percent,
  Barcode,
  Camera,
  Layers,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { Item, Warehouse, User as UserType, Movement, InvoiceSettings, BankAccount } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number; // outstanding madiuniya
}

interface SalesInvoice {
  id: string;
  customerName: string;
  customerId: string; // 'cash' or registered customer id
  paymentType: 'cash' | 'credit' | 'bank';
  bankAccountId?: string;
  bankAccountName?: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  date: string;
  time: string;
  warehouseId: string;
  createdBy: string;
}

interface SalesViewProps {
  items: Item[];
  customers: Customer[];
  warehouses: Warehouse[];
  treasuryBalance: number;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateTreasuryBalance: (balance: number) => void;
  onAddMovement: (movement: Movement) => void;
  onLogAction?: (
    action: 'add' | 'edit' | 'delete' | 'sync' | 'import' | 'other',
    entityType: 'items' | 'movements' | 'suppliers' | 'warehouses' | 'transfers' | 'system',
    details: string
  ) => void;
  currentUser: UserType;
  isDataLocked: boolean;
  salesInvoices: SalesInvoice[];
  onAddSalesInvoice: (invoice: SalesInvoice) => void;
  movements: Movement[];
  journalEntries?: any[];
  onUpdateJournalEntries?: (entries: any[]) => void;
  bankBalance?: number;
  onUpdateBankBalance?: (balance: number) => void;
  invoiceSettings?: InvoiceSettings;
  onUpdateInvoiceSettings?: (settings: InvoiceSettings) => void;
}

export default function SalesView({
  items,
  customers,
  warehouses,
  treasuryBalance,
  onUpdateCustomers,
  onUpdateTreasuryBalance,
  onAddMovement,
  onLogAction,
  currentUser,
  isDataLocked,
  salesInvoices,
  onAddSalesInvoice,
  movements,
  journalEntries = [],
  onUpdateJournalEntries,
  bankBalance = 7500000,
  onUpdateBankBalance,
  invoiceSettings,
  onUpdateInvoiceSettings,
}: SalesViewProps) {
  // Navigation: POS (فواتير المبيعات) vs Customers (إدارة العملاء) vs History (سجل الفواتير)
  const [subTab, setSubTab] = useState<'pos' | 'customers' | 'history'>('pos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- CUSTOMER STATE ---
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    balance: 0,
  });

  // --- POS CART STATE ---
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || 'main');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cash');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'bank'>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<{ itemId: string; quantity: number; price: number }[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const defaultBankId = invoiceSettings?.bankAccounts?.find(b => b.isDefault)?.id || invoiceSettings?.bankAccounts?.[0]?.id || '';
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(defaultBankId);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  React.useEffect(() => {
    if (!selectedBankAccountId && invoiceSettings?.bankAccounts && invoiceSettings.bankAccounts.length > 0) {
      const def = invoiceSettings.bankAccounts.find(b => b.isDefault)?.id || invoiceSettings.bankAccounts[0].id;
      setSelectedBankAccountId(def);
    }
  }, [invoiceSettings, selectedBankAccountId]);

  // --- INVOICE PRINT PREVIEW STATE ---
  const [activeInvoicePreview, setActiveInvoicePreview] = useState<SalesInvoice | null>(null);

  // --- ACTIONS: CUSTOMER MANAGEMENT ---
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name.trim()) return;

    if (editingCustomer) {
      const updated = customers.map((c) =>
        c.id === editingCustomer.id
          ? { 
              ...c, 
              name: customerFormData.name, 
              phone: customerFormData.phone, 
              email: customerFormData.email, 
              balance: Number(customerFormData.balance) || 0 
            }
          : c
      );
      onUpdateCustomers(updated);
      if (onLogAction) {
        onLogAction('edit', 'suppliers', `تم تعديل بيانات العميل: ${customerFormData.name}`);
      }
    } else {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        name: customerFormData.name,
        phone: customerFormData.phone,
        email: customerFormData.email,
        balance: Number(customerFormData.balance) || 0,
      };
      onUpdateCustomers([...customers, newCustomer]);
      if (onLogAction) {
        onLogAction('add', 'suppliers', `تم تسجيل عميل جديد: ${customerFormData.name} بمديونية مبدئية ${customerFormData.balance} ر.ي`);
      }
    }

    setCustomerFormData({ name: '', phone: '', email: '', balance: 0 });
    setEditingCustomer(null);
    setIsCustomerFormOpen(false);
  };

  const handleEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      balance: c.balance || 0,
    });
    setIsCustomerFormOpen(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف العميل "${name}"؟`)) {
      const updated = customers.filter(c => c.id !== id);
      onUpdateCustomers(updated);
      if (onLogAction) {
        onLogAction('delete', 'suppliers', `تم حذف العميل: ${name}`);
      }
    }
  };

  // --- ACTIONS: POS SYSTEM ---
  const handleAddToCart = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Check inventory availability in chosen warehouse using global movements
    const totalInward = movements.filter(m => m.itemId === itemId && m.type === 'in' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
    const totalOutward = movements.filter(m => m.itemId === itemId && m.type === 'out' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
    const availableQty = totalInward - totalOutward;

    const cartItem = cart.find(ci => ci.itemId === itemId);
    const requestedQty = (cartItem?.quantity || 0) + 1;

    if (requestedQty > availableQty) {
      alert(`⚠️ عذراً! الكمية المتاحة من الصنف "${item.name}" في هذا المستودع هي ${availableQty} ${item.unit || 'حبة'} فقط.`);
      return;
    }

    if (cartItem) {
      setCart(prev => prev.map(ci => ci.itemId === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci));
    } else {
      setCart(prev => [...prev, { itemId, quantity: 1, price: item.price || 0 }]);
    }
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(ci => ci.itemId !== itemId));
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Check inventory availability in chosen warehouse using global movements
    const totalInward = movements.filter(m => m.itemId === itemId && m.type === 'in' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
    const totalOutward = movements.filter(m => m.itemId === itemId && m.type === 'out' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
    const availableQty = totalInward - totalOutward;

    if (newQty > availableQty) {
      alert(`⚠️ عذراً! الكمية المتاحة من الصنف "${item.name}" في هذا المستودع هي ${availableQty} ${item.unit || 'حبة'} فقط.`);
      return;
    }

    setCart(prev => prev.map(ci => ci.itemId === itemId ? { ...ci, quantity: newQty } : ci));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.itemId !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
  };

  const handleBarcodeScan = (scannedItemId: string) => {
    const item = items.find(i => i.id.toLowerCase() === scannedItemId.toLowerCase());
    if (item) {
      handleAddToCart(item.id);
    } else {
      alert('⚠️ لم يتم العثور على أي صنف مطابق للرمز الشريطي الممسوح.');
    }
    setIsScannerOpen(false);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('الرجاء إضافة أصناف إلى سلة المبيعات أولاً!');
      return;
    }

    if (paymentType === 'credit' && selectedCustomerId === 'cash') {
      alert('⚠️ لا يمكن بيع آجل لزبون نقدي عام! الرجاء اختيار عميل مسجل لتسجيل المديونية على حسابه.');
      return;
    }

    // Calculations
    const subtotal = cart.reduce((sum, ci) => sum + (ci.quantity * ci.price), 0);
    const taxRatePercent = invoiceSettings?.taxEnabled ? (invoiceSettings?.taxRate ?? 0) : 0;
    const tax = Math.round(subtotal * (taxRatePercent / 100));
    const total = Math.max(0, subtotal + tax - discountAmount);

    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    const customer = customers.find(c => c.id === selectedCustomerId);
    const customerName = selectedCustomerId === 'cash' ? 'زبون نقدي عام' : (customer?.name || 'عميل مسجل');

    const selectedBank = invoiceSettings?.bankAccounts?.find(b => b.id === selectedBankAccountId) || invoiceSettings?.bankAccounts?.[0];
    const bankAccountName = selectedBank ? selectedBank.name : 'حساب البنك الرئيسي';

    const newInvoice: SalesInvoice = {
      id: invoiceId,
      customerId: selectedCustomerId,
      customerName,
      paymentType,
      bankAccountId: paymentType === 'bank' ? selectedBank?.id : undefined,
      bankAccountName: paymentType === 'bank' ? bankAccountName : undefined,
      items: cart.map(ci => ({
        itemId: ci.itemId,
        name: items.find(i => i.id === ci.itemId)?.name || 'صنف غير معروف',
        quantity: ci.quantity,
        price: ci.price
      })),
      subtotal,
      discount: discountAmount,
      tax,
      total,
      date: new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'numeric', day: 'numeric' }),
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      warehouseId: selectedWarehouseId,
      createdBy: currentUser.username
    };

    // 1. Save Sales Invoice to history
    onAddSalesInvoice(newInvoice);

    // 2. Generate Outward Movements for each item in the cart to update warehouse inventory
    cart.forEach(ci => {
      const movementId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
      onAddMovement({
        id: movementId,
        itemId: ci.itemId,
        quantity: ci.quantity,
        type: 'out',
        partner: `فاتورة مبيعات رقم ${invoiceId} - للعميل ${customerName}`,
        date: new Date().toISOString().split('T')[0],
        warehouseId: selectedWarehouseId,
        paymentType,
        financialApproval: 'approved'
      });
    });

    // 3. Financial Impact & Automatic Journal Entries
    if (paymentType === 'cash') {
      // Cash payment -> Update Treasury Balance
      onUpdateTreasuryBalance(treasuryBalance + total);
    } else if (paymentType === 'bank') {
      // Bank payment -> Update specific Bank Account Balance
      if (invoiceSettings && onUpdateInvoiceSettings) {
        const updatedAccounts = (invoiceSettings.bankAccounts || []).map(b => {
          if (b.id === (selectedBank?.id || '')) {
            return { ...b, balance: b.balance + total };
          }
          return b;
        });
        onUpdateInvoiceSettings({
          ...invoiceSettings,
          bankAccounts: updatedAccounts
        });
      }
      if (onUpdateBankBalance) {
        onUpdateBankBalance((bankBalance || 0) + total);
      }
    } else {
      // Credit payment -> Update Customer Balance (outstanding debt)
      if (customer) {
        const updatedCustomers = customers.map(c => 
          c.id === selectedCustomerId 
            ? { ...c, balance: (c.balance || 0) + total } 
            : c
        );
        onUpdateCustomers(updatedCustomers);
      }
    }

    // 3.5 Generate double-entry journal entry
    if (onUpdateJournalEntries && journalEntries) {
      const entryId = `ENT-${Date.now().toString().slice(-6)}`;
      let debitAccount = 'الخزينة العامة';
      if (paymentType === 'bank') {
        debitAccount = `حـ/ البنك - ${bankAccountName}`;
      } else if (paymentType === 'credit') {
        debitAccount = `حساب العميل: ${customerName}`;
      }

      const newJournalEntry = {
        id: entryId,
        date: new Date().toISOString().split('T')[0],
        notes: `قيد تلقائي - فاتورة مبيعات رقم ${invoiceId} للعميل ${customerName} (${paymentType === 'cash' ? 'نقدي' : paymentType === 'bank' ? `تحويل إلى ${bankAccountName}` : 'آجل'})`,
        reference: invoiceId,
        createdBy: currentUser.username,
        lines: [
          {
            account: debitAccount,
            debit: total,
            credit: 0
          },
          {
            account: 'حساب المبيعات',
            debit: 0,
            credit: total
          }
        ],
        isReversed: false
      };

      onUpdateJournalEntries([newJournalEntry, ...journalEntries]);
    }

    // 4. Log Action
    if (onLogAction) {
      let payMethodText = 'نقداً - تمت تسوية الخزينة';
      if (paymentType === 'bank') {
        payMethodText = `تحويل بنكي إلى (${bankAccountName}) - تم إيداعها بحساب البنك`;
      } else if (paymentType === 'credit') {
        payMethodText = `آجلاً - قيدت على حساب العميل: ${customerName}`;
      }

      onLogAction(
        'add',
        'movements',
        `تصدير وإصدار فاتورة مبيعات رقم ${invoiceId} بمبلغ ${total.toLocaleString()} ر.ي (${payMethodText}) وجرى توليد القيد المحاسبي المزدوج تلقائياً.`
      );
    }

    // Reset Cart & Show print layout
    setCart([]);
    setDiscountAmount(0);
    setActiveInvoicePreview(newInvoice);
  };

  // --- FILTERS ---
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredInvoices = salesInvoices.filter(inv =>
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.id.localeCompare(a.id));

  // --- STATS ---
  const totalSalesRevenue = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCashSales = salesInvoices.filter(i => i.paymentType === 'cash').reduce((sum, inv) => sum + inv.total, 0);
  const totalCreditSales = salesInvoices.filter(i => i.paymentType === 'credit').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-blue-600 stroke-[2.5]" size={24} />
            <span>نظام المبيعات ونقاط البيع الفورية</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            إصدار فواتير مبيعات سريعة للمشترين والعملاء وتحديث مخزون المستودعات والخزينة والمديونيات في حركة مالية واحدة متزامنة آلياً.
          </p>
        </div>

        {subTab === 'customers' && !isCustomerFormOpen && !isDataLocked && (
          <button
            onClick={() => {
              setEditingCustomer(null);
              setCustomerFormData({ name: '', phone: '', email: '', balance: 0 });
              setIsCustomerFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer self-start sm:self-auto hover:scale-[1.02]"
          >
            <Plus size={18} className="stroke-[3]" />
            <span>إضافة عميل جديد</span>
          </button>
        )}
      </div>

      {/* Nav Subtabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 rounded-2xl w-full sm:w-fit gap-2">
        <button
          onClick={() => { setSubTab('pos'); setSearchQuery(''); }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'pos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🖥️ كاشير ونقطة البيع (POS)
        </button>
        <button
          onClick={() => { setSubTab('customers'); setSearchQuery(''); }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 إدارة وإضافة العملاء
        </button>
        <button
          onClick={() => { setSubTab('history'); setSearchQuery(''); }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📜 سجل فواتير المبيعات الصادرة
        </button>
      </div>

      {/* Live Financial Board for Sales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales */}
        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">إجمالي مبيعات الفترة</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
              {totalSalesRevenue.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
            </h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Cash Sales */}
        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">مبيعات نقدية (مسواة بالخزينة)</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
              {totalCashSales.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Credit Sales */}
        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">مبيعات آجلة (مديونيات عملاء)</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
              {totalCreditSales.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
            </h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <ArrowUpRight size={24} />
          </div>
        </div>
      </div>

      {isDataLocked && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
            <Lock size={16} className="stroke-[2.5]" />
          </div>
          <div className="text-xs font-bold leading-relaxed text-right">
            وضع القراءة فقط نشط: تم قفل البيانات في الإعدادات لمنع تسجيل عمليات بيع أو فواتير مبيعات جديدة.
          </div>
        </div>
      )}

      {/* -------------------- VIEW 1: POS SYSTEM -------------------- */}
      {subTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* POS Cart Sidebar / Checkout Form (lg:span-5) */}
          <div className="lg:col-span-5 bg-white border border-slate-150 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingCart className="text-blue-600" size={18} />
                <span>سلة المبيعات الحالية</span>
              </span>
              <button 
                type="button" 
                onClick={handleClearCart}
                className="text-slate-400 hover:text-red-500 text-xs font-bold hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                تفريغ السلة &times;
              </button>
            </div>

            {/* Selected Items List */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold space-y-1">
                  <p>🛒 سلة المبيعات فارغة.</p>
                  <p className="text-[10px] text-slate-400 font-bold">اختر سلعاً من القائمة الجانبية لإضافتها هنا.</p>
                </div>
              ) : (
                cart.map((ci) => {
                  const item = items.find(i => i.id === ci.itemId);
                  return (
                    <div key={ci.itemId} className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-right min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-800 truncate">{item?.name || 'صنف غير معروف'}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{ci.price.toLocaleString()} ر.ي</p>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-8">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(ci.itemId, ci.quantity - 1)}
                          className="px-2 bg-slate-50 text-slate-600 hover:bg-slate-100 h-full font-bold text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 font-mono text-xs font-black text-slate-700 min-w-[30px] text-center">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(ci.itemId, ci.quantity + 1)}
                          className="px-2 bg-slate-50 text-slate-600 hover:bg-slate-100 h-full font-bold text-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Total and delete */}
                      <div className="text-left shrink-0 font-mono font-bold text-xs text-slate-700">
                        {(ci.quantity * ci.price).toLocaleString()}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(ci.itemId)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded-md"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* POS Checkout Controls Form */}
            <form onSubmit={handleCheckout} className="border-t border-slate-100 pt-4 space-y-4">
              
              {/* Select Warehouse */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">مستودع الخروج المخزني *</label>
                <select
                  required
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    setSelectedWarehouseId(e.target.value);
                    setCart([]); // Clear cart to avoid mismatch with other warehouse quantities
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Customer */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">العميل / المشتري *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value === 'cash') {
                      setPaymentType('cash');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold"
                >
                  <option value="cash">🛒 زبون نقدي عام (تسويه الخزينة فوراً)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>👥 {c.name} (رصيد مديونيته: {(c.balance || 0).toLocaleString()} ر.ي)</option>
                  ))}
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">طريقة السداد المالي</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                      paymentType === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    💵 نقدي (الخزينة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('bank')}
                    className={`py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                      paymentType === 'bank'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    🏦 بنك / شبكة
                  </button>
                  <button
                    type="button"
                    disabled={selectedCustomerId === 'cash'}
                    onClick={() => setPaymentType('credit')}
                    className={`py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                      paymentType === 'credit'
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'border-slate-200 text-slate-300'
                    } ${selectedCustomerId === 'cash' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ⏳ آجل (العميل)
                  </button>
                </div>
              </div>

              {/* Bank Selection Dropdown (Only shown when "bank" is selected) */}
              {paymentType === 'bank' && (() => {
                const selectedBank = (invoiceSettings?.bankAccounts || []).find(b => b.id === selectedBankAccountId);
                const filteredBanks = (invoiceSettings?.bankAccounts || []).filter(b => 
                  b.name.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
                  b.accountNumber.toLowerCase().includes(bankSearchQuery.toLowerCase())
                );
                return (
                  <div className="animate-fade-in bg-blue-50/30 p-3 rounded-2xl border border-blue-100/50 space-y-1.5 relative">
                    <label className="block text-[10px] sm:text-xs font-extrabold text-blue-700">تحديد البنك / الحساب المودع إليه *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                        className="w-full bg-white border border-blue-200 focus:border-blue-500 text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold shadow-3xs flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          🏦 {selectedBank ? `${selectedBank.name} (حساب: ${selectedBank.accountNumber})` : 'اختر البنك من القائمة...'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </button>

                      {isBankDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBankDropdownOpen(false)}></div>
                          <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                            <input
                              type="text"
                              autoFocus
                              placeholder="ابحث باسم البنك أو رقم الحساب..."
                              value={bankSearchQuery}
                              onChange={(e) => setBankSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-hidden focus:border-blue-500 text-right"
                            />
                            <div className="space-y-0.5">
                              {filteredBanks.map(b => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBankAccountId(b.id);
                                    setIsBankDropdownOpen(false);
                                    setBankSearchQuery('');
                                  }}
                                  className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                                    selectedBankAccountId === b.id ? 'bg-blue-50/50 text-blue-800' : 'text-slate-600'
                                  }`}
                                >
                                  <span>🏦 {b.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">حساب: {b.accountNumber}</span>
                                </button>
                              ))}
                              {filteredBanks.length === 0 && (
                                <div className="text-center py-3 text-[10px] text-slate-400 font-bold">
                                  لا توجد بنوك مطابقة للبحث
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Discount */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">الخصم / الخصومات (ر.ي)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-4 py-2.5 rounded-xl outline-hidden text-slate-700 font-mono font-bold"
                  placeholder="0"
                />
              </div>

              {/* Dynamic Bill Total Details Box */}
              <div className="bg-slate-900 text-white p-4.5 rounded-2xl space-y-2 border border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">{cart.reduce((sum, ci) => sum + (ci.quantity * ci.price), 0).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono">{Math.round(cart.reduce((sum, ci) => sum + (ci.quantity * ci.price), 0) * 0.15).toLocaleString()} ر.ي</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-rose-400">
                    <span>خصومات مسموح بها:</span>
                    <span className="font-mono">-{discountAmount.toLocaleString()} ر.ي</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="text-blue-400">المطلوب سداده:</span>
                  <span className="font-mono text-base text-yellow-300">
                    {Math.max(0, cart.reduce((sum, ci) => sum + (ci.quantity * ci.price), 0) + Math.round(cart.reduce((sum, ci) => sum + (ci.quantity * ci.price), 0) * 0.15) - discountAmount).toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDataLocked || cart.length === 0}
                className={`w-full text-center py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                  isDataLocked || cart.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-[1.01]'
                }`}
              >
                <Check size={16} className="stroke-[3]" />
                <span>تأكيد وإصدار فاتورة البيع المعتمدة</span>
              </button>

            </form>
          </div>

          {/* POS Items Grid List (lg:span-7) */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">قائمة المنتجات والسلع المتوفرة للتصدير</span>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الباركود..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 pr-8 rounded-xl outline-hidden text-slate-700"
                  />
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-xl border border-blue-100 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Camera size={14} />
                  <span className="text-[10px] font-bold">باركود الكاميرا</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[550px] overflow-y-auto pr-1">
              {items.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                item.id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((item) => {
                // Calculate inventory in chosen warehouse using global movements
                const totalInward = movements.filter(m => m.itemId === item.id && m.type === 'in' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
                const totalOutward = movements.filter(m => m.itemId === item.id && m.type === 'out' && m.warehouseId === selectedWarehouseId).reduce((sum, m) => sum + m.quantity, 0);
                const stock = totalInward - totalOutward;
                const isOutOfStock = stock <= 0;

                return (
                  <div 
                    key={item.id}
                    onClick={() => !isOutOfStock && handleAddToCart(item.id)}
                    className={`border rounded-2xl p-3.5 text-right flex flex-col justify-between gap-3.5 transition-all relative ${
                      isOutOfStock 
                        ? 'bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-xs cursor-pointer active:scale-95'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded-md font-mono">{item.id}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          المخزون: {stock} {item.unit || 'حبة'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 line-clamp-1">{item.name}</h4>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-xs font-black text-slate-800 font-mono">
                        {(item.price || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">ر.ي</span>
                      </span>
                      <span className="text-[9px] text-blue-600 font-bold hover:underline">
                        {isOutOfStock ? '⚠️ نافذ' : 'اضافة للسلة +'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* -------------------- VIEW 2: CUSTOMER MANAGEMENT -------------------- */}
      {subTab === 'customers' && (
        <div className="space-y-6">
          
          {/* Customer Add/Edit Form inside panel */}
          {isCustomerFormOpen && (
            <form onSubmit={handleCustomerSubmit} className="bg-white border border-slate-150 rounded-3xl p-6 space-y-4 shadow-xs animate-slide-down">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}
                </h4>
                <button 
                  type="button"
                  onClick={() => setIsCustomerFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5">اسم العميل / المحل التجاري *</label>
                  <input
                    type="text"
                    required
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all"
                    placeholder="مثال: مؤسسة المجد التجارية"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5">رقم الجوال</label>
                  <input
                    type="text"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                    placeholder="customer@domain.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5">المديونية المبدئية الحالية (ر.ي) *</label>
                  <input
                    type="number"
                    min="0"
                    value={customerFormData.balance}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, balance: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-mono font-bold transition-all"
                    disabled={!!editingCustomer}
                  />
                  {editingCustomer && (
                    <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                      لتسوية مديونية العميل المالي، يرجى إصدار "سند قبض مالي" من شاشة الحسابات والمالية.
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerFormOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>{editingCustomer ? 'حفظ التعديلات' : 'تسجيل العميل'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Search box for customer list */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-2xl">
              <Search className="text-slate-400" size={16} />
              <input
                type="text"
                placeholder="البحث بالاسم، رقم الهاتف أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-hidden text-xs sm:text-sm text-slate-700 font-bold placeholder-slate-400"
              />
            </div>
          </div>

          {/* Customer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                لم يعثر على عملاء مطابقين لعملية البحث.
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const owesMoney = (customer.balance || 0) > 0;
                return (
                  <div key={customer.id} className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xs rounded-3xl p-5 flex flex-col justify-between gap-4.5 transition-all">
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-lg font-mono">{customer.id}</span>
                        {owesMoney ? (
                          <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <ArrowDownLeft size={12} />
                            <span>عليه مديونية</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-black px-2.5 py-1 rounded-lg">خالص الحساب</span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">{customer.name}</h4>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400">المديونية القائمة</p>
                      <p className={`text-base font-black font-mono mt-0.5 ${owesMoney ? 'text-rose-600' : 'text-slate-600'}`}>
                        {(customer.balance || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">ر.ي</span>
                      </p>
                    </div>

                    {/* Contact detail list */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      {customer.phone && <p dir="ltr" className="text-right flex items-center gap-2"><Phone size={11} /> {customer.phone}</p>}
                      {customer.email && <p dir="ltr" className="text-right flex items-center gap-2 truncate"><Mail size={11} /> {customer.email}</p>}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="flex gap-1.5">
                        {!isDataLocked && (
                          <>
                            <button
                              onClick={() => handleEditCustomer(customer)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                              title="تعديل العميل"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              title="حذف العميل"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold font-mono">WMS DEBT CUSTOMER</span>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* -------------------- VIEW 3: INVOICE HISTORY -------------------- */}
      {subTab === 'history' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-2xl">
              <Search className="text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم العميل أو محرر الفاتورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-hidden text-xs sm:text-sm text-slate-700 font-bold placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInvoices.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
                لا توجد فواتير مبيعات مسجلة ومطابقة لخيارات الفلترة الحالية.
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div key={inv.id} className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4 shadow-3xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-blue-600 font-mono">#{inv.id}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        inv.paymentType === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        inv.paymentType === 'bank' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {inv.paymentType === 'cash' ? '💵 نقدي' : inv.paymentType === 'bank' ? '🏦 بنك' : '⏳ آجل'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-sm">{inv.customerName}</h4>
                    <div className="text-[11px] text-slate-400 font-bold space-y-1">
                      <p>المستودع: {warehouses.find(w => w.id === inv.warehouseId)?.name || inv.warehouseId}</p>
                      <p>محرر الفاتورة: {inv.createdBy}</p>
                      <p className="font-mono">التاريخ: {inv.date} {inv.time}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center border border-slate-100/60">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400">قيمة الفاتورة النهائية</p>
                      <p className="text-sm font-black font-mono text-slate-800">{inv.total.toLocaleString()} ر.ي</p>
                    </div>

                    <button
                      onClick={() => setActiveInvoicePreview(inv)}
                      className="bg-white border border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>عرض وطباعة</span>
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* -------------------- INVOICE PRINT DIALOG PREVIEW -------------------- */}
      {activeInvoicePreview && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-blue-500" />
                <span className="font-extrabold text-sm sm:text-base">فاتورة مبيعات معتمدة ونقطة بيع</span>
              </div>
              <button 
                onClick={() => setActiveInvoicePreview(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Print Section Content */}
            <div className="p-8 space-y-6 bg-slate-50/50 overflow-y-auto max-h-[65vh]" id="sales-print-area">
              <div className="border-4 border-dashed border-slate-200 bg-white p-6 rounded-2xl relative">
                
                {/* Header invoice info */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg text-slate-800">شركة المدى للخدمات اللوجستية</h3>
                    <p className="text-[10px] text-slate-400 font-bold">فاتورة مبيعات تجارية رسمية معتمدة</p>
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-mono font-black">
                      {activeInvoicePreview.id}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">{activeInvoicePreview.date}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{activeInvoicePreview.time}</p>
                  </div>
                </div>

                <div className="text-center my-5">
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-5 py-2 rounded-full font-black">
                    فاتورة {activeInvoicePreview.paymentType === 'cash' ? 'مبيعات نقدية' : activeInvoicePreview.paymentType === 'bank' ? 'مبيعات شبكة / بنك' : 'مبيعات آجلة على الحساب'}
                  </span>
                </div>

                {/* Ledger metadata */}
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 border border-slate-100/50">
                  <p><span className="text-slate-400 font-bold">اسم العميل:</span> <strong className="text-slate-800">{activeInvoicePreview.customerName}</strong></p>
                  <p><span className="text-slate-400 font-bold">صندوق المستودع:</span> <strong className="text-slate-800">{warehouses.find(w => w.id === activeInvoicePreview.warehouseId)?.name || activeInvoicePreview.warehouseId}</strong></p>
                  <p><span className="text-slate-400 font-bold">حررها الموظف:</span> <strong className="text-slate-800">{activeInvoicePreview.createdBy}</strong></p>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-right text-xs mt-6 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-black">
                      <th className="p-2 text-right">الصنف والرمز</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-left">السعر</th>
                      <th className="p-2 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {activeInvoicePreview.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-right font-bold text-slate-800">{it.name} <span className="text-[9px] text-slate-400 font-mono">({it.itemId})</span></td>
                        <td className="p-2 text-center font-mono">{it.quantity}</td>
                        <td className="p-2 text-left font-mono">{it.price.toLocaleString()} ر.ي</td>
                        <td className="p-2 text-left font-mono font-bold">{(it.quantity * it.price).toLocaleString()} ر.ي</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="space-y-2 text-xs font-bold text-slate-600 border-t border-slate-200 pt-4 mt-4 w-full md:w-1/2 md:mr-auto text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">المجموع الفرعي:</span>
                    <span className="font-mono">{activeInvoicePreview.subtotal.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">ضريبة القيمة المضافة (15%):</span>
                    <span className="font-mono">{activeInvoicePreview.tax.toLocaleString()} ر.ي</span>
                  </div>
                  {activeInvoicePreview.discount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span className="font-medium">الخصم الممنوح:</span>
                      <span className="font-mono">-{activeInvoicePreview.discount.toLocaleString()} ر.ي</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-slate-100 pt-2 text-slate-800">
                    <span className="text-blue-600">الإجمالي النهائي:</span>
                    <span className="font-mono text-base text-blue-700">{activeInvoicePreview.total.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                {/* Footers */}
                <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[10px] font-bold text-slate-400 border-t border-slate-100 mt-8">
                  <div className="space-y-8">
                    <span>توقيع المستلم / العميل</span>
                    <div className="border-b border-slate-200 w-32 mx-auto"></div>
                  </div>
                  <div className="space-y-8">
                    <span>توقيع الموظف المعتمد</span>
                    <div className="border-b border-slate-200 w-32 mx-auto"></div>
                  </div>
                </div>

                <div className="mt-6 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] text-slate-400 leading-relaxed font-black">
                    💡 تم تسوية مبيعات هذه الفاتورة وتصدير الكميات من مخزن المستودع تلقائياً وتحديث دفاتر المالية في النظام. شكراً لتعاملكم معنا!
                  </p>
                </div>

              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between items-center">
              <button
                onClick={() => { window.print(); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer size={14} />
                <span>طباعة الفاتورة 🖨️</span>
              </button>

              <button
                onClick={() => setActiveInvoicePreview(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        onScan={handleBarcodeScan}
      />

    </div>
  );
}
