import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  X, 
  Check, 
  Eye, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  User, 
  Warehouse as WarehouseIcon, 
  ShoppingCart, 
  FileCheck, 
  Clipboard, 
  Camera, 
  Maximize2, 
  QrCode, 
  CheckCircle, 
  DollarSign,
  Barcode
} from 'lucide-react';
import { 
  PurchaseRequest, 
  PurchaseOrder, 
  PurchaseInvoice, 
  Item, 
  Supplier, 
  Warehouse, 
  User as UserType, 
  Movement 
} from '../types';
import MovementPhotoCapture from './MovementPhotoCapture';
import BarcodeScannerModal from './BarcodeScannerModal';

interface PurchasesViewProps {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  purchaseInvoices: PurchaseInvoice[];
  items: Item[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  currentUser: UserType;
  isDataLocked: boolean;
  onAddPurchaseRequest: (pr: PurchaseRequest) => void;
  onUpdatePurchaseRequestStatus: (id: string, status: PurchaseRequest['status']) => void;
  onAddPurchaseOrder: (po: PurchaseOrder) => void;
  onUpdatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  onAddPurchaseInvoice: (pi: PurchaseInvoice) => void;
  onUpdatePurchaseInvoiceStatus: (id: string, status: PurchaseInvoice['status']) => void;
  onAddMovement: (m: Movement) => void;
  onUpdateSupplierBalance: (supplierId: string, amount: number) => void;
  onAddSupplier?: (supplier: Supplier) => void;
}

export default function PurchasesView({
  purchaseRequests,
  purchaseOrders,
  purchaseInvoices,
  items,
  suppliers,
  warehouses,
  currentUser,
  isDataLocked,
  onAddPurchaseRequest,
  onUpdatePurchaseRequestStatus,
  onAddPurchaseOrder,
  onUpdatePurchaseOrderStatus,
  onAddPurchaseInvoice,
  onUpdatePurchaseInvoiceStatus,
  onAddMovement,
  onUpdateSupplierBalance,
  onAddSupplier,
}: PurchasesViewProps) {
  const [subTab, setSubTab] = useState<'requests' | 'orders' | 'invoices'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Form openers
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  // New Supplier form fields
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierBalance, setNewSupplierBalance] = useState<number>(0);

