import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Check, Box, Tag, Filter, Lock, ChevronDown, ChevronUp, Calendar, User, Info, Camera, Sparkles, UploadCloud } from 'lucide-react';
import { Item, Movement } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';
import VirtualList from './VirtualList';

interface ItemsViewProps {
  items: Item[];
  movements?: Movement[];
  isDataLocked: boolean;
  onAddItem: (item: Item) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onImportItems?: (newItems: Item[]) => void;
}

export default function ItemsView({
  items,
  movements = [],
  isDataLocked,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onImportItems,
}: ItemsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Group / Category Management State
  interface ItemGroup {
    name: string;
    code: string;
    description: string;
  }

  const [groups, setGroups] = useState<ItemGroup[]>(() => {
    const saved = localStorage.getItem('wms_item_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { name: 'شواحن', code: 'CHG', description: 'أجهزة الشحن السريع واللاسلكي والبطاريات المتنقلة' },
      { name: 'سماعات', code: 'AUD', description: 'سماعات الرأس والأذن اللاسلكية والسلكية' },
      { name: 'كابلات', code: 'CBL', description: 'كابلات توصيل البيانات والشحن بمختلف المقاسات والمنافذ' },
      { name: 'إكسسوارات', code: 'ACC', description: 'حافظات هواتف وحماية شاشة وملحقات ذكية أخرى' }
    ];
  });

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', code: '', description: '' });
  const [groupError, setGroupError] = useState<string | null>(null);

  // Save groups to localStorage when changed
  React.useEffect(() => {
    localStorage.setItem('wms_item_groups', JSON.stringify(groups));
  }, [groups]);

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    
    const trimmedName = groupForm.name.trim();
    const trimmedCode = groupForm.code.trim().toUpperCase();
    const trimmedDesc = groupForm.description.trim();

    if (!trimmedName || !trimmedCode) {
      setGroupError('يرجى تعبئة جميع الحقول المطلوبة (الاسم والرمز)!');
      return;
    }

    if (groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase())) {
      setGroupError('اسم المجموعة هذا موجود بالفعل!');
      return;
    }

    if (groups.some(g => g.code.toUpperCase() === trimmedCode)) {
      setGroupError('رمز المجموعة هذا مستخدم بالفعل!');
      return;
    }

    const newGroup: ItemGroup = {
      name: trimmedName,
      code: trimmedCode,
      description: trimmedDesc
    };

    setGroups(prev => [...prev, newGroup]);
    setGroupForm({ name: '', code: '', description: '' });
  };

  // Advanced Filters State
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    safetyLimit: 10,
    unit: 'حبة',
    price: 0,
    category: '',
    description: '',
  });

  // Extract unique categories from dynamic groups & items list
  const categories = [
    'الكل',
    ...Array.from(new Set([
      ...groups.map(g => g.name),
      ...items.map(item => item.category).filter(Boolean) as string[]
    ]))
  ];

  const filteredItems = items.filter((item) => {
    // 1. Search Bar Filter (Name, Code, Category, Description)
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

    // 2. Category Quick Row Filter
    const matchesCategory =
      selectedCategory === 'الكل' ||
      item.category === selectedCategory;

    // 3. Price Filter (Advanced)
    const matchesMinPrice = minPrice === '' || item.price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === '' || item.price <= Number(maxPrice);

    // 4. Low Stock Filter (Advanced)
    let matchesLowStock = true;
    if (lowStockOnly) {
      const balance = movements
        ? movements
            .filter(m => m.itemId === item.id)
            .reduce((sum, m) => sum + (m.type === 'in' ? m.quantity : -m.quantity), 0)
        : 0;
      matchesLowStock = balance <= item.safetyLimit;
    }

    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesLowStock;
  });

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert('الملف فارغ أو لا يحتوي على بيانات كافية!');
        return;
      }

      // Detect separator: comma or semicolon
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';

      // Parse headers
      const headers = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));

      // Find matching indices based on common Arabic and English names
      let idIdx = headers.findIndex(h => h.includes('الرمز') || h.toLowerCase() === 'id' || h.toLowerCase() === 'code' || h.includes('كود'));
      let nameIdx = headers.findIndex(h => h.includes('الاسم') || h.toLowerCase() === 'name' || h.includes('اسم'));
      let safetyIdx = headers.findIndex(h => h.includes('حد الأمان') || h.includes('حد_الأمان') || h.includes('حد الامان') || h.toLowerCase() === 'safetylimit' || h.toLowerCase() === 'safety');
      let unitIdx = headers.findIndex(h => h.includes('الوحدة') || h.includes('الوحده') || h.toLowerCase() === 'unit');
      let priceIdx = headers.findIndex(h => h.includes('السعر') || h.toLowerCase() === 'price');
      let categoryIdx = headers.findIndex(h => h.includes('التصنيف') || h.includes('المجموعة') || h.includes('المجموعه') || h.toLowerCase() === 'category' || h.toLowerCase() === 'group');
      let descIdx = headers.findIndex(h => h.includes('الوصف') || h.includes('تفاصيل') || h.toLowerCase() === 'description' || h.toLowerCase() === 'desc');

      // Fallback indices if header names aren't detected
      if (idIdx === -1) idIdx = 0;
      if (nameIdx === -1) nameIdx = 1;
      if (safetyIdx === -1) safetyIdx = 2;
      if (unitIdx === -1) unitIdx = 3;
      if (priceIdx === -1) priceIdx = 4;
      if (categoryIdx === -1) categoryIdx = 5;
      if (descIdx === -1) descIdx = 6;

      const newItemsToImport: Item[] = [];
      let duplicateCount = 0;
      let invalidCount = 0;

      // Temporary set of IDs in the file to avoid duplicate entries within the CSV itself
      const fileIds = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Smart split of values that handles escaped separators (basic implementation)
        const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length < 2) {
          invalidCount++;
          continue;
        }

        const id = (values[idIdx] || `PROD-IMP-${Date.now()}-${i}`).toUpperCase().trim();
        const name = values[nameIdx]?.trim();

        if (!name) {
          invalidCount++;
          continue;
        }

        // Check if ID already exists in the system or is duplicated inside the file
        const alreadyExists = items.some(item => item.id.toUpperCase() === id);
        if (alreadyExists || fileIds.has(id)) {
          duplicateCount++;
          continue;
        }

        fileIds.add(id);

        const safetyLimit = Number(values[safetyIdx]) || 10;
        const unit = values[unitIdx] || 'حبة';
        const price = Number(values[priceIdx]) || 0;
        const category = values[categoryIdx] || '';
        const description = values[descIdx] || '';

        newItemsToImport.push({
          id,
          name,
          safetyLimit,
          unit,
          price,
          category,
          description,
        });
      }

      if (newItemsToImport.length > 0) {
        if (onImportItems) {
          onImportItems(newItemsToImport);
        } else {
          // Fallback to individual additions
          newItemsToImport.forEach(item => onAddItem(item));
        }
        alert(`🎉 تمت عملية الاستيراد بنجاح!\n• تم استيراد: ${newItemsToImport.length} صنف جديد.\n• تم تخطي المكرر: ${duplicateCount} صنف.\n• الصفوف غير الصالحة: ${invalidCount}.`);
      } else {
        alert(`⚠️ لم يتم استيراد أي أصناف!\n• الأصناف المكررة: ${duplicateCount}\n• الصفوف غير الصالحة: ${invalidCount}`);
      }

      // Clear the file input
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleOpenAdd = () => {
    // Generate a default code like PROD-004
    const nextNum = items.length > 0 
      ? Math.max(...items.map((i) => {
          const m = i.id.match(/\d+/);
          return m ? parseInt(m[0], 10) : 0;
        })) + 1
      : 1;
    const nextId = `PROD-${String(nextNum).padStart(3, '0')}`;

    setEditingItem(null);
    setFormData({
      id: nextId,
      name: '',
      safetyLimit: 10,
      unit: 'حبة',
      price: 0,
      category: '',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      safetyLimit: item.safetyLimit,
      unit: item.unit,
      price: item.price,
      category: item.category || '',
      description: item.description || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.id.trim()) return;

    const savedItem: Item = {
      id: formData.id.trim().toUpperCase(),
      name: formData.name.trim(),
      safetyLimit: Number(formData.safetyLimit),
      unit: formData.unit.trim(),
      price: Number(formData.price),
      category: formData.category.trim() || undefined,
      description: formData.description.trim() || undefined,
    };

    if (editingItem) {
      onEditItem(savedItem);
    } else {
      // Check for duplicates
      if (items.some((i) => i.id.toLowerCase() === savedItem.id.toLowerCase())) {
        alert('رمز الصنف موجود بالفعل، يرجى كتابة رمز فريد!');
        return;
      }
      onAddItem(savedItem);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Header with FAB/Button & Group Management */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الأصناف</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تعريف وإدارة السلع والمنتجات المخزنة</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Manage Groups Trigger Button */}
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/50 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title="إدارة المجموعات وبياناتها وتعديلها"
          >
            <Tag size={15} className="stroke-[2.5]" />
            <span>إدارة المجموعات 📁</span>
          </button>

          {!isDataLocked && (
            <>
              {/* Import CSV Trigger */}
              <div className="relative">
                <input
                  type="file"
                  id="csv-file-import"
                  accept=".csv, .txt"
                  onChange={handleCSVImport}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-import"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 whitespace-nowrap"
                  title="استيراد قائمة أصناف كاملة من ملف CSV"
                >
                  <UploadCloud size={15} className="stroke-[2.5]" />
                  <span>استيراد الأصناف (CSV) 📥</span>
                </label>
              </div>

              <button
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                title="إضافة صنف جديد"
              >
                <Plus size={22} className="stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lock Warning Banner */}
      {isDataLocked && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
            <Lock size={18} className="stroke-[2.5]" />
          </div>
          <div className="text-xs font-bold leading-relaxed text-right">
            وضع القراءة فقط نشط: تم قفل البيانات في الإعدادات لمنع إضافة أو تعديل أو حذف الأصناف حالياً.
          </div>
        </div>
      )}

      {/* Search Bar & Advanced Filters */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-2xs space-y-4">
        <div className="flex gap-2">
          {/* Main Search input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="البحث عن اسم الصنف، الرمز، التصنيف أو الوصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-11 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700 text-right"
            />
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`px-4 rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold ${
              showFiltersPanel || minPrice !== '' || maxPrice !== '' || lowStockOnly
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="تصفية متقدمة"
          >
            <Filter size={16} className="stroke-[2.5]" />
            <span className="hidden sm:inline">خيارات التصفية</span>
          </button>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {(showFiltersPanel || minPrice !== '' || maxPrice !== '' || lowStockOnly) && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-right animate-slide-down">
            {/* Price Filter (Min / Max) */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <span className="text-[11px] text-slate-400 font-bold block">تصفية حسب نطاق السعر (ر.س):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="الحد الأدنى"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden font-mono focus:border-blue-500"
                />
                <span className="text-slate-400 text-xs font-bold shrink-0">إلى</span>
                <input
                  type="number"
                  placeholder="الحد الأقصى"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden font-mono focus:border-blue-500"
                />
              </div>
            </div>

            {/* Low Stock Filter */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all">
                <span className="text-xs font-extrabold text-slate-600">عرض النواقص فقط (تحت حد الأمان) ⚠️</span>
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded-lg text-blue-600 focus:ring-blue-500 w-4 h-4 ml-1"
                />
              </label>
            </div>

            {/* Reset Filters Option (if any filter is active) */}
            {(minPrice !== '' || maxPrice !== '' || lowStockOnly || search !== '' || selectedCategory !== 'الكل') && (
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setLowStockOnly(false);
                    setSearch('');
                    setSelectedCategory('الكل');
                  }}
                  className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 border border-rose-100 px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={13} className="stroke-[2.5]" />
                  <span>إعادة ضبط وتصفير الفلاتر</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Categories Row (Group quick selection) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none no-scrollbar border-t border-slate-100/70 pt-3">
          <span className="text-slate-400 text-xs font-bold whitespace-nowrap flex items-center gap-1 ml-1.5">
            <Filter size={13} className="stroke-[2.5]" />
            التصنيف السريع:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="w-full">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لم يتم العثور على أي أصناف</p>
            <p className="text-xs mt-1">أضف أصنافًا جديدة أو عدّل خيارات البحث والتصفية</p>
          </div>
        ) : (
          <VirtualList
            items={filteredItems}
            itemHeight={110}
            containerHeight="max-h-[70vh]"
            renderItem={(item) => {
              const isExpanded = expandedItemId === item.id;
              const itemInwards = movements.filter(m => m.itemId === item.id && m.type === 'in');
              // Sort by date or pick last
              const lastInward = itemInwards.length > 0 
                ? [...itemInwards].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
                : null;

              // Fetch the latest documented photo from any movement for this item
              const lastPhotoMovement = [...movements]
                .filter(m => m.itemId === item.id && m.photo)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              const itemPhoto = lastPhotoMovement?.photo;

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  className={`bg-white border border-slate-100 hover:border-blue-200/80 rounded-3xl transition-all duration-200 cursor-pointer overflow-hidden shadow-xs hover:shadow-md ${
                    isExpanded ? 'ring-2 ring-blue-500/10 border-blue-200 shadow-md' : ''
                  }`}
                >
                  {/* Visible Summary Card Part */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2 text-right flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base">{item.name}</h3>
                        <span className="text-xs font-bold text-slate-400 font-mono">({item.id})</span>
                        <span className="text-slate-300 ml-auto sm:hidden">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                      
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                          {item.price} ر.س
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                          {item.unit}
                        </span>
                        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                          حد الأمان: {item.safetyLimit}
                        </span>
                        {item.category && (
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <Tag size={12} className="stroke-[2.5]" />
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions & Chevron */}
                    <div className="flex items-center justify-end gap-2 border-t sm:border-none pt-3 sm:pt-0 border-slate-50 shrink-0">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isDataLocked ? (
                          <span className="text-amber-600 bg-amber-50 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-amber-100/50">
                            <Lock size={12} className="stroke-[2.5]" />
                            <span>عرض فقط</span>
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 p-3 rounded-2xl transition-all cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف الصنف "${item.name}"؟`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 p-3 rounded-2xl transition-all cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      <span className="text-slate-400 p-1.5 rounded-lg hover:bg-slate-50 hidden sm:inline-block">
                        {isExpanded ? <ChevronUp size={18} className="stroke-[2.5]" /> : <ChevronDown size={18} className="stroke-[2.5]" />}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details Part */}
                  {isExpanded && (
                    <div className="bg-slate-50/70 border-t border-slate-100 p-5 space-y-4 animate-slide-down text-right" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Grid containing Photo on one side, and description/supply data on the other */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Photo Section */}
                        <div className="bg-white border border-slate-100/80 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-3xs min-h-[140px]">
                          {itemPhoto ? (
                            <div className="relative group w-full h-full flex flex-col items-center justify-center">
                              <img
                                src={itemPhoto}
                                alt={item.name}
                                className="max-h-[140px] max-w-full rounded-xl object-cover shadow-3xs cursor-zoom-in hover:scale-102 transition-all"
                                onClick={() => setPreviewPhoto(itemPhoto)}
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(itemPhoto)}
                                className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md text-[8px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                🔍 تكبير الصورة
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300 py-4">
                              <Camera size={26} className="stroke-[1.5] mb-1 text-slate-400" />
                              <span className="text-[10px] text-slate-400 font-black">لا توجد صورة موثقة للقطعة</span>
                              <span className="text-[8px] text-slate-400 mt-1 max-w-[120px] leading-normal">يتم توثيق صورة القطعة بالكاميرا عند الوارد والصرف</span>
                            </div>
                          )}
                        </div>

                        {/* Info & Description Section */}
                        <div className="md:col-span-2 space-y-3.5">
                          
                          {/* Item Description */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-slate-400 font-extrabold tracking-wider block flex items-center gap-1">
                              <Info size={11} className="text-blue-500" />
                              وصف المنتج
                            </span>
                            <p className="text-xs text-slate-600 font-bold leading-relaxed bg-white border border-slate-100/80 p-3.5 rounded-2xl">
                              {item.description || 'لا يوجد وصف مضاف لهذا المنتج حالياً. يمكنك تعديل الصنف لإضافة وصف مخصص.'}
                            </p>
                          </div>

                          {/* Supply Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Last Supply Date */}
                            <div className="bg-white border border-slate-100/80 p-3.5 rounded-2xl flex items-center gap-3">
                              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl shrink-0">
                                <Calendar size={16} className="stroke-[2]" />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">تاريخ التوريد (آخر وارد)</span>
                                <span className="text-xs font-bold text-slate-700 block mt-0.5 font-mono">
                                  {lastInward ? lastInward.date : 'لا يوجد توريد مسبق'}
                                </span>
                              </div>
                            </div>

                            {/* Last Supplier */}
                            <div className="bg-white border border-slate-100/80 p-3.5 rounded-2xl flex items-center gap-3">
                              <div className="bg-purple-50 text-purple-600 p-2 rounded-xl shrink-0">
                                <User size={16} className="stroke-[2]" />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">مورد الصنف (آخر وارد)</span>
                                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                                  {lastInward ? lastInward.partner : 'لا يوجد مورد مسجل'}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                  <Box size={20} className="stroke-[2]" />
                </div>
                <h3 className="font-bold text-slate-800">
                  {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">رمز الصنف (ID) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!!editingItem} // Code cannot be edited once created
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="flex-1 bg-slate-50 disabled:bg-slate-100/70 border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 font-mono text-left"
                    placeholder="مثال: PROD-001"
                  />
                  {!editingItem && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                        title="مسح رمز شريطي (باركود) بالكاميرا"
                      >
                        <Camera size={16} className="stroke-[2.5]" />
                        <span className="text-[10px] font-extrabold">مسح</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = 'PRD-' + Math.floor(10000 + Math.random() * 90000);
                          setFormData(prev => ({ ...prev, id: rand }));
                        }}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                        title="توليد رمز تلقائي عشوائي"
                      >
                        <Sparkles size={16} className="stroke-[2.5]" />
                        <span className="text-[10px] font-extrabold">توليد</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الصنف *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                  placeholder="مثال: شاحن متنقل بقوة 20 واط"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">مجموعة الصنف (التصنيف) *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer"
                  >
                    <option value="" disabled>-- اختر مجموعة الصنف --</option>
                    {groups.map((g) => (
                      <option key={g.code} value={g.name}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                    {/* Fallback to any custom item categories that are not defined in the groups state */}
                    {items
                      .map(i => i.category)
                      .filter((cat): cat is string => !!cat && !groups.some(g => g.name === cat))
                      .filter((value, index, self) => self.indexOf(value) === index)
                      .map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    }
                  </select>
                  {!isDataLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGroupModalOpen(true);
                      }}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                      title="إضافة مجموعة جديدة فورا"
                    >
                      <Plus size={16} className="stroke-[2.5]" />
                      <span className="text-[10px] font-extrabold">مجموعة</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">السعر (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="مثال: حبة، كرتون"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">حد الأمان (الحد الأدنى للتنبيه)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.safetyLimit}
                  onChange={(e) => setFormData({ ...formData, safetyLimit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">يصدر النظام تحذيراً عند نزول المخزون عن هذه الكمية.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">وصف المنتج</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 h-20 resize-none text-right"
                  placeholder="اكتب وصفاً تفصيلياً لمواصفات ومميزات المنتج..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>حفظ الصنف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Barcode Scanner Modal Component for new item IDs */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        allowNewCode={true}
        onScan={(scannedCode) => {
          setFormData((prev) => ({ ...prev, id: scannedCode }));
        }}
      />

      {/* Dynamic Group Manager Modal (إدارة المجموعات وبياناتها) */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-purple-100 text-purple-700 p-2 rounded-xl">
                  <Tag size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">إدارة مجموعات الأصناف</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">أضف تصنيفات ومجموعات مخصصة مع ترميز تفصيلي لكل مجموعة</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setGroupError(null);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-right no-scrollbar">
              
              {/* Existing Groups List */}
              <div className="space-y-2.5">
                <span className="text-xs font-black text-slate-500 block">المجموعات الحالية ({groups.length}):</span>
                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50 no-scrollbar">
                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6 font-bold">لا يوجد مجموعات معرفة حالياً</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.code} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-3xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-800">{g.name}</span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-mono font-black">{g.code}</span>
                          </div>
                          {g.description && (
                            <p className="text-[10px] text-slate-400 font-bold leading-normal max-w-xs">{g.description}</p>
                          )}
                        </div>

                        {!isDataLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف مجموعة "${g.name}"؟ الأصناف المرتبطة بها ستظل محتفظة بالاسم ولكن لن تظهر المجموعة في القائمة مستقبلاً.`)) {
                                setGroups(prev => prev.filter(item => item.code !== g.code));
                              }
                            }}
                            className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all cursor-pointer"
                            title="حذف هذه المجموعة"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Group Form Section */}
              {!isDataLocked ? (
                <form onSubmit={handleAddGroupSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3.5">
                  <span className="text-xs font-black text-purple-800 block">إضافة مجموعة جديدة:</span>
                  
                  {groupError && (
                    <div className="bg-rose-50 text-rose-600 text-[11px] font-bold p-2.5 rounded-xl border border-rose-100">
                      ⚠️ {groupError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم المجموعة *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: هواتف ذكية"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-purple-500 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">رمز المجموعة * (أحرف إنجليزية)</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: PHN"
                        value={groupForm.code}
                        onChange={(e) => setGroupForm(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-purple-500 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 font-mono font-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">بيانات ووصف المجموعة</label>
                    <input
                      type="text"
                      placeholder="اكتب تفاصيل أو وصف مبسط للمجموعة..."
                      value={groupForm.description}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>إضافة وتوثيق المجموعة الجديدة</span>
                  </button>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center text-amber-800 text-xs font-bold leading-relaxed">
                  🔒 تم تفعيل وضع القراءة فقط: لا يمكن إضافة أو تعديل أو حذف مجموعات الأصناف حالياً.
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setGroupError(null);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-2.5 px-5 rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between" dir="rtl">
              <span className="font-bold text-slate-800 text-sm">صورة القطعة الموثقة</span>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img src={previewPhoto} alt="Piece Full Preview" className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-sm" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
