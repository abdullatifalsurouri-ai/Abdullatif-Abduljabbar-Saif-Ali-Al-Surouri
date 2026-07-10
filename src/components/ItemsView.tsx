import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Check, Box, Tag, Filter, Lock, ChevronDown, ChevronUp, Calendar, User, Info, Camera, Sparkles, UploadCloud, AlertTriangle, Download, Mic, MicOff } from 'lucide-react';
import { Item, Movement } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';
import VirtualList from './VirtualList';
import * as XLSX from 'xlsx';

interface ItemsViewProps {
  items: Item[];
  movements?: Movement[];
  currentUser?: any;
  isDataLocked: boolean;
  onAddItem: (item: Item) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onImportItems?: (newItems: Item[]) => void;
  expirationAlertMonths?: number;
  onUpdateExpirationAlertMonths?: (months: number) => void;
}

export default function ItemsView({
  items,
  movements = [],
  currentUser,
  isDataLocked,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onImportItems,
  expirationAlertMonths = 1,
  onUpdateExpirationAlertMonths,
}: ItemsViewProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importStats, setImportStats] = useState({ total: 0, processed: 0, duplicates: 0, invalid: 0 });

  // Microphone Voice Search State & Implementation
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('عذراً، متصفحك الحالي لا يدعم ميزة البحث الصوتي. يرجى استخدام متصفح Google Chrome.');
      return;
    }

    let recognition;
    try {
      recognition = new SpeechRecognition();
    } catch (err) {
      console.warn('SpeechRecognition instantiation failed:', err);
      alert('تعذر تشغيل ميزة البحث الصوتي بسبب قيود المتصفح أو البيئة الحالية.');
      return;
    }
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      if (speechToText) {
        // Remove trailing dot if speech recognition adds it
        const cleanedText = speechToText.endsWith('.') ? speechToText.slice(0, -1) : speechToText;
        setSearch(cleanedText.trim());
      }
    };

    recognition.start();
  };

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
    currency: 'ر.س',
    category: '',
    description: '',
    expirationDate: '',
    unitMajor: 'كرتون',
    unitMinor: 'حبة',
    unitConversion: 24,
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

  // Calculate total inventory value for all items (balance * unit price)
  const grandTotalInventoryValue = items.reduce((total, item) => {
    const balance = movements
      ? movements
          .filter(m => m.itemId === item.id)
          .reduce((sum, m) => sum + (m.type === 'in' ? m.quantity : -m.quantity), 0)
      : 0;
    return total + (balance * item.price);
  }, 0);

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      try {
        let rows: any[][] = [];
        const filename = file.name.toLowerCase();

        if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          // It's CSV / text
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) {
            alert('الملف فارغ أو لا يحتوي على بيانات كافية!');
            return;
          }

          // Detect separator: comma or semicolon
          const firstLine = lines[0];
          const separator = firstLine.includes(';') ? ';' : ',';

          rows = lines.map(line => {
            if (!line.trim()) return [];
            return line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          }).filter(r => r.length > 0);
        }

        if (rows.length < 2) {
          alert('الملف فارغ أو لا يحتوي على صفوف بيانات كافية!');
          return;
        }

        const headers = rows[0].map((h: any) => String(h || '').trim().replace(/^["']|["']$/g, ''));

        // Find matching indices
        let idIdx = headers.findIndex(h => h.includes('الرمز') || h.toLowerCase() === 'id' || h.toLowerCase() === 'code' || h.includes('كود'));
        let nameIdx = headers.findIndex(h => h.includes('الاسم') || h.toLowerCase() === 'name' || h.includes('اسم'));
        let safetyIdx = headers.findIndex(h => h.includes('حد الأمان') || h.includes('حد_الأمان') || h.includes('حد الامان') || h.toLowerCase() === 'safetylimit' || h.toLowerCase() === 'safety');
        let unitIdx = headers.findIndex(h => h.includes('الوحدة') || h.includes('الوحده') || h.toLowerCase() === 'unit');
        let priceIdx = headers.findIndex(h => h.includes('السعر') || h.toLowerCase() === 'price');
        let categoryIdx = headers.findIndex(h => h.includes('التصنيف') || h.includes('المجموعة') || h.includes('المجموعه') || h.toLowerCase() === 'category' || h.toLowerCase() === 'group');
        let descIdx = headers.findIndex(h => h.includes('الوصف') || h.includes('تفاصيل') || h.toLowerCase() === 'description' || h.toLowerCase() === 'desc');
        let currencyIdx = headers.findIndex(h => h.includes('العملة') || h.includes('العمله') || h.toLowerCase() === 'currency');

        // Fallback indices
        if (idIdx === -1) idIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (safetyIdx === -1) safetyIdx = 2;
        if (unitIdx === -1) unitIdx = 3;
        if (priceIdx === -1) priceIdx = 4;
        if (categoryIdx === -1) categoryIdx = 5;
        if (descIdx === -1) descIdx = 6;

        const dataRows = rows.slice(1).filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''));
        const totalRows = dataRows.length;

        if (totalRows === 0) {
          alert('لا توجد صفوف بيانات صالحة للاستيراد!');
          return;
        }

        // Initialize state for batch processing
        setImportProgress(0);
        setImportStats({ total: totalRows, processed: 0, duplicates: 0, invalid: 0 });

        const batchSize = 15; // Process in small batches for smooth UI animation
        let currentIndex = 0;
        let localDuplicates = 0;
        let localInvalid = 0;
        const newItemsToImport: Item[] = [];
        const fileIds = new Set<string>();

        const processNextBatch = () => {
          const limit = Math.min(currentIndex + batchSize, totalRows);
          
          for (let i = currentIndex; i < limit; i++) {
            const values = dataRows[i];
            if (!values || values.length < 2) {
              localInvalid++;
              continue;
            }

            const rawId = values[idIdx] !== undefined ? String(values[idIdx]) : '';
            const id = (rawId || `PROD-IMP-${Date.now()}-${i}`).toUpperCase().trim();
            const name = values[nameIdx] !== undefined ? String(values[nameIdx]).trim() : '';

            if (!name) {
              localInvalid++;
              continue;
            }

            // Check if ID already exists in the system or is duplicated inside this file
            const alreadyExists = items.some(item => item.id.toUpperCase() === id);
            if (alreadyExists || fileIds.has(id)) {
              localDuplicates++;
              continue;
            }

            fileIds.add(id);

            const safetyLimit = values[safetyIdx] !== undefined ? (Number(values[safetyIdx]) || 10) : 10;
            const unit = values[unitIdx] !== undefined ? String(values[unitIdx]) : 'حبة';
            const price = values[priceIdx] !== undefined ? (Number(values[priceIdx]) || 0) : 0;
            const currency = currencyIdx !== -1 && values[currencyIdx] ? String(values[currencyIdx]) : 'ر.س';
            const category = values[categoryIdx] !== undefined ? String(values[categoryIdx]) : '';
            const description = values[descIdx] !== undefined ? String(values[descIdx]) : '';

            newItemsToImport.push({
              id,
              name,
              safetyLimit,
              unit,
              price,
              currency,
              category,
              description,
            });
          }

          currentIndex = limit;
          const currentProgress = Math.round((currentIndex / totalRows) * 100);
          setImportProgress(currentProgress);
          setImportStats({
            total: totalRows,
            processed: newItemsToImport.length,
            duplicates: localDuplicates,
            invalid: localInvalid
          });

          if (currentIndex < totalRows) {
            setTimeout(processNextBatch, 35); // Allow UI repaint
          } else {
            // Done processing all batches!
            if (newItemsToImport.length > 0) {
              if (onImportItems) {
                onImportItems(newItemsToImport);
              } else {
                newItemsToImport.forEach(item => onAddItem(item));
              }
              alert(`🎉 تمت عملية استيراد البيانات بنجاح!\n• تم استيراد: ${newItemsToImport.length} صنف جديد.\n• تم تخطي المكرر: ${localDuplicates} صنف.\n• الصفوف غير الصالحة: ${localInvalid}.`);
            } else {
              alert(`⚠️ لم يتم استيراد أي أصناف!\n• الأصناف المكررة: ${localDuplicates}\n• الصفوف غير الصالحة: ${localInvalid}`);
            }

            // Reset progress and file input
            setTimeout(() => {
              setImportProgress(null);
            }, 1000);
            event.target.value = '';
          }
        };

        // Start batch processing
        processNextBatch();

      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة الملف. الرجاء التأكد من سلامة صياغته!');
      }
    };

    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleCSVExport = () => {
    const headers = ['الرمز', 'الاسم', 'حد الأمان', 'الوحدة', 'السعر', 'العملة', 'التصنيف', 'الوصف', 'تاريخ انتهاء الصلاحية'];
    const rows = filteredItems.map(item => [
      item.id,
      item.name,
      item.safetyLimit,
      item.unit,
      item.price,
      item.currency || 'ر.س',
      item.category || '',
      item.description || '',
      item.expirationDate || ''
    ]);

    // UTF-8 BOM so Arabic displays correctly in Excel
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventra_items_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    let initialFormData = {
      id: nextId,
      name: '',
      safetyLimit: 10,
      unit: 'حبة',
      price: 0,
      currency: 'ر.س',
      category: '',
      description: '',
      expirationDate: '',
      unitMajor: 'كرتون',
      unitMinor: 'حبة',
      unitConversion: 24,
    };

    const savedDraft = sessionStorage.getItem('draft_add_item_form');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed) {
          initialFormData = {
            ...initialFormData,
            ...parsed,
            id: parsed.id || nextId
          };
        }
      } catch (e) {}
    }

    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  // Autosave to SessionStorage
  React.useEffect(() => {
    if (isFormOpen && !editingItem) {
      sessionStorage.setItem('draft_add_item_form', JSON.stringify(formData));
    }
  }, [formData, isFormOpen, editingItem]);

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      safetyLimit: item.safetyLimit,
      unit: item.unit,
      price: item.price,
      currency: item.currency || 'ر.س',
      category: item.category || '',
      description: item.description || '',
      expirationDate: item.expirationDate || '',
      unitMajor: item.unitMajor || 'كرتون',
      unitMinor: item.unitMinor || 'حبة',
      unitConversion: item.unitConversion || 24,
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
      currency: formData.currency,
      category: formData.category.trim() || undefined,
      description: formData.description.trim() || undefined,
      expirationDate: formData.expirationDate ? formData.expirationDate : undefined,
      unitMajor: formData.unitMajor ? formData.unitMajor.trim() : undefined,
      unitMinor: formData.unitMinor ? formData.unitMinor.trim() : undefined,
      unitConversion: formData.unitConversion ? Number(formData.unitConversion) : undefined,
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
      sessionStorage.removeItem('draft_add_item_form');
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Manage Groups Trigger Button */}
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/50 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="إدارة المجموعات وبياناتها وتعديلها"
            >
              <Tag size={12} className="stroke-[2.5]" />
              <span>المجموعات 📁</span>
            </button>

            {!isDataLocked && currentUser?.permissions?.canImportExportCSV !== false && (
              <>
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    id="csv-file-import"
                    accept=".csv, .txt, .xlsx, .xls"
                    onChange={handleCSVImport}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 whitespace-nowrap"
                    title="استيراد قائمة أصناف كاملة من ملف CSV أو Excel"
                  >
                    <UploadCloud size={10} className="stroke-[2.5]" />
                    <span>استيراد 📥</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCSVExport}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/50 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 whitespace-nowrap"
                  title="تصدير قائمة أصناف كاملة إلى ملف CSV"
                >
                  <Download size={10} className="stroke-[2.5]" />
                  <span>تصدير 📤</span>
                </button>
              </>
            )}
          </div>

          {!isDataLocked && (
            <button
              onClick={handleOpenAdd}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 font-black text-xs shrink-0"
              title="إضافة صنف جديد"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>إضافة صنف جديد ➕</span>
            </button>
          )}
        </div>
      </div>

      {/* Import Progress Bar */}
      {importProgress !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm space-y-3 animate-pulse text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600 animate-spin" />
              <span className="text-xs font-black text-blue-900">جاري معالجة واستيراد السجلات في الخلفية (دفعات)...</span>
            </div>
            <span className="text-xs font-mono font-black text-blue-700">{importProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-150" 
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500 pt-1 border-t border-blue-100">
            <span>إجمالي الصفوف: <strong className="text-slate-800 font-mono">{importStats.total}</strong></span>
            <span>تم استيرادها: <strong className="text-emerald-600 font-mono">{importStats.processed}</strong></span>
            <span>تخطي المكرر: <strong className="text-amber-600 font-mono">{importStats.duplicates}</strong></span>
            <span>صفوف غير صالحة: <strong className="text-rose-600 font-mono">{importStats.invalid}</strong></span>
          </div>
        </div>
      )}

      {/* Grand Total Inventory Value Banner */}
      <div className="bg-gradient-to-l from-indigo-600 via-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
        <div className="text-right space-y-1 z-10">
          <span className="text-[11px] font-bold text-blue-100 block">📊 إجمالي قيمة المخزون الكلية للأصناف</span>
          <h3 className="text-2xl font-black font-mono tracking-tight">
            {grandTotalInventoryValue.toLocaleString()} ر.س
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs z-10 bg-white/10 p-3 rounded-2xl border border-white/10 font-bold">
          <div>
            <span className="opacity-80 block text-[10px] text-center">إجمالي الأصناف المعرّفة</span>
            <span className="block text-center font-mono font-black mt-0.5">{items.length} صنف</span>
          </div>
          <span className="h-6 w-px bg-white/20" />
          <div>
            <span className="opacity-80 block text-[10px] text-center">متوسط سعر الوحدة</span>
            <span className="block text-center font-mono font-black mt-0.5">
              {(items.length > 0 ? (items.reduce((sum, i) => sum + i.price, 0) / items.length) : 0).toFixed(2)} ر.س
            </span>
          </div>
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
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="البحث الذكي الفوري بالاسم أو الرمز (ID)... ⚡"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm pl-12 pr-11 py-3.5 rounded-2xl outline-hidden transition-all text-slate-700 text-right font-bold placeholder:text-slate-400"
              />
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
              
              {/* Voice search mic button */}
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                  isListening 
                    ? 'bg-rose-100 text-rose-600 animate-pulse' 
                    : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                }`}
                title="البحث الصوتي الذكي (تحدث الآن)"
              >
                {isListening ? <MicOff size={16} className="stroke-[2.5]" /> : <Mic size={16} className="stroke-[2.5]" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchScannerOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 shrink-0"
              title="مسح باركود الصنف للبحث الفوري"
            >
              <Camera size={16} className="stroke-[2.5]" />
              <span className="text-xs font-black hidden sm:inline">مسح باركود للبحث</span>
            </button>
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

            {/* Expiration Alert Configuration */}
            <div className="space-y-1.5 col-span-1 md:col-span-3 border-t border-slate-200/50 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs font-extrabold text-slate-600">⚙️ ضبط تنبيهات الصلاحية (تنبيه ذكي للمستودع قبل كم شهر):</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={expirationAlertMonths <= 1}
                  onClick={() => onUpdateExpirationAlertMonths?.(expirationAlertMonths - 1)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  -
                </button>
                <span className="bg-white border border-slate-200 text-slate-800 font-extrabold text-xs px-4 py-1.5 rounded-lg font-mono">
                  {expirationAlertMonths} {expirationAlertMonths === 1 ? 'شهر واحد' : expirationAlertMonths === 2 ? 'شهرين' : `${expirationAlertMonths} أشهر`}
                </span>
                <button
                  type="button"
                  disabled={expirationAlertMonths >= 12}
                  onClick={() => onUpdateExpirationAlertMonths?.(expirationAlertMonths + 1)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
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

        {/* Categories & View Mode Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-100/70 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none no-scrollbar flex-1">
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

          {/* Table vs Cards Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>🗂️ عرض البطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>📊 عرض الجدول</span>
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="w-full">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">لم يتم العثور على أي أصناف</p>
            <p className="text-xs mt-1">أضف أصنافًا جديدة أو عدّل خيارات البحث والتصفية</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-x-auto bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-300">
                  {/* Sticky right columns for name/id */}
                  <th className="p-4 text-right sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px]">رمز الصنف</th>
                  <th className="p-4 text-right sticky right-[120px] bg-slate-100 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[150px]">اسم الصنف</th>
                  <th className="p-4 text-right min-w-[100px]">الفئة</th>
                  <th className="p-4 text-right min-w-[100px]">الرصيد الحالي</th>
                  <th className="p-4 text-right min-w-[100px]">سعر الوحدة</th>
                  <th className="p-4 text-right min-w-[120px]">القيمة الإجمالية</th>
                  <th className="p-4 text-right min-w-[120px]">حد الأمان</th>
                  <th className="p-4 text-right min-w-[150px]">تاريخ الصلاحية</th>
                  <th className="p-4 text-center min-w-[120px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-600 dark:text-slate-400">
                {filteredItems.map((item) => {
                  const balance = movements
                    ? movements
                        .filter(m => m.itemId === item.id)
                        .reduce((sum, m) => sum + (m.type === 'in' ? m.quantity : -m.quantity), 0)
                    : 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.id}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200 sticky right-[120px] bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.name}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                          {item.category || 'غير محدد'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
                          balance === 0 
                            ? 'bg-rose-50 text-rose-600' 
                            : balance <= item.safetyLimit 
                              ? 'bg-amber-50 text-amber-600' 
                              : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {balance} {item.unit}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{item.price} {item.currency || 'ر.س'}</td>
                      <td className="p-4 font-mono font-bold text-blue-600">{(balance * item.price).toLocaleString()} {item.currency || 'ر.س'}</td>
                      <td className="p-4 font-mono">{item.safetyLimit}</td>
                      <td className="p-4 text-xs">
                        {item.expirationDate ? (
                          <span className={balance <= item.safetyLimit ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            {item.expirationDate}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDataLocked ? (
                            <span className="text-amber-600 bg-amber-50 text-[9px] font-bold px-2 py-1 rounded-lg">عرض فقط</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="تعديل"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف الصنف "${item.name}"؟`)) {
                                    onDeleteItem(item.id);
                                  }
                                }}
                                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

              const balance = movements
                ? movements
                    .filter(m => m.itemId === item.id)
                    .reduce((sum, m) => sum + (m.type === 'in' ? m.quantity : -m.quantity), 0)
                : 0;
              const isUnderSafetyLimit = balance <= item.safetyLimit;

              // Compute Expiration Badge
              let expBadge = null;
              if (item.expirationDate) {
                const expTime = new Date(item.expirationDate).setHours(0,0,0,0);
                const todayTime = new Date().setHours(0,0,0,0);
                const thirtyDaysFromNow = todayTime + (30 * 24 * 60 * 60 * 1000);

                if (expTime <= todayTime) {
                  expBadge = (
                    <span className="bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 animate-pulse">
                      منتهي الصلاحية ⚠️ ({item.expirationDate})
                    </span>
                  );
                } else if (expTime <= thirtyDaysFromNow) {
                  expBadge = (
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                      قريب الانتهاء ⚠️ ({item.expirationDate})
                    </span>
                  );
                } else {
                  expBadge = (
                    <span className="bg-slate-50 text-slate-500 border border-slate-100 text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1">
                      صلاحية: {item.expirationDate}
                    </span>
                  );
                }
              }

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
                        {isUnderSafetyLimit && (
                          <AlertTriangle size={16} className="text-rose-500 stroke-[2.5] animate-pulse shrink-0" title="كمية منخفضة تحت حد الطلب الأدنى" />
                        )}
                        <h3 className="font-bold text-slate-800 text-base">{item.name}</h3>
                        <span className="text-xs font-bold text-slate-400 font-mono">({item.id})</span>
                        <span className="text-slate-300 ml-auto sm:hidden">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                      
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                          balance === 0 
                            ? 'bg-rose-50 text-rose-600 border-rose-100' 
                            : balance <= item.safetyLimit 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          📦 الرصيد: {balance} {item.unit}
                        </span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                          💰 القيمة: {(balance * item.price).toLocaleString()} {item.currency || 'ر.س'}
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                          السعر: {item.price} {item.currency || 'ر.س'}
                        </span>
                        <span className="bg-blue-50/50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                          حد الأمان: {item.safetyLimit}
                        </span>
                        {item.category && (
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <Tag size={12} className="stroke-[2.5]" />
                            {item.category}
                          </span>
                        )}
                        {item.unitMajor && item.unitMinor && item.unitConversion && (
                          <span className="bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                            📦 {item.unitMajor} = {item.unitConversion} {item.unitMinor}
                          </span>
                        )}
                        {expBadge}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <span>السعر</span>
                    {currentUser?.permissions?.canEditPrices === false && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.price}
                    disabled={currentUser?.permissions?.canEditPrices === false}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className={`w-full border text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700 ${
                      currentUser?.permissions?.canEditPrices === false ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <span>العملة</span>
                    {currentUser?.permissions?.canEditPrices === false && <Lock size={12} className="text-slate-400" />}
                  </label>
                  <select
                    value={formData.currency}
                    disabled={currentUser?.permissions?.canEditPrices === false}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={`w-full border text-sm px-4 py-2.5 rounded-xl outline-hidden text-right cursor-pointer ${
                      currentUser?.permissions?.canEditPrices === false ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-700'
                    }`}
                  >
                    <option value="ر.س">ر.س</option>
                    <option value="ر.ي">ر.ي</option>
                    <option value="دولار">دولار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة الافتراضية</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 text-sm px-4 py-2.5 rounded-xl outline-hidden text-slate-700"
                    placeholder="مثال: حبة، كرتون"
                  />
                </div>
              </div>

              {/* Units Conversion Setup (حبة / كرتون / درزن) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[11px] font-black text-blue-600 block">📦 إعدادات وحدات القياس (الصغرى والكبرى):</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الوحدة الكبرى</label>
                    <input
                      type="text"
                      value={formData.unitMajor}
                      onChange={(e) => setFormData({ ...formData, unitMajor: e.target.value })}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 text-xs px-3 py-2 rounded-xl text-slate-700"
                      placeholder="كرتون / درزن"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الوحدة الصغرى</label>
                    <input
                      type="text"
                      value={formData.unitMinor}
                      onChange={(e) => setFormData({ ...formData, unitMinor: e.target.value })}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 text-xs px-3 py-2 rounded-xl text-slate-700"
                      placeholder="حبة"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">عامل التحويل</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.unitConversion}
                      onChange={(e) => setFormData({ ...formData, unitConversion: Number(e.target.value) || 1 })}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 text-xs px-3 py-2 rounded-xl text-slate-700 font-mono text-center"
                      placeholder="مثال: 24"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  💡 تتيح هذه الميزة شحن البضائع كرتونياً وصرفها بالحبات مع تتبع الجرد الدقيق (مثال: كرتون يحتوي على 24 حبة).
                </p>
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

      {/* Barcode Scanner Modal Component for searching items */}
      <BarcodeScannerModal
        isOpen={isSearchScannerOpen}
        onClose={() => setIsSearchScannerOpen(false)}
        items={items}
        allowNewCode={true}
        onScan={(scannedCode) => {
          setSearch(scannedCode);
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