  // Active receiving / verification wizard
  const [activeReceivingInvoice, setActiveReceivingInvoice] = useState<PurchaseInvoice | null>(null);
  const [itemReceiptData, setItemReceiptData] = useState<{
    [itemId: string]: {
      receivedQty: number;
      photo: string;
      expirationDate: string;
      alertBeforeMonths: number;
    }
  }>({});

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetItemId, setScannerTargetItemId] = useState<string | null>(null);

  // Form State: Purchase Request
  const [reqItemId, setReqItemId] = useState('');
  const [reqQuantity, setReqQuantity] = useState<number | ''>('');
  const [reqNotes, setReqNotes] = useState('');

  // Form State: Purchase Order
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState<{ itemId: string; quantity: number; price: number }[]>([
    { itemId: '', quantity: 1, price: 0 }
  ]);
  const [orderNotes, setOrderNotes] = useState('');

  // Form State: Purchase Invoice
  const [invoiceSupplierId, setInvoiceSupplierId] = useState('');
  const [invoiceWarehouseId, setInvoiceWarehouseId] = useState('');
  const [invoicePaymentType, setInvoicePaymentType] = useState<'cash' | 'credit'>('credit');
  const [invoiceItems, setInvoiceItems] = useState<{ itemId: string; quantity: number; price: number }[]>([
    { itemId: '', quantity: 1, price: 0 }
  ]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Views & Details Modals
  const [viewingRequest, setViewingRequest] = useState<PurchaseRequest | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);

  // --- HANDLERS ---
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !onAddSupplier) return;

    onAddSupplier({
      id: `SUP-${Date.now()}`,
      name: newSupplierName.trim(),
      phone: newSupplierPhone.trim() || undefined,
      email: newSupplierEmail.trim() || undefined,
      balance: newSupplierBalance || 0,
    });

    // Reset and close
    setNewSupplierName('');
    setNewSupplierPhone('');
    setNewSupplierEmail('');
    setNewSupplierBalance(0);
    setIsAddSupplierOpen(false);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqItemId || !reqQuantity || Number(reqQuantity) <= 0) {
      alert('الرجاء اختيار الصنف وتحديد كمية صالحة!');
      return;
    }

    const pr: PurchaseRequest = {
      id: `PR-${Date.now().toString().slice(-4)}`,
      itemId: reqItemId,
      quantity: Number(reqQuantity),
      unit: items.find(i => i.id === reqItemId)?.unit || 'حبة',
      notes: reqNotes,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      createdBy: currentUser.username,
    };

    onAddPurchaseRequest(pr);
    setIsRequestFormOpen(false);
    // Reset Form
    setReqItemId('');
    setReqQuantity('');
    setReqNotes('');
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId || orderItems.some(item => !item.itemId || item.quantity <= 0)) {
      alert('الرجاء اختيار المورد وإضافة بنود صالحة للطلب!');
      return;
    }

    const po: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      supplierId: orderSupplierId,
      date: new Date().toISOString().split('T')[0],
      items: orderItems,
      status: 'pending',
      notes: orderNotes,
      createdBy: currentUser.username,
    };

    onAddPurchaseOrder(po);
    setIsOrderFormOpen(false);
    // Reset
    setOrderSupplierId('');
    setOrderItems([{ itemId: '', quantity: 1, price: 0 }]);
    setOrderNotes('');
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceSupplierId || !invoiceWarehouseId || invoiceItems.some(item => !item.itemId || item.quantity <= 0)) {
      alert('الرجاء اختيار المورد، مستودع الاستلام، والبنود!');
      return;
    }

    const pi: PurchaseInvoice = {
      id: `PI-${Date.now().toString().slice(-4)}`,
      supplierId: invoiceSupplierId,
      date: new Date().toISOString().split('T')[0],
      items: invoiceItems,
      paymentType: invoicePaymentType,
      financialApproval: 'pending', // معلق مالياً
      status: 'saved', // محفوظة بانتظار استلام أمين المستودع
      warehouseId: invoiceWarehouseId,
      createdBy: currentUser.username,
      notes: invoiceNotes,
    };

    onAddPurchaseInvoice(pi);
    setIsInvoiceFormOpen(false);
    // Reset
    setInvoiceSupplierId('');
    setInvoiceWarehouseId('');
    setInvoicePaymentType('credit');
    setInvoiceItems([{ itemId: '', quantity: 1, price: 0 }]);
    setInvoiceNotes('');
  };

  // Triggered when converting PR to PO
  const convertRequestToOrder = (pr: PurchaseRequest) => {
    setOrderSupplierId(suppliers[0]?.id || '');
    setOrderItems([{ itemId: pr.itemId, quantity: pr.quantity, price: items.find(i => i.id === pr.itemId)?.price || 0 }]);
    onUpdatePurchaseRequestStatus(pr.id, 'ordered');
    setIsOrderFormOpen(true);
    setSubTab('orders');
    setViewingRequest(null);
  };

  // Triggered when converting PO to Invoice
  const convertOrderToInvoice = (po: PurchaseOrder) => {
    setInvoiceSupplierId(po.supplierId);
    setInvoiceWarehouseId(warehouses[0]?.id || '');
    setInvoicePaymentType('credit');
    setInvoiceItems(po.items.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price })));
    onUpdatePurchaseOrderStatus(po.id, 'received');
    setIsInvoiceFormOpen(true);
    setSubTab('invoices');
    setViewingOrder(null);
  };

  // Launch receiving wizard for storekeeper
  const startReceivingWizard = (invoice: PurchaseInvoice) => {
    setActiveReceivingInvoice(invoice);
    // Initialize receipt verification state
    const initialReceipt: typeof itemReceiptData = {};
    invoice.items.forEach(it => {
      const itemDetail = items.find(i => i.id === it.itemId);
      initialReceipt[it.itemId] = {
        receivedQty: it.quantity, // default to matched quantity
        photo: '',
        expirationDate: '',
        alertBeforeMonths: itemDetail?.alertBeforeMonths || 3,
      };
    });
    setItemReceiptData(initialReceipt);
  };

  // Verify and process the receipt of the invoice
  const submitInvoiceReceipt = () => {
    if (!activeReceivingInvoice) return;

    // 1. Double check quantities
    const finalReceiptItems = activeReceivingInvoice.items.map(it => {
      const receipt = itemReceiptData[it.itemId];
      return {
        ...it,
        receivedQty: receipt?.receivedQty || 0,
        photo: receipt?.photo || '',
        expirationDate: receipt?.expirationDate || '',
        alertBeforeMonths: receipt?.alertBeforeMonths || 3,
      };
    });

    const supplier = suppliers.find(s => s.id === activeReceivingInvoice.supplierId);
    const supplierName = supplier?.name || 'مورد خارجي';

    // 2. Loop and generate movements (Ward) to increase warehouse stock
    finalReceiptItems.forEach(rit => {
      if (rit.receivedQty <= 0) return;

      const newMovement: Movement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        itemId: rit.itemId,
        quantity: rit.receivedQty,
        type: 'in', // وارد
        partner: supplierName,
        date: new Date().toISOString().split('T')[0],
        photo: rit.photo || undefined,
        warehouseId: activeReceivingInvoice.warehouseId,
        expirationDate: rit.expirationDate || undefined,
        alertBeforeMonths: rit.alertBeforeMonths,
        paymentType: activeReceivingInvoice.paymentType,
        financialApproval: activeReceivingInvoice.financialApproval,
        purchaseInvoiceId: activeReceivingInvoice.id,
      };

      onAddMovement(newMovement);
    });

    // 3. Update Supplier Balance if Payment Type is "Credit" (آجل)
    // Add invoice total cost to supplier outstanding dues
    if (activeReceivingInvoice.paymentType === 'credit') {
      const totalCost = activeReceivingInvoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      onUpdateSupplierBalance(activeReceivingInvoice.supplierId, totalCost);
    }

    // 4. Update Invoice Status to 'received' and mark financial approval
    onUpdatePurchaseInvoiceStatus(activeReceivingInvoice.id, 'received');

    alert(`✓ تم استلام فاتورة المشتريات رقم ${activeReceivingInvoice.id} بنجاح! وتم ترحيل البضائع وزيادة كميات المخزن تلقائياً، وتحديث كشف حساب المورد.`);
    setActiveReceivingInvoice(null);
  };

  // Barcode quick scan match for receiving items
  const handleBarcodeScanResult = (scannedItemId: string) => {
    if (!activeReceivingInvoice) return;

    const matchedItem = activeReceivingInvoice.items.find(i => i.itemId === scannedItemId);
    if (!matchedItem) {
      alert('⚠️ هذا الصنف الممسوح لا ينتمي لبنود الفاتورة الحالية!');
      setIsScannerOpen(false);
      return;
    }

    // Increment scanned count
    setItemReceiptData(prev => ({
      ...prev,
      [scannedItemId]: {
        ...prev[scannedItemId],
        receivedQty: (prev[scannedItemId]?.receivedQty || 0) + 1
      }
    }));

    alert(`✓ تم التعرف على الصنف وتأكيد مطابقة قطعة واحدة من "${items.find(i => i.id === scannedItemId)?.name}"`);
    setIsScannerOpen(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-blue-600 stroke-[2.5]" size={24} />
            <span>دورة وإدارة المشتريات والوارد الموثق</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            تبدأ بطلب شراء، مروراً بأمر التوريد، وانتهاءً بفاتورة المشتريات التي تغذي مخزون المستودع أوتوماتيكياً وتربط مع الموردين.
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          {!isDataLocked && onAddSupplier && (
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة مورد جديد</span>
            </button>
          )}
          {subTab === 'requests' && !isDataLocked && (
            <button
              onClick={() => setIsRequestFormOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إنشاء طلب شراء</span>
            </button>
          )}
          {subTab === 'orders' && !isDataLocked && (
            <button
              onClick={() => setIsOrderFormOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إنشاء أمر شراء</span>
            </button>
          )}
          {subTab === 'invoices' && !isDataLocked && (
            <button
              onClick={() => setIsInvoiceFormOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>فاتورة مشتريات جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => { setSubTab('invoices'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'invoices' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          فواتير المشتريات ({purchaseInvoices.length})
        </button>
        <button
          onClick={() => { setSubTab('orders'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'orders' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          أوامر التوريد ({purchaseOrders.length})
        </button>
        <button
          onClick={() => { setSubTab('requests'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'requests' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          طلبات الشراء الداخلي ({purchaseRequests.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        
        {/* Search Bar */}
        <div className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <Search className="text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالرمز، البنود، الموردين أو تفاصيل الدورة..."
            className="w-full bg-transparent focus:outline-hidden text-xs sm:text-sm font-bold text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* --- 1. PURCHASE INVOICES TAB --- */}
        {subTab === 'invoices' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseInvoices.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
                لا توجد أي فواتير مشتريات حالياً. اضغط "فاتورة مشتريات جديدة" لبدء الإجراء.
              </div>
            ) : (
              purchaseInvoices.map((inv) => {
                const supplier = suppliers.find(s => s.id === inv.supplierId);
                const warehouse = warehouses.find(w => w.id === inv.warehouseId);
                const totalAmount = inv.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

                return (
                  <div key={inv.id} className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4 shadow-3xs hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-600 font-mono">#{inv.id}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                          inv.status === 'received' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {inv.status === 'received' ? '✓ تم الاستلام بالمستودع' : '⏳ بانتظار استلام البضاعة'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-sm">{supplier?.name || 'مورد غير مسجل'}</h4>
                      
                      <div className="text-xs text-slate-500 space-y-1 font-bold">
                        <p>مستودع الاستلام: {warehouse?.name || inv.warehouseId}</p>
                        <p>تاريخ الفاتورة: {inv.date}</p>
                        <p className="flex items-center gap-1.5 pt-1">
                          <span>طريقة الدفع:</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${inv.paymentType === 'credit' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {inv.paymentType === 'credit' ? 'آجل' : 'نقدي'}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5 pt-0.5">
                          <span>الاعتماد المالي:</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${inv.financialApproval === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {inv.financialApproval === 'approved' ? 'معتمد مالياً' : 'بانتظار الاعتماد المالي'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100/50">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400">إجمالي الفاتورة</p>
                        <p className="text-base font-black font-mono text-slate-800">{totalAmount.toLocaleString()} ر.ي</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="bg-white border border-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-xl transition-all"
                          title="عرض البنود والتفاصيل"
                        >
                          <Eye size={15} />
                        </button>

                        {inv.status === 'saved' && (
                          <button
                            onClick={() => startReceivingWizard(inv)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                          >
                            <Barcode size={12} />
                            <span>استلام البضائع وفحصها</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- 2. PURCHASE ORDERS TAB --- */}
        {subTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
                لا توجد أوامر توريد حالياً.
              </div>
            ) : (
              purchaseOrders.map((order) => {
                const supplier = suppliers.find(s => s.id === order.supplierId);
                const itemsCount = order.items.length;

                return (
                  <div key={order.id} className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4 shadow-3xs hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-600 font-mono">#{order.id}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                          order.status === 'received' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {order.status === 'received' ? '✓ تم تحويلها لفاتورة' : '⏳ جاري التوريد للمستودع'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-sm">{supplier?.name || 'مورد غير مسجل'}</h4>
                      <p className="text-xs text-slate-500 font-bold">عدد البنود: {itemsCount} أصناف مختلفة</p>
                      <p className="text-[11px] text-slate-400 font-medium">تاريخ التكليف بالطلب: {order.date}</p>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>تفاصيل بنود التوريد</span>
                      </button>

                      {order.status === 'pending' && !isDataLocked && (
                        <button
                          onClick={() => convertOrderToInvoice(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs"
                        >
                          تحويل إلى فاتورة مشتريات ومطابقة استلام
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- 3. PURCHASE REQUESTS TAB --- */}
        {subTab === 'requests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseRequests.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
                لا توجد طلبات شراء داخلي حالياً.
              </div>
            ) : (
              purchaseRequests.map((req) => {
                const item = items.find(i => i.id === req.itemId);

                return (
                  <div key={req.id} className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4 shadow-3xs hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-600 font-mono">#{req.id}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                          req.status === 'ordered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          req.status === 'approved' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {req.status === 'ordered' ? 'تم الطلب من المورد' :
                           req.status === 'approved' ? 'معتمد' :
                           req.status === 'rejected' ? 'مرفوض' :
                           'قيد المراجعة والاعتماد'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-sm">{item?.name || 'صنف غير معروف'}</h4>
                      <p className="text-base font-black font-mono text-slate-700">الكمية المطلوبة: {req.quantity} {req.unit}</p>
                      {req.notes && <p className="text-xs text-slate-400 font-bold italic">ملاحظة: "{req.notes}"</p>}
                      <p className="text-[11px] text-slate-400 font-medium">تاريخ الطلب: {req.date} بواسطة {req.createdBy}</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
                      {req.status === 'pending' && currentUser.role !== 'Storekeeper' && (
                        <>
                          <button
                            onClick={() => onUpdatePurchaseRequestStatus(req.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => onUpdatePurchaseRequestStatus(req.id, 'rejected')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            رفض
                          </button>
                        </>
                      )}

                      {req.status === 'approved' && !isDataLocked && (
                        <button
                          onClick={() => convertRequestToOrder(req)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs"
                        >
                          تحويل لأمر شراء مباشر
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ==================== 4. STOREKEEPER RECEIVING WIZARD (استلام البضائع وفحصها بالكاميرا) ==================== */}
      {activeReceivingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
            {/* Header */}
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Barcode size={22} />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">مطابقة وفحص استلام البضاعة بالمستودع</h3>
                  <p className="text-[11px] text-blue-100 font-bold">فاتورة مشتريات رقم: {activeReceivingInvoice.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('هل تود إلغاء الفحص والمطابقة حالياً؟ لن يتم حفظ التغييرات.')) {
                    setActiveReceivingInvoice(null);
                  }
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body with items */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-right">
              
              <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-2xl text-xs font-bold text-blue-900 leading-relaxed space-y-1.5">
                <p>💡 يرجى مطابقة البنود الموردة مع المسجلة بالفاتورة. يمكنك استخدام كاميرا الهاتف لمسح الباركود والقطع ومطابقتها للتأكد من الأصناف وتفادي أخطاء الجرد!</p>
                <p>📦 عند تأكيد الاستلام، سيقوم النظام تلقائياً بزيادة الكميات بالمستودع المحدد وتوليد سند الوارد المناسب فوراً.</p>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm">البنود المطلوب مطابقتها وفحصها:</h4>
                
                {activeReceivingInvoice.items.map((it) => {
                  const itemDetail = items.find(i => i.id === it.itemId);
                  const receipt = itemReceiptData[it.itemId] || { receivedQty: 0, photo: '', expirationDate: '', alertBeforeMonths: 3 };

                  return (
                    <div key={it.itemId} className="bg-slate-50 border border-slate-150 p-5 rounded-3xl space-y-4">
                      
                      {/* Item Meta info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-2.5">
                        <div>
                          <h5 className="font-black text-slate-800 text-sm">{itemDetail?.name || 'صنف غير معروف'}</h5>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">ID: {it.itemId}</p>
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="text-xs font-bold text-slate-500">الكمية المطلوبة بالفاتورة</p>
                          <p className="text-sm font-black text-slate-800 font-mono">{it.quantity} {itemDetail?.unit || 'وحدة'}</p>
                        </div>
                      </div>

                      {/* Storekeeper Verification controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Received quantity & Scan matching */}
                        <div className="space-y-2">
                          <label className="block text-xs font-extrabold text-slate-500">الكمية المستلمة فعلياً</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={receipt.receivedQty}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setItemReceiptData(prev => ({
                                  ...prev,
                                  [it.itemId]: { ...prev[it.itemId], receivedQty: val }
                                }));
                              }}
                              className="w-20 bg-white border border-slate-200 focus:border-blue-500 text-sm px-2.5 py-2 rounded-xl text-center font-mono font-bold text-slate-700"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setScannerTargetItemId(it.itemId);
                                setIsScannerOpen(true);
                              }}
                              className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black"
                            >
                              <QrCode size={13} />
                              <span>بالكاميرا 📷</span>
                            </button>
                          </div>
                        </div>

                        {/* Expiration date tracking */}
                        <div className="space-y-1">
                          <label className="block text-xs font-extrabold text-slate-500">تاريخ الانتهاء (اختياري)</label>
                          <input
                            type="date"
                            value={receipt.expirationDate}
                            onChange={(e) => {
                              setItemReceiptData(prev => ({
                                ...prev,
                                [it.itemId]: { ...prev[it.itemId], expirationDate: e.target.value }
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 text-xs px-3 py-2 rounded-xl text-slate-700 font-bold font-mono"
                          />
                        </div>

                        {/* Month alarm threshold */}
                        <div className="space-y-1">
                          <label className="block text-xs font-extrabold text-slate-500">تنبيه انتهاء الصلاحية قبل</label>
                          <select
                            value={receipt.alertBeforeMonths}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemReceiptData(prev => ({
                                ...prev,
                                [it.itemId]: { ...prev[it.itemId], alertBeforeMonths: val }
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 text-xs px-3 py-2 rounded-xl text-slate-700 font-bold cursor-pointer"
                          >
                            <option value={1}>شهر واحد</option>
                            <option value={2}>شهرين</option>
                            <option value={3}>3 أشهر</option>
                            <option value={6}>6 أشهر</option>
                            <option value={12}>سنة كاملة (12 شهر)</option>
                          </select>
                        </div>
                      </div>

                      {/* Photo Capture & Camera verification */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/40">
                        <label className="block text-xs font-extrabold text-slate-500">صورة إثبات حالة ومطابقة الشحنة (اختياري)</label>
                        <MovementPhotoCapture
                          photo={receipt.photo}
                          onChange={(base64) => {
                            setItemReceiptData(prev => ({
                              ...prev,
                              [it.itemId]: { ...prev[it.itemId], photo: base64 }
                            }));
                          }}
                        />
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Footer with actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 shrink-0 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveReceivingInvoice(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء التوريد
              </button>
              
              <button
                type="button"
                onClick={submitInvoiceReceipt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <CheckCircle size={16} />
                <span>حفظ وتأكيد الاستلام بالمستودع وتوليد المستندات ✓</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: CREATE PURCHASE REQUEST --- */}
      {isRequestFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateRequest} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clipboard size={18} />
                <h3 className="font-extrabold text-base">إنشاء طلب شراء داخلي جديد</h3>
              </div>
              <button type="button" onClick={() => setIsRequestFormOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">اختر الصنف المطلوب *</label>
                <select
                  required
                  value={reqItemId}
                  onChange={(e) => setReqItemId(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- اختر صنفاً --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (الوحدة الحالية: {i.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">الكمية المطلوبة لشراءها *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(Number(e.target.value) || '')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm px-4 py-3 rounded-xl text-slate-700 font-bold"
                  placeholder="حدد الكمية بالأرقام..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">ملاحظات الطلب أو التبرير</label>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm px-4 py-3 rounded-xl text-slate-700 font-bold min-h-[80px]"
                  placeholder="اكتب أي ملاحظات للطلب هنا..."
                />
              </div>
            </div>
            <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsRequestFormOpen(false)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-xl">إلغاء</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl">تأكيد الإرسال</button>
            </div>
          </form>
        </div>
      )}

      {/* --- FORM MODAL: CREATE PURCHASE ORDER --- */}
      {isOrderFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateOrder} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} />
                <h3 className="font-extrabold text-base">إنشاء أمر شراء وتوريد للمورد</h3>
              </div>
              <button type="button" onClick={() => setIsOrderFormOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">المورد المعتمد للطلب *</label>
                <select
                  required
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-bold text-slate-700 bg-slate-50 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- اختر مورداً --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (الرصيد المستحق: {s.balance || 0} ر.ي)</option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500">قائمة المواد والتكاليف التقريبية</label>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="sm:col-span-6">
                      <select
                        required
                        value={item.itemId}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].itemId = e.target.value;
                          updated[idx].price = items.find(i => i.id === e.target.value)?.price || 0;
                          setOrderItems(updated);
                        }}
                        className="w-full p-2 rounded-xl border text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="">-- اختر صنف --</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setOrderItems(updated);
                        }}
                        placeholder="الكمية"
                        className="w-full p-2 rounded-xl border text-xs font-bold text-center bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        required
                        value={item.price}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].price = Number(e.target.value) || 0;
                          setOrderItems(updated);
                        }}
                        placeholder="السعر"
                        className="w-full p-2 rounded-xl border text-xs font-bold text-center bg-white"
                      />
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setOrderItems(prev => [...prev, { itemId: '', quantity: 1, price: 0 }])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 mt-1.5"
                >
                  <Plus size={14} />
                  <span>إضافة بند صنف جديد</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">تعليمات التوريد أو الشحن</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm px-4 py-3 rounded-xl text-slate-700 font-bold"
                  placeholder="مثال: يرجى التوريد لمستودع صنعاء مباشرة..."
                />
              </div>
            </div>
            <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsOrderFormOpen(false)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-xl">إلغاء</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl">حفظ وإصدار أمر التوريد</button>
            </div>
          </form>
        </div>
      )}

      {/* --- FORM MODAL: CREATE PURCHASE INVOICE --- */}
      {isInvoiceFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateInvoice} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <h3 className="font-extrabold text-base">تسجيل فاتورة مشتريات بضاعة جديدة</h3>
              </div>
              <button type="button" onClick={() => setIsInvoiceFormOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500">مستودع الاستلام والترقيد *</label>
                  <select
                    required
                    value={invoiceWarehouseId}
                    onChange={(e) => setInvoiceWarehouseId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs font-bold text-slate-700 bg-slate-50"
                  >
                    <option value="">-- اختر مستودعاً --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500">المورد *</label>
                  <select
                    required
                    value={invoiceSupplierId}
                    onChange={(e) => setInvoiceSupplierId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs font-bold text-slate-700 bg-slate-50"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500">طريقة الدفع بالفاتورة *</label>
                  <select
                    value={invoicePaymentType}
                    onChange={(e) => setInvoicePaymentType(e.target.value as 'cash' | 'credit')}
                    className="w-full p-2.5 rounded-xl border text-xs font-bold text-slate-700 bg-slate-50"
                  >
                    <option value="credit">آجل (ذمم دائنة للمورد)</option>
                    <option value="cash">نقدي (تم تسليم النقد فوراً)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500">ملاحظات الفاتورة</label>
                  <input
                    type="text"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs font-bold text-slate-700 bg-slate-50"
                    placeholder="رقم الفاتورة اليدوية أو ملاحظات..."
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500">بنود الأصناف والأسعار الحقيقية</label>
                {invoiceItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="sm:col-span-6">
                      <select
                        required
                        value={item.itemId}
                        onChange={(e) => {
                          const updated = [...invoiceItems];
                          updated[idx].itemId = e.target.value;
                          updated[idx].price = items.find(i => i.id === e.target.value)?.price || 0;
                          setInvoiceItems(updated);
                        }}
                        className="w-full p-2 rounded-xl border text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="">-- اختر صنف --</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...invoiceItems];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setInvoiceItems(updated);
                        }}
                        placeholder="الكمية"
                        className="w-full p-2 rounded-xl border text-xs font-bold text-center bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        required
                        value={item.price}
                        onChange={(e) => {
                          const updated = [...invoiceItems];
                          updated[idx].price = Number(e.target.value) || 0;
                          setInvoiceItems(updated);
                        }}
                        placeholder="السعر"
                        className="w-full p-2 rounded-xl border text-xs font-bold text-center bg-white"
                      />
                      {invoiceItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setInvoiceItems(prev => [...prev, { itemId: '', quantity: 1, price: 0 }])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 mt-1.5"
                >
                  <Plus size={14} />
                  <span>إضافة بند صنف جديد</span>
                </button>
              </div>

            </div>
            <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsInvoiceFormOpen(false)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-xl">إلغاء</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl">حفظ وإرسال للمستودع</button>
            </div>
          </form>
        </div>
      )}

      {/* --- VIEW MODAL: PURCHASE INVOICE DETAILS --- */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-800">تفاصيل فاتورة المشتريات #{viewingInvoice.id}</h3>
              <button onClick={() => setViewingInvoice(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                <p>المورد: {suppliers.find(s => s.id === viewingInvoice.supplierId)?.name || viewingInvoice.supplierId}</p>
                <p>مستودع الاستلام: {warehouses.find(w => w.id === viewingInvoice.warehouseId)?.name || viewingInvoice.warehouseId}</p>
                <p>التاريخ: {viewingInvoice.date}</p>
                <p>الحالة: {viewingInvoice.status === 'received' ? 'تم الاستلام' : 'قيد التوريد والانتظار'}</p>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold">
                    <tr>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">السعر</th>
                      <th className="p-3 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">{items.find(i => i.id === item.itemId)?.name || item.itemId}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-center">{item.price.toLocaleString()} ر.ي</td>
                        <td className="p-3 text-center font-mono font-black">{(item.quantity * item.price).toLocaleString()} ر.ي</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW MODAL: PURCHASE ORDER DETAILS --- */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-800">تفاصيل أمر التوريد #{viewingOrder.id}</h3>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-bold text-slate-600">المورد الموصى به: {suppliers.find(s => s.id === viewingOrder.supplierId)?.name || viewingOrder.supplierId}</p>
              
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold">
                    <tr>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3 text-center">الكمية المقررة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {viewingOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">{items.find(i => i.id === item.itemId)?.name || item.itemId}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- OCR/BARCODE SCANNER INTEGRATION MODAL --- */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerTargetItemId(null);
        }}
        items={items}
        onScan={handleBarcodeScanResult}
        allowNewCode={false}
      />

      {/* --- ADD SUPPLIER MODAL --- */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-right animate-scale-up">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-emerald-600 stroke-[3]" />
                <h3 className="font-extrabold text-slate-800">إضافة مورد جديد للقائمة</h3>
              </div>
              <button 
                onClick={() => setIsAddSupplierOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all"
                  placeholder="مثال: شركة الوفاق للتوريدات"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">رقم الهاتف / الجوال</label>
                <input
                  type="text"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                  placeholder="supplier@company.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5">الرصيد الدائن المبدئي (ر.ي)</label>
                <input
                  type="number"
                  min="0"
                  value={newSupplierBalance || ''}
                  onChange={(e) => setNewSupplierBalance(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-mono font-bold transition-all"
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-400 mt-1">يُسجل كمديونية مستحقة للمورد لصالحك في الدفاتر الافتتاحية للمشروع.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>تسجيل المورد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
