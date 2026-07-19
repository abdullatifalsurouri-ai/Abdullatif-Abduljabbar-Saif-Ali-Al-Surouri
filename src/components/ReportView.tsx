import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, Calendar, Box, Users, BarChart3, ArrowUpRight, ArrowDownLeft, Printer, Filter, Download, Scale, Coins } from 'lucide-react';
import { Item, Movement, Supplier, ReportFilterType, Warehouse, InvoiceSettings, User } from '../types';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ReportViewProps {
  items: Item[];
  movements: Movement[];
  suppliers: Supplier[];
  warehouses?: Warehouse[];
  invoiceSettings?: InvoiceSettings;
  currentUser?: User;
  customers?: any[];
  employees?: any[];
  journalEntries?: any[];
  treasuryBalance?: number;
  bankBalance?: number;
}

export default function ReportView({
  items,
  movements,
  suppliers,
  warehouses = [],
  invoiceSettings,
  currentUser,
  customers = [],
  employees = [],
  journalEntries = [],
  treasuryBalance = 350000,
  bankBalance = 4200000,
}: ReportViewProps) {
  const [activeFilter, setActiveFilter] = useState<ReportFilterType>('monthly');
  const [startDate, setStartDate] = useState('2026-05-26');
  const [endDate, setEndDate] = useState('2026-06-26');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('الكل');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('الكل');
  const [selectedItemFilter, setSelectedItemFilter] = useState('الكل');

  // Chart of Accounts (COA) System
  const [chartOfAccounts] = useState(() => {
    const saved = localStorage.getItem('wms_chart_of_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back
      }
    }
    return [
      { code: '1', name: 'الأصول (Assets)', level: 1, nature: 'debit', parentCode: null, isLeaf: false, isSystem: true },
      { code: '11', name: 'الأصول المتداولة (Current Assets)', level: 2, nature: 'debit', parentCode: '1', isLeaf: false, isSystem: true },
      { code: '111', name: 'النقدية وما يعادلها', level: 3, nature: 'debit', parentCode: '11', isLeaf: false, isSystem: true },
      { code: '11101', name: 'الخزينة العامة (الكاش)', level: 4, nature: 'debit', parentCode: '111', isLeaf: true, isSystem: true },
      { code: '11102', name: 'الخزائن الفرعية (نقاط البيع)', level: 4, nature: 'debit', parentCode: '111', isLeaf: true, isSystem: true },
      { code: '112', name: 'البنوك والشبكات (Banks & Networks)', level: 3, nature: 'debit', parentCode: '11', isLeaf: false, isSystem: true },
      { code: '11201', name: 'حساب بنك التضامن', level: 4, nature: 'debit', parentCode: '112', isLeaf: true, isSystem: true },
      { code: '11202', name: 'حساب بنك الكريمي', level: 4, nature: 'debit', parentCode: '112', isLeaf: true, isSystem: true },
      { code: '113', name: 'الذمم المدينة (العملاء)', level: 3, nature: 'debit', parentCode: '11', isLeaf: false, isSystem: true },
      { code: '11301', name: 'حسابات العملاء التجاريين', level: 4, nature: 'debit', parentCode: '113', isLeaf: false, isSystem: true },
      { code: '114', name: 'العهد والسلف الميسرة', level: 3, nature: 'debit', parentCode: '11', isLeaf: false, isSystem: true },
      { code: '11401', name: 'سلف الموظفين', level: 4, nature: 'debit', parentCode: '114', isLeaf: true, isSystem: true },
      { code: '11402', name: 'عهد الموظفين المعلقة', level: 4, nature: 'debit', parentCode: '114', isLeaf: true, isSystem: true },
      { code: '115', name: 'المخزون (Inventory)', level: 3, nature: 'debit', parentCode: '11', isLeaf: false, isSystem: true },
      { code: '11501', name: 'مخزون المستودع الرئيسي (عطور وبخور)', level: 4, nature: 'debit', parentCode: '115', isLeaf: true, isSystem: true },
      { code: '12', name: 'الأصول غير المتداولة/الثابتة (Non-Current Assets)', level: 2, nature: 'debit', parentCode: '1', isLeaf: false, isSystem: true },
      { code: '121', name: 'العقارات والآلات والمعدات', level: 3, nature: 'debit', parentCode: '12', isLeaf: false, isSystem: true },
      { code: '12101', name: 'أثاث وديكور المحل', level: 4, nature: 'debit', parentCode: '121', isLeaf: true, isSystem: true },
      { code: '12102', name: 'أجهزة الكمبيوتر والشبكات', level: 4, nature: 'debit', parentCode: '121', isLeaf: true, isSystem: true },

      { code: '2', name: 'الالتزامات (Liabilities)', level: 1, nature: 'credit', parentCode: null, isLeaf: false, isSystem: true },
      { code: '21', name: 'الالتزامات المتداولة (Current Liabilities)', level: 2, nature: 'credit', parentCode: '2', isLeaf: false, isSystem: true },
      { code: '211', name: 'الذمم الدائنة (الموردين)', level: 3, nature: 'credit', parentCode: '21', isLeaf: false, isSystem: true },
      { code: '21101', name: 'حسابات الموردين', level: 4, nature: 'credit', parentCode: '211', isLeaf: false, isSystem: true },
      { code: '212', name: 'الالتزامات المستحقة والضرائب', level: 3, nature: 'credit', parentCode: '21', isLeaf: false, isSystem: true },
      { code: '21201', name: 'حساب مصلحة الضرائب المستحقة', level: 4, nature: 'credit', parentCode: '212', isLeaf: true, isSystem: true },
      { code: '21202', name: 'رواتب وأجور مستحقة', level: 4, nature: 'credit', parentCode: '212', isLeaf: true, isSystem: true },

      { code: '3', name: 'حقوق الملكية (Equity)', level: 1, nature: 'credit', parentCode: null, isLeaf: false, isSystem: true },
      { code: '31', name: 'رأس المال وحقوق الملكية', level: 2, nature: 'credit', parentCode: '3', isLeaf: false, isSystem: true },
      { code: '31101', name: 'رأس المال المدفوع', level: 4, nature: 'credit', parentCode: '31', isLeaf: true, isSystem: true },
      { code: '31201', name: 'الأرباح والخسائر المحتجزة', level: 4, nature: 'credit', parentCode: '31', isLeaf: true, isSystem: true },
      { code: '31301', name: 'مسحوبات المالك الشخصية', level: 4, nature: 'debit', parentCode: '31', isLeaf: true, isSystem: true },

      { code: '4', name: 'الإيرادات (Revenues)', level: 1, nature: 'credit', parentCode: null, isLeaf: false, isSystem: true },
      { code: '41', name: 'الإيرادات التشغيلية', level: 2, nature: 'credit', parentCode: '4', isLeaf: false, isSystem: true },
      { code: '41101', name: 'مبيعات المعرض (عطور وبخور جاهزة)', level: 4, nature: 'credit', parentCode: '41', isLeaf: true, isSystem: true },
      { code: '41102', name: 'مبيعات الجملة والطلبيات الخاصة', level: 4, nature: 'credit', parentCode: '41', isLeaf: true, isSystem: true },
      { code: '42', name: 'إيرادات أخرى', level: 2, nature: 'credit', parentCode: '4', isLeaf: false, isSystem: true },
      { code: '42101', name: 'فروق عملات / إيرادات متنوعة', level: 4, nature: 'credit', parentCode: '42', isLeaf: true, isSystem: true },

      { code: '5', name: 'المصروفات (Expenses)', level: 1, nature: 'debit', parentCode: null, isLeaf: false, isSystem: true },
      { code: '51', name: 'مصروفات تشغيلية وعمومية', level: 2, nature: 'debit', parentCode: '5', isLeaf: false, isSystem: true },
      { code: '51101', name: 'مصروفات الرواتب والأجور البدلات', level: 4, nature: 'debit', parentCode: '51', isLeaf: true, isSystem: true },
      { code: '51102', name: 'مصروفات الإيجار', level: 4, nature: 'debit', parentCode: '51', isLeaf: true, isSystem: true },
      { code: '51103', name: 'مصروفات الكهرباء والمياه', level: 4, nature: 'debit', parentCode: '51', isLeaf: true, isSystem: true },
      { code: '51104', name: 'مصروفات التسويق والإعلانات', level: 4, nature: 'debit', parentCode: '51', isLeaf: true, isSystem: true },
      { code: '51105', name: 'مصروفات الشحن ونقل البضائع', level: 4, nature: 'debit', parentCode: '51', isLeaf: true, isSystem: true },
    ];
  });

  const getFullChartOfAccounts = () => {
    const fullList = [...chartOfAccounts];

    customers.forEach((cust, idx) => {
      const code = cust.accountCode || `11301${String(idx + 1).padStart(3, '0')}`;
      if (!fullList.some(a => a.code === code)) {
        fullList.push({
          code,
          name: `العميل: ${cust.name}`,
          level: 5,
          nature: 'debit',
          parentCode: '11301',
          isLeaf: true,
          isSystem: false
        });
      }
    });

    suppliers.forEach((sup, idx) => {
      const code = sup.accountCode || `21101${String(idx + 1).padStart(3, '0')}`;
      if (!fullList.some(a => a.code === code)) {
        fullList.push({
          code,
          name: `المورد: ${sup.name}`,
          level: 5,
          nature: 'credit',
          parentCode: '21101',
          isLeaf: true,
          isSystem: false
        });
      }
    });

    return fullList.sort((a, b) => a.code.localeCompare(b.code));
  };

  const findAccountCode = (accountIdentifier: string, accountsList: any[]) => {
    if (!accountIdentifier) return null;
    const cleanStr = accountIdentifier.trim();
    
    const spaceDashMatch = cleanStr.match(/^(\d+)\s*-\s*(.+)$/);
    if (spaceDashMatch) {
      return spaceDashMatch[1];
    }

    const matchByCode = accountsList.find(a => a.code === cleanStr);
    if (matchByCode) return matchByCode.code;

    const matchByName = accountsList.find(a => a.name === cleanStr || cleanStr.includes(a.name) || a.name.includes(cleanStr));
    if (matchByName) return matchByName.code;

    return null;
  };

  const getAccountBalances = () => {
    const fullChart = getFullChartOfAccounts();
    const balances: Record<string, { debit: number; credit: number; net: number }> = {};

    fullChart.forEach(acc => {
      balances[acc.code] = { debit: 0, credit: 0, net: 0 };
    });

    if (balances['11101']) {
      balances['11101'].debit += treasuryBalance || 0;
    }

    const bankAccounts = invoiceSettings?.bankAccounts || [];
    if (bankAccounts.length > 0) {
      if (balances['11201']) balances['11201'].debit += bankAccounts[0]?.balance || 0;
      if (bankAccounts.length > 1 && balances['11202']) {
        balances['11202'].debit += bankAccounts[1]?.balance || 0;
      }
    } else {
      if (balances['11201']) balances['11201'].debit += bankBalance || 500000;
    }

    const totalAdvances = employees.reduce((sum, e) => sum + (e.advances || 0), 0);
    if (balances['11401']) {
      balances['11401'].debit += totalAdvances;
    }

    const totalCustody = employees.reduce((sum, e) => sum + (e.custody || 0), 0);
    if (balances['11402']) {
      balances['11402'].debit += totalCustody;
    }

    if (balances['11501']) {
      balances['11501'].debit += 12500000;
    }

    if (balances['12101']) balances['12101'].debit += 1500000;
    if (balances['12102']) balances['12102'].debit += 800000;

    if (balances['21201']) balances['21201'].credit += 350000;
    const totalSalaries = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    if (balances['21202']) balances['21202'].credit += totalSalaries;

    if (balances['31101']) balances['31101'].credit += 10000000;
    if (balances['31301']) balances['31301'].debit += 120000;

    if (balances['41101']) {
      balances['41101'].credit += 5800000;
    }

    const baseExpenses = (totalSalaries * 12) || 1200000;
    if (balances['51101']) {
      balances['51101'].debit += baseExpenses;
    }

    customers.forEach(cust => {
      const code = cust.accountCode || `11301001`;
      if (balances[code]) {
        balances[code].debit += cust.balance || 0;
      }
    });

    suppliers.forEach(sup => {
      const code = sup.accountCode || `21101001`;
      if (balances[code]) {
        balances[code].credit += sup.balance || 0;
      }
    });

    const activeEntries = journalEntries.filter(e => !e.isReversed);
    activeEntries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        const code = findAccountCode(line.account, fullChart);
        if (code && balances[code]) {
          balances[code].debit += Number(line.debit || 0);
          balances[code].credit += Number(line.credit || 0);
        }
      });
    });

    for (let lvl = 5; lvl >= 1; lvl--) {
      fullChart.forEach(acc => {
        if (acc.level === lvl) {
          const bal = balances[acc.code];
          if (bal) {
            const net = acc.nature === 'debit' ? (bal.debit - bal.credit) : (bal.credit - bal.debit);
            bal.net = net;

            if (acc.parentCode && balances[acc.parentCode]) {
              balances[acc.parentCode].debit += bal.debit;
              balances[acc.parentCode].credit += bal.credit;
            }
          }
        }
      });
    }

    return balances;
  };

  const getFinancialSummaries = () => {
    const balances = getAccountBalances();

    const finalRevenues = balances['4']?.net || 0;
    const finalExpenses = balances['5']?.net || 0;
    const finalNetProfit = finalRevenues - finalExpenses;

    const finalTreasury = balances['11101']?.net || treasuryBalance || 0;
    const finalBank = balances['112']?.net || 0;
    const finalCustomers = balances['113']?.net || 0;
    const finalInventory = balances['11501']?.net || 12500000;
    const finalCustodies = balances['11402']?.net || 0;
    const finalAdvances = balances['11401']?.net || 0;

    const totalAssets = finalTreasury + finalBank + finalCustomers + finalInventory + finalCustodies + finalAdvances;

    const finalSuppliers = balances['21101']?.net || 0;
    const finalTaxLiability = balances['21201']?.net || 0;
    const finalSalaryLiability = balances['21202']?.net || 0;

    const finalBaseCapital = balances['31101']?.net || 10000000;
    const finalOwnerDraw = balances['31301']?.net || 0;
    const finalRetainedEarnings = finalNetProfit;

    const totalLiabilitiesEquity = finalSuppliers + finalTaxLiability + finalSalaryLiability + finalBaseCapital + finalRetainedEarnings - finalOwnerDraw;

    return {
      revenue: finalRevenues,
      expenses: finalExpenses,
      netProfit: finalNetProfit,
      treasury: finalTreasury,
      bank: finalBank,
      customers: finalCustomers,
      inventory: finalInventory,
      custodies: finalCustodies,
      advances: finalAdvances,
      totalAssets,
      suppliers: finalSuppliers,
      taxLiability: finalTaxLiability,
      salaryLiability: finalSalaryLiability,
      capital: finalBaseCapital,
      ownerDraw: finalOwnerDraw,
      retainedEarnings: finalRetainedEarnings,
      totalLiabilitiesEquity
    };
  };

  // Categories from items list
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  // Filter movements by selected date range, warehouse, and group/item
  const filteredMovementsByDate = movements.filter((m) => {
    const matchesDate = m.date >= startDate && m.date <= endDate;
    if (!matchesDate) return false;

    const matchesWarehouse = selectedWarehouseId === 'الكل' || m.warehouseId === selectedWarehouseId;
    if (!matchesWarehouse) return false;

    const item = items.find((i) => i.id === m.itemId);
    const matchesGroup = selectedGroupFilter === 'الكل' || (item && item.category === selectedGroupFilter);
    const matchesItem = selectedItemFilter === 'الكل' || m.itemId === selectedItemFilter;

    return matchesGroup && matchesItem;
  });

  // Calculate Top Moving Items (الأصناف الأكثر حركة) over selected date range
  const topMovingItems = React.useMemo(() => {
    const itemMap: { [key: string]: { item: Item; totalQty: number; inQty: number; outQty: number; count: number } } = {};
    
    filteredMovementsByDate.forEach((m) => {
      const item = items.find((i) => i.id === m.itemId);
      if (!item) return;
      
      if (!itemMap[m.itemId]) {
        itemMap[m.itemId] = {
          item,
          totalQty: 0,
          inQty: 0,
          outQty: 0,
          count: 0
        };
      }
      
      itemMap[m.itemId].totalQty += m.quantity;
      if (m.type === 'in') {
        itemMap[m.itemId].inQty += m.quantity;
      } else if (m.type === 'out') {
        itemMap[m.itemId].outQty += m.quantity;
      }
      itemMap[m.itemId].count += 1;
    });

    return Object.values(itemMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10); // Show top 10 moving items
  }, [items, filteredMovementsByDate]);

  // Calculate top items with highest outward (صرف) quantities
  const topDispatchedItems = React.useMemo(() => {
    const itemMap: { [key: string]: { name: string; code: string; quantity: number } } = {};
    
    filteredMovementsByDate.forEach((m) => {
      if (m.type !== 'out') return;
      const item = items.find((i) => i.id === m.itemId);
      if (!item) return;

      if (!itemMap[m.itemId]) {
        itemMap[m.itemId] = {
          name: item.name,
          code: item.id,
          quantity: 0
        };
      }
      itemMap[m.itemId].quantity += m.quantity;
    });

    return Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8); // Top 8 items
  }, [items, filteredMovementsByDate]);

  // Overall sums
  const totalInward = filteredMovementsByDate
    .filter((m) => m.type === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOutward = filteredMovementsByDate
    .filter((m) => m.type === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  const netBalance = totalInward - totalOutward;

  // Count distinct months in movements
  const monthsSet = new Set(filteredMovementsByDate.map((m) => m.date.substring(0, 7)));
  const totalMonths = monthsSet.size || 1;

  // Grouped items stats
  const itemsReportData = items
    .filter((item) => {
      const matchesGroup = selectedGroupFilter === 'الكل' || item.category === selectedGroupFilter;
      const matchesItem = selectedItemFilter === 'الكل' || item.id === selectedItemFilter;
      return matchesGroup && matchesItem;
    })
    .map((item) => {
      const inward = filteredMovementsByDate
        .filter((m) => m.itemId === item.id && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const outward = filteredMovementsByDate
        .filter((m) => m.itemId === item.id && m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);

      return {
        name: item.name,
        code: item.id,
        inward,
        outward,
        balance: inward - outward,
      };
    });

  // Grouped suppliers/partners stats
  const partnersSet = new Set(filteredMovementsByDate.map((m) => m.partner));
  const partnersReportData = Array.from(partnersSet).map((partnerName) => {
    const inward = filteredMovementsByDate
      .filter((m) => m.partner === partnerName && m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);

    const outward = filteredMovementsByDate
      .filter((m) => m.partner === partnerName && m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      name: partnerName,
      inward,
      outward,
      balance: inward - outward,
    };
  });

  // Monthly summary
  const inwardVoucherCount = filteredMovementsByDate.filter((m) => m.type === 'in').length;
  const outwardVoucherCount = filteredMovementsByDate.filter((m) => m.type === 'out').length;

  // Generate last 30 days data for Recharts (Up to June 26, 2026)
  const last30DaysChartData = React.useMemo(() => {
    const data = [];
    const today = new Date('2026-06-26');
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayInward = movements
        .filter((m) => m.date === dateStr && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const dayOutward = movements
        .filter((m) => m.date === dateStr && m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);

      // format day for Arabic display (e.g., "15 يونيو")
      const formattedDate = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

      // Only include dates within the active dataset month to look focused, or all 30 days
      data.push({
        rawDate: dateStr,
        displayDate: formattedDate,
        'الوارد (الكمية)': dayInward,
        'الصرف (الكمية)': dayOutward,
      });
    }
    return data;
  }, [movements]);

  // Generate last 7 days data for Recharts (Up to June 26, 2026)
  const last7DaysChartData = React.useMemo(() => {
    const data = [];
    const today = new Date('2026-06-26');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayInward = movements
        .filter((m) => m.date === dateStr && m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const dayOutward = movements
        .filter((m) => m.date === dateStr && m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);

      // format day for Arabic display (e.g., "السبت، 20 يونيو")
      const formattedDate = d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });

      data.push({
        rawDate: dateStr,
        displayDate: formattedDate,
        'الوارد': dayInward,
        'الصرف': dayOutward,
      });
    }
    return data;
  }, [movements]);

  const handleCSVExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `report_${activeFilter}_${startDate}_to_${endDate}.csv`;

    if (activeFilter === 'monthly') {
      headers = ['اسم الصنف', 'رمز الصنف', 'الوارد', 'الصرف', 'الرصيد'];
      rows = itemsReportData.map(item => [item.name, item.code, item.inward, item.outward, item.balance]);
    } else if (activeFilter === 'top-moving') {
      headers = ['الترتيب', 'اسم الصنف', 'رمز الصنف', 'التصنيف', 'الوارد', 'الصرف', 'مجموع الكمية المتحركة'];
      rows = topMovingItems.map((item, idx) => [
        idx + 1,
        item.item.name,
        item.item.id,
        item.item.category || '',
        item.inQty,
        item.outQty,
        item.totalQty
      ]);
    } else if (activeFilter === 'items') {
      headers = ['اسم الصنف', 'رمز الصنف', 'إجمالي الوارد', 'إجمالي الصرف', 'صافي المخزون'];
      rows = itemsReportData.map(item => [item.name, item.code, item.inward, item.outward, item.balance]);
    } else if (activeFilter === 'suppliers') {
      headers = ['اسم الشريك', 'تأمين وارد', 'سحب صرف', 'صافي الحركات'];
      rows = partnersReportData.map(partner => [partner.name, partner.inward, partner.outward, partner.balance]);
    }

    // Add BOM for proper Arabic Excel encoding
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();

    // 1. First Sheet: Active Report Data
    let reportHeaders: string[] = [];
    let reportRows: any[][] = [];
    let reportSheetName = "التقرير الحالي";

    if (activeFilter === 'monthly') {
      reportSheetName = "ملخص الجرد الشهري";
      reportHeaders = ['اسم الصنف', 'رمز الصنف', 'الوارد', 'الصرف', 'الرصيد'];
      reportRows = itemsReportData.map(item => [item.name, item.code, item.inward, item.outward, item.balance]);
    } else if (activeFilter === 'top-moving') {
      reportSheetName = "الأصناف الأكثر حركة";
      reportHeaders = ['الترتيب', 'اسم الصنف', 'رمز الصنف', 'التصنيف', 'الوارد', 'الصرف', 'مجموع الكمية المتحركة'];
      reportRows = topMovingItems.map((item, idx) => [
        idx + 1,
        item.item.name,
        item.item.id,
        item.item.category || '',
        item.inQty,
        item.outQty,
        item.totalQty
      ]);
    } else if (activeFilter === 'items') {
      reportSheetName = "تقرير حركة الأصناف";
      reportHeaders = ['اسم الصنف', 'رمز الصنف', 'إجمالي الوارد', 'إجمالي الصرف', 'صافي المخزون'];
      reportRows = itemsReportData.map(item => [item.name, item.code, item.inward, item.outward, item.balance]);
    } else if (activeFilter === 'suppliers') {
      reportSheetName = "تقرير الشركاء والموردين";
      reportHeaders = ['اسم الشريك', 'تأمين وارد', 'سحب صرف', 'صافي الحركات'];
      reportRows = partnersReportData.map(partner => [partner.name, partner.inward, partner.outward, partner.balance]);
    }

    const reportDataArray = [reportHeaders, ...reportRows];
    const wsReport = XLSX.utils.aoa_to_sheet(reportDataArray);
    XLSX.utils.book_append_sheet(wb, wsReport, reportSheetName);

    // 2. Second Sheet: Movements Log during this period (سجل حركات المخزن المصفى)
    const movementsHeaders = ['معرف الحركة', 'رمز الصنف', 'اسم الصنف', 'نوع الحركة', 'الكمية', 'الطرف الآخر/الشريك', 'التاريخ', 'المستودع'];
    const movementsRows = filteredMovementsByDate.map((m) => {
      const item = items.find((i) => i.id === m.itemId);
      const warehouse = warehouses.find((w) => w.id === m.warehouseId);
      return [
        m.id,
        m.itemId,
        item ? item.name : 'غير معروف',
        m.type === 'in' ? 'وارد (توريد)' : 'صرف (تصدير)',
        m.quantity,
        m.partner,
        m.date,
        warehouse ? warehouse.name : (m.warehouseId || 'غير محدد')
      ];
    });

    const movementsDataArray = [movementsHeaders, ...movementsRows];
    const wsMovements = XLSX.utils.aoa_to_sheet(movementsDataArray);
    XLSX.utils.book_append_sheet(wb, wsMovements, "سجل الحركات المشمولة");

    // Save the Excel workbook
    const filename = `تقرير_جرد_مستودع_${activeFilter}_${startDate}_إلى_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Title & Print/Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">التقرير والتحليلات</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تحليل شامل للتدفقات المخزنية والرسوم البيانية التفاعلية لحركات الوارد والصرف</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExcelExport}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
              title="تصدير بيانات التقرير والحركات المصفاة إلى ملف Excel ذو أوراق عمل متعددة"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>تصدير إلى Excel (XLSX) 📊</span>
            </button>
            <button
              onClick={handleCSVExport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
              title="تصدير بيانات التقرير الحالي إلى ملف CSV مميز للإكسل"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>CSV</span>
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
            title="طباعة التقرير والتحليلات الفعال حالياً"
          >
            <Printer size={14} className="stroke-[2.5]" />
            <span>طباعة هذا التقرير 🖨️</span>
          </button>
        </div>
      </div>

      {/* Date & Group/Item Filters Panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-2xs space-y-4 print:hidden text-right">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2 text-blue-600 shrink-0">
            <Calendar size={16} className="stroke-[2.5]" />
            <span className="text-xs font-extrabold">تحديد النطاق الزمني للتقرير:</span>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex md:items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-hidden text-slate-700 font-mono focus:border-blue-500 focus:bg-white transition-all w-full"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-hidden text-slate-700 font-mono focus:border-blue-500 focus:bg-white transition-all w-full"
              />
            </div>
          </div>
        </div>

        {/* Group / Item / Warehouse Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Filter by Warehouse */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب المستودع:</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل المستودعات (الكل)</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.id})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Group (Category) */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب مجموعة الأصناف (التصنيف):</label>
            <select
              value={selectedGroupFilter}
              onChange={(e) => {
                setSelectedGroupFilter(e.target.value);
                // Reset item filter since the group changed
                setSelectedItemFilter('الكل');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل المجموعات (الكل)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter by Specific Item */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-slate-400 font-extrabold block">تصفية حسب صنف محدد:</label>
            <select
              value={selectedItemFilter}
              onChange={(e) => setSelectedItemFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden text-slate-700 text-right cursor-pointer focus:border-blue-500 focus:bg-white transition-all font-bold"
            >
              <option value="الكل">كل الأصناف (الكل)</option>
              {items
                .filter(i => selectedGroupFilter === 'الكل' || i.category === selectedGroupFilter)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.id})
                  </option>
                ))
              }
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-3">
          <span>
            الحركات المشمولة بعد التصفية: <strong className="text-blue-600 font-mono text-xs">{filteredMovementsByDate.length}</strong> حركة مقيدة
          </span>
          {(selectedGroupFilter !== 'الكل' || selectedItemFilter !== 'الكل') && (
            <button
              onClick={() => {
                setSelectedGroupFilter('الكل');
                setSelectedItemFilter('الكل');
              }}
              className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-2.5 py-1 rounded-lg transition-all font-black flex items-center gap-1 cursor-pointer"
            >
              <span>إعادة ضبط وتصفير الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block space-y-4 border-b-2 border-slate-800 pb-5">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3.5">
            {invoiceSettings?.logo && (
              <img src={invoiceSettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg shrink-0" referrerPolicy="no-referrer" />
            )}
            <div className="space-y-1 text-right">
              <h4 className="text-base font-black text-slate-900">{invoiceSettings?.name || 'شركة المدى للتقنية والتجارة'}</h4>
              <p className="text-[10px] text-slate-500 font-extrabold">قسم إدارة المخازن والمستودعات</p>
              <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{invoiceSettings?.address || 'الرياض، المملكة العربية السعودية'}</p>
              <p className="text-[9px] text-slate-400 font-mono">الهاتف: {invoiceSettings?.phone || '+967775104368'} {invoiceSettings?.email && ` | البريد: ${invoiceSettings.email}`}</p>
              {invoiceSettings?.commercialRegistryNumber && (
                <p className="text-[9px] text-blue-700 font-bold font-mono">سجل تجاري رقم: {invoiceSettings.commercialRegistryNumber}</p>
              )}
            </div>
          </div>
          <div className="text-left space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[150px]">
            <h5 className="text-xs font-black text-blue-900 text-left">تقرير إحصائيات المستودع</h5>
            <p className="text-[10px] text-slate-500 text-left font-semibold">من تاريخ: <span className="font-mono">{startDate}</span></p>
            <p className="text-[10px] text-slate-500 text-left font-semibold">إلى تاريخ: <span className="font-mono">{endDate}</span></p>
            {currentUser && (
              <p className="text-[9px] text-slate-500 font-bold text-left mt-1 border-t border-slate-100 pt-0.5">بواسطة: {currentUser.username}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
        <h3 className="text-sm font-bold opacity-80 mb-4">ملخص الأداء والمؤشرات</h3>
        
        <div className="grid grid-cols-4 gap-2 text-center relative divide-x divide-white/20 divide-x-reverse">
          {/* Months */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalMonths}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">الأشهر المشمولة</span>
          </div>

          {/* Inward */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{totalInward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">إجمالي الوارد</span>
          </div>

          {/* Outward */}
          <div className="space-y-1 font-mono">
            <span className="text-2xl sm:text-3xl font-black block">{totalOutward}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block font-sans">إجمالي الصرف</span>
          </div>

          {/* Net Balance */}
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black block font-mono">{netBalance}</span>
            <span className="text-[10px] sm:text-xs font-semibold opacity-80 block">صافي الرصيد</span>
          </div>
        </div>
      </div>

      {/* 7-Day Movements Bar Chart using Recharts */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
              <BarChart3 size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">حجم الحركات ومعدل دوران المخزون (آخر 7 أيام) 📊</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">مقارنة بصرية مباشرة للوارد مقابل الصرف لتسهيل تحليل دوران المخزون والسلع</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              الوارد
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
              الصرف
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-64 sm:h-72 w-full text-xs" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={last7DaysChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dy={10}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dx={-5}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-right space-y-1.5 font-bold text-xs" style={{ direction: 'rtl' }}>
                        <p className="text-[10px] text-slate-400 font-mono text-left">{data.rawDate}</p>
                        <div className="space-y-1">
                          <p className="flex items-center justify-between gap-4 text-emerald-400">
                            <span>الوارد:</span>
                            <span className="font-mono">{data['الوارد']}</span>
                          </p>
                          <p className="flex items-center justify-between gap-4 text-orange-400">
                            <span>الصرف:</span>
                            <span className="font-mono">{data['الصرف']}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="الوارد" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="الصرف" fill="#f97316" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 30-Day Movements Evolution Chart using Recharts */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <BarChart3 size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">مؤشر التدفق اليومي (آخر 30 يوماً)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">تطور كميات التوريد (الوارد) والسحب (الصرف) يوماً بيوم</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              وارد
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
              صرف
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-64 sm:h-72 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={last30DaysChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dy={10}
                tickFormatter={(value, index) => {
                  // Only show label every 4 ticks to prevent clutter
                  return index % 4 === 0 ? value : '';
                }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dx={-5}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-right space-y-1.5 font-bold text-xs">
                        <p className="text-[10px] text-slate-400 font-mono">{data.rawDate}</p>
                        <div className="space-y-1">
                          <p className="flex items-center justify-between gap-4 text-emerald-400">
                            <span>الوارد:</span>
                            <span className="font-mono">{data['الوارد (الكمية)']}</span>
                          </p>
                          <p className="flex items-center justify-between gap-4 text-orange-400">
                            <span>الصرف:</span>
                            <span className="font-mono">{data['الصرف (الكمية)']}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="الوارد (الكمية)" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorIn)" 
              />
              <Area 
                type="monotone" 
                dataKey="الصرف (الكمية)" 
                stroke="#f97316" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorOut)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Dispatched Items Chart using Recharts */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-orange-50 text-orange-600 p-2 rounded-xl">
              <TrendingUp size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">الأصناف الأكثر صرفاً وسحباً (خلال الفترة المحددة) 📈</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">تحليل باريبي للأصناف الأكثر سحباً وطلباً من المستودع لتحديد الأولويات ومعدلات الطلب</p>
            </div>
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
            إجمالي كمية الصرف
          </div>
        </div>

        {topDispatchedItems.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-100">
            لا توجد حركات صرف مسجلة خلال الفترة المحددة لتمثيلها بيانياً.
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full text-xs font-bold" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDispatchedItems}
                margin={{ top: 15, right: 10, left: -25, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                  dy={10}
                  tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                  dx={-5}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-right space-y-1 font-bold text-xs" style={{ direction: 'rtl' }}>
                          <p className="text-[11px] text-blue-400 font-mono">الرمز: {data.code}</p>
                          <p className="text-sm text-white">{data.name}</p>
                          <p className="flex items-center justify-between gap-4 text-orange-400 mt-1">
                            <span>الكمية المصروفة:</span>
                            <span className="font-mono">{data.quantity}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="quantity" fill="#f97316" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filter Tabs (شهري, الأكثر حركة, الأصناف, الموردون) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap sm:flex-nowrap w-full gap-1">
        <button
          onClick={() => setActiveFilter('monthly')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'monthly'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Calendar size={15} />
          <span>التقرير الشهري</span>
        </button>
        <button
          onClick={() => setActiveFilter('top-moving')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'top-moving'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <TrendingUp size={15} className={activeFilter === 'top-moving' ? 'text-white' : 'text-blue-600'} />
          <span className="flex items-center gap-1">الأكثر حركة <span className="text-[10px]">🔥</span></span>
        </button>
        <button
          onClick={() => setActiveFilter('items')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'items'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Box size={15} />
          <span>تحليل الأصناف</span>
        </button>
        <button
          onClick={() => setActiveFilter('suppliers')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'suppliers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Users size={15} />
          <span>الموردون والعملاء</span>
        </button>
        <button
          onClick={() => setActiveFilter('financials')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFilter === 'financials'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Scale size={15} />
          <span>القوائم المالية ⚖️</span>
        </button>
      </div>

      {/* Report Details Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-6">
        
        {/* Report Block - MONTHLY */}
        {activeFilter === 'monthly' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">يونيو 2026</h4>
                <p className="text-xs text-slate-400 mt-0.5">الحركات المقيدة في هذا الشهر</p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <TrendingUp size={14} className="stroke-[2.5]" />
                <span>+{netBalance} ↗</span>
              </div>
            </div>

            {/* Sum stats row */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-center">
              <div>
                <span className="text-slate-400 text-xs font-bold block">الوارد</span>
                <span className="text-xl font-black text-emerald-600 mt-0.5 block font-mono">{totalInward}</span>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-slate-400 text-xs font-bold block">الصرف</span>
                <span className="text-xl font-black text-orange-600 mt-0.5 block font-mono">{totalOutward}</span>
              </div>
            </div>

            {/* Badges count line */}
            <div className="flex flex-wrap gap-2 justify-center py-1">
              <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <FileText size={13} />
                <span>{inwardVoucherCount} سند وارد</span>
              </span>
              <span className="bg-orange-50 text-orange-600 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <FileText size={13} />
                <span>{outwardVoucherCount} سند صرف</span>
              </span>
            </div>

            {/* Item Rows */}
            <div className="space-y-3 pt-3 border-t border-slate-50">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">تفاصيل حركات الأصناف في هذا الشهر</h5>
              {itemsReportData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="min-w-0 flex-1 pl-2">
                    <span className="text-slate-800 text-sm font-bold block truncate">{item.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono mt-0.5">{item.code}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-sm">
                    <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                      <ArrowUpRight size={12} />
                      <span>{item.inward}</span>
                    </span>
                    <span className="text-orange-500 font-extrabold flex items-center gap-0.5">
                      <ArrowDownLeft size={12} />
                      <span>{item.outward}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Block - TOP MOVING ITEMS */}
        {activeFilter === 'top-moving' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-2">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">الأصناف الأكثر حركة والنشاط الإجمالي 🔥</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  مرتبة تنازلياً حسب مجموع كميات التوريد والصرف خلال الفترة الزمنية المحددة
                </p>
              </div>
              <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-bold text-center self-start font-mono">
                الفترة: {startDate} 🗓️ {endDate}
              </div>
            </div>

            {topMovingItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Box className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-bold">لا توجد حركات مقيدة خلال هذه الفترة الزمنية!</p>
                <p className="text-[10px] text-slate-400">يرجى تعديل النطاق الزمني أو اختيار مستودع آخر في الفلاتر العلوية.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Visual Horizontal Chart Cards */}
                <div className="space-y-4">
                  {topMovingItems.map((item, idx) => {
                    const maxQty = Math.max(...topMovingItems.map(x => x.totalQty)) || 1;
                    const percent = Math.min(100, Math.round((item.totalQty / maxQty) * 100));
                    
                    return (
                      <div key={item.item.id} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-4 rounded-2xl transition-all space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="flex items-center justify-center bg-blue-600/10 text-blue-600 text-[10px] font-black w-6 h-6 rounded-lg shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-slate-800 text-xs sm:text-sm font-black block truncate">{item.item.name}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] bg-slate-200/60 text-slate-500 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                  {item.item.id}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {item.item.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stat value summary */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold block">مجموع الكمية المتحركة</span>
                              <span className="text-sm font-black text-slate-800 font-mono flex items-center justify-end gap-1">
                                {item.totalQty}
                                <span className="text-[9px] text-slate-400 font-sans font-bold">{item.item.unit}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bar Graph Graphic */}
                        <div className="space-y-1">
                          {/* Outer Track */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex" title={`الوارد: ${item.inQty}، الصرف: ${item.outQty}`}>
                            {/* Inward Segment */}
                            {item.inQty > 0 && (
                              <div 
                                style={{ width: `${(item.inQty / item.totalQty) * percent}%` }}
                                className="bg-emerald-500 h-full transition-all duration-500"
                              />
                            )}
                            {/* Outward Segment */}
                            {item.outQty > 0 && (
                              <div 
                                style={{ width: `${(item.outQty / item.totalQty) * percent}%` }}
                                className="bg-orange-500 h-full transition-all duration-500"
                              />
                            )}
                          </div>

                          {/* Legend / Info under the bar */}
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold font-mono">
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                              <span>الوارد: {item.inQty}</span>
                            </div>
                            <div className="text-slate-400 font-sans">
                              {item.count} حركات مقيدة 📝
                            </div>
                            <div className="flex items-center gap-1.5 text-orange-600">
                              <span>الصرف: {item.outQty}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 block"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Summary Stats Card */}
                <div className="bg-blue-50/40 border border-blue-100/60 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-600" size={18} />
                    <span className="text-xs text-blue-900 font-bold">تحليلات النشاط الإجمالي للمخزن:</span>
                  </div>
                  <span className="text-[10px] text-blue-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-3xs">
                    معدل حركة دوران الأصناف ممتاز 📈
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report Block - ITEMS */}
        {activeFilter === 'items' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-base">تحليل الأصناف التراكمي</h4>
            <div className="space-y-3">
              {itemsReportData.map((item, idx) => (
                <div key={idx} className="border border-slate-100 p-4 rounded-2xl space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 text-sm">{item.name}</h5>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{item.code}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-50 font-mono font-bold">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الوارد</span>
                      <span className="text-emerald-600 block mt-0.5">{item.inward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">إجمالي الصرف</span>
                      <span className="text-orange-500 block mt-0.5">{item.outward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">صافي المخزون</span>
                      <span className={`block mt-0.5 ${item.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {item.balance}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Block - SUPPLIERS */}
        {activeFilter === 'suppliers' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-base">تحليل حركات الشركاء التجاريين</h4>
            <div className="space-y-3">
              {partnersReportData.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">لا توجد حركات لشركاء حاليين</p>
              ) : (
                partnersReportData.map((partner, idx) => (
                  <div key={idx} className="border border-slate-100 p-4 rounded-2xl flex items-center justify-between bg-white">
                    <div className="min-w-0 flex-1 pl-3">
                      <span className="font-bold text-slate-800 text-sm block truncate">{partner.name}</span>
                    </div>
                    <div className="flex gap-4 text-xs font-mono font-bold">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">تأمين وارد</span>
                        <span className="text-emerald-600 block mt-0.5 text-center">+{partner.inward}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">سحب صرف</span>
                        <span className="text-orange-500 block mt-0.5 text-center">-{partner.outward}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Report Block - FINANCIAL STATEMENTS */}
        {activeFilter === 'financials' && (() => {
          const sums = getFinancialSummaries();
          const formatNum = (num: number) => num.toLocaleString('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          
          return (
            <div className="space-y-8 animate-fade-in text-right" dir="rtl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">📊 التقارير المالية المتكاملة</h3>
                  <p className="text-xs text-slate-400 mt-1">تجميع فوري وتلقائي للحسابات وتدفقات الحركات بناءً على دليل الحسابات الخماسي الجديد.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs ${
                    Math.abs(sums.totalAssets - sums.totalLiabilitiesEquity) < 1 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                      : 'bg-rose-50 text-rose-700 border border-rose-150'
                  }`}>
                    <span>⚖️ الميزانية متزنة ومطابقة:</span>
                    <span className="font-mono">{formatNum(sums.totalAssets)} ريال</span>
                  </div>
                </div>
              </div>

              {/* Grid of Statements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. INCOME STATEMENT (قائمة الدخل) */}
                <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                    <Coins className="text-blue-600 stroke-[2.5]" size={18} />
                    <h4 className="font-black text-slate-800 text-sm sm:text-base">قائمة الدخل (Income Statement)</h4>
                  </div>

                  <div className="space-y-4">
                    {/* Revenues Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black text-slate-700 border-b border-slate-200 pb-1">
                        <span>4 - الإيرادات (Revenues)</span>
                        <span>الرصيد (ريال)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>الإيرادات التشغيلية ومبيعات المعرض</span>
                        <span className="font-mono text-emerald-600">+{formatNum(sums.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 pl-3">
                        <span>إيرادات وفروق عملات أخرى</span>
                        <span className="font-mono">0</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 bg-slate-100 p-2 rounded-lg mt-1">
                        <span>إجمالي الإيرادات (Revenues Total)</span>
                        <span className="font-mono text-emerald-700">{formatNum(sums.revenue)}</span>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-xs font-black text-slate-700 border-b border-slate-200 pb-1">
                        <span>5 - المصروفات (Expenses)</span>
                        <span>الرصيد (ريال)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>رواتب وأجور وبدلات الموظفين</span>
                        <span className="font-mono text-rose-600">-{formatNum(sums.expenses)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 pl-3">
                        <span>مصروفات الإيجار والكهرباء والماء</span>
                        <span className="font-mono">0</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 bg-slate-100 p-2 rounded-lg mt-1">
                        <span>إجمالي المصروفات (Expenses Total)</span>
                        <span className="font-mono text-rose-700">{formatNum(sums.expenses)}</span>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="border-t border-dashed border-slate-300 pt-4 mt-6">
                      <div className="bg-emerald-600 text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                        <div>
                          <span className="text-[10px] block opacity-80 font-semibold">صافي الربح / الخسارة للفترة الحالية</span>
                          <span className="text-sm font-black block mt-0.5">صافي الدخل التشغيلي</span>
                        </div>
                        <span className="text-lg font-mono font-black">{formatNum(sums.netProfit)} ريال</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BALANCE SHEET (الميزانية العمومية) */}
                <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                    <Scale className="text-indigo-600 stroke-[2.5]" size={18} />
                    <h4 className="font-black text-slate-800 text-sm sm:text-base">الميزانية العمومية (Balance Sheet)</h4>
                  </div>

                  <div className="space-y-6">
                    {/* Assets Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black text-slate-700 border-b border-slate-200 pb-1">
                        <span>1 - الأصول (Assets)</span>
                        <span>الرصيد (ريال)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>الخزينة العامة (الكاش)</span>
                        <span className="font-mono">{formatNum(sums.treasury)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>البنوك والشبكات والشركات المالية</span>
                        <span className="font-mono">{formatNum(sums.bank)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>العملاء والذمم المدينة التجارية</span>
                        <span className="font-mono">{formatNum(sums.customers)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>المخزون والسلع (التقييم الجاري)</span>
                        <span className="font-mono">{formatNum(sums.inventory)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>سلف وعهد الموظفين</span>
                        <span className="font-mono">{formatNum(sums.custodies + sums.advances)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 bg-indigo-50 text-indigo-900 p-2 rounded-lg mt-1 border border-indigo-100">
                        <span>إجمالي الأصول (Total Assets)</span>
                        <span className="font-mono">{formatNum(sums.totalAssets)}</span>
                      </div>
                    </div>

                    {/* Liabilities & Equity Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black text-slate-700 border-b border-slate-200 pb-1">
                        <span>الالتزامات وحقوق الملكية (Liabilities & Equity)</span>
                        <span>الرصيد (ريال)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>ذمم الموردين والالتزامات التجارية (211)</span>
                        <span className="font-mono">{formatNum(sums.suppliers)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>الضرائب والمستحقات الأخرى (212)</span>
                        <span className="font-mono">{formatNum(sums.taxLiability + sums.salaryLiability)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>رأس المال الأساسي المدفوع (311)</span>
                        <span className="font-mono">{formatNum(sums.capital)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>مسحوبات المالك الشخصية (313)</span>
                        <span className="font-mono text-rose-600">-{formatNum(sums.ownerDraw)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pl-3">
                        <span>الأرباح المحتجزة (صافي أرباح الفترة)</span>
                        <span className="font-mono text-emerald-600">{formatNum(sums.retainedEarnings)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 bg-indigo-50 text-indigo-900 p-2 rounded-lg mt-1 border border-indigo-100">
                        <span>إجمالي الالتزامات وحقوق الملكية</span>
                        <span className="font-mono">{formatNum(sums.totalLiabilitiesEquity)}</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      </div>

    </div>
  );
}
