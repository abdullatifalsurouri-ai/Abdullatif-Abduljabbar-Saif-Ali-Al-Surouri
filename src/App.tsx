import { useState, useEffect } from 'react';
import { 
  Home, 
  Box as BoxIcon, 
  ArrowLeftRight, 
  BarChart2, 
  TrendingUp, 
  FileText, 
  Receipt 
} from 'lucide-react';
import { 
  TabType, 
  Item, 
  Movement, 
  Supplier, 
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);

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

  // Handler functions for adding/modifying/deleting items
  const handleAddItem = (item: Item) => {
    setItems((prev) => [...prev, item]);
  };

  const handleEditItem = (updatedItem: Item) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    // Optionally clean up movements referencing this item
    setMovements((prev) => prev.filter((m) => m.itemId !== id));
  };

  // Handler functions for adding/deleting movements
  const handleAddMovement = (movement: Movement) => {
    setMovements((prev) => [...prev, movement]);
  };

  const handleDeleteMovement = (id: number) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };

  // Handler functions for adding/editing/deleting suppliers
  const handleAddSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
  };

  const handleEditSupplier = (updatedSupplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)));
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // Render the appropriate subview based on current active tab
  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            items={items}
            movements={movements}
            suppliers={suppliers}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenSuppliers={() => setIsSuppliersOpen(true)}
          />
        );
      case 'items':
        return (
          <ItemsView
            items={items}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        );
      case 'movements':
        return (
          <MovementsView
            movements={movements}
            items={items}
            suppliers={suppliers}
            onAddMovement={handleAddMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        );
      case 'inventory':
        return <InventoryView items={items} movements={movements} />;
      case 'report':
        return <ReportView items={items} movements={movements} suppliers={suppliers} />;
      case 'print':
        return <PrintView movements={movements} items={items} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans select-none" dir="rtl">
      
      {/* Top Banner (Print-only Hidden or Styled properly) */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-40 print:hidden shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-2xl shadow-xs">
              <Receipt size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-800">
              مستودع المدى الذكي
            </span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold px-3 py-1.5 rounded-full">
            أمين المستودع مفعّل
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Persistent Bottom Tab Navigation (Screenshot matching) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3.5 px-2 z-40 print:hidden shadow-lg rounded-t-3xl">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          
          {/* Tab: الرئيسية */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'home' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">الرئيسية</span>
          </button>

          {/* Tab: الأصناف */}
          <button
            onClick={() => setActiveTab('items')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'items' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <BoxIcon size={20} className={activeTab === 'items' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">الأصناف</span>
          </button>

          {/* Tab: الحركات */}
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'movements' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <ArrowLeftRight size={20} className={activeTab === 'movements' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">الحركات</span>
          </button>

          {/* Tab: الجرد */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'inventory' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <BarChart2 size={20} className={activeTab === 'inventory' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">الجرد</span>
          </button>

          {/* Tab: التقرير */}
          <button
            onClick={() => setActiveTab('report')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'report' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <TrendingUp size={20} className={activeTab === 'report' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">التقرير</span>
          </button>

          {/* Tab: السندات */}
          <button
            onClick={() => setActiveTab('print')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'print' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <FileText size={20} className={activeTab === 'print' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] font-black">السندات</span>
          </button>

        </div>
      </nav>

      {/* Global Suppliers Modal Manager */}
      <SuppliersModal
        isOpen={isSuppliersOpen}
        onClose={() => setIsSuppliersOpen(false)}
        suppliers={suppliers}
        onAddSupplier={handleAddSupplier}
        onEditSupplier={handleEditSupplier}
        onDeleteSupplier={handleDeleteSupplier}
      />

    </div>
  );
}
