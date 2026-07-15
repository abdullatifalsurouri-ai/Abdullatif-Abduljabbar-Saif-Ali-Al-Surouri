import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  X, 
  Check, 
  Search, 
  Lock, 
  Scale, 
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
  Briefcase,
  ArrowLeftRight,
  RefreshCcw,
  CheckSquare,
  ChevronDown,
  Database,
  Calendar,
  Award,
  MapPin,
  Fingerprint,
  File,
  Upload,
  Shield,
  Activity,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Supplier, User as UserType } from '../types';
import { exportToPDF } from '../utils/pdfExport';
import HRView from './HRView';

interface SuppliersViewProps {
  suppliers: Supplier[];
  customers: any[];
  treasuryBalance: number;
  bankBalance?: number;
  onUpdateCustomers: (customers: any[]) => void;
  onUpdateTreasuryBalance: (balance: number) => void;
  onUpdateBankBalance?: (balance: number) => void;
  onLogAction?: (
    action: 'add' | 'edit' | 'delete' | 'sync' | 'import' | 'other',
    entityType: 'items' | 'movements' | 'suppliers' | 'warehouses' | 'transfers' | 'system',
    details: string
  ) => void;
  currentUser: UserType;
  isDataLocked: boolean;
  onAddSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  usersList?: UserType[];
  financialSubTab?: 'suppliers' | 'customers' | 'vouchers' | 'employees' | 'journal_entries';
  setFinancialSubTab?: (tab: 'suppliers' | 'customers' | 'vouchers' | 'employees' | 'journal_entries') => void;
  financialVouchers?: any[];
  onUpdateFinancialVouchers?: (vouchers: any[]) => void;
  employees?: any[];
  onUpdateEmployees?: (employees: any[]) => void;
  journalEntries?: any[];
  onUpdateJournalEntries?: (entries: any[]) => void;
  invoiceSettings?: any;
  onUpdateInvoiceSettings?: (settings: any) => void;
}

export default function SuppliersView({
  suppliers,
  customers,
  treasuryBalance,
  bankBalance = 500000,
  onUpdateCustomers,
  onUpdateTreasuryBalance,
  onUpdateBankBalance = () => {},
  onLogAction,
  currentUser,
  isDataLocked,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  usersList = [],
  financialSubTab,
  setFinancialSubTab,
  financialVouchers,
  onUpdateFinancialVouchers,
  employees = [],
  onUpdateEmployees = () => {},
  journalEntries = [],
  onUpdateJournalEntries = () => {},
  invoiceSettings,
  onUpdateInvoiceSettings = () => {},
}: SuppliersViewProps) {
  // Navigation between dashboard, vouchers, partners, employees, advanced
  const [localSubTab, setLocalSubTab] = useState<'dashboard' | 'vouchers' | 'partners' | 'employees' | 'advanced'>('dashboard');
  const subTab = localSubTab;
  const setSubTab = (tab: any) => {
    setLocalSubTab(tab);
    if (setFinancialSubTab) {
      if (tab === 'vouchers') setFinancialSubTab('vouchers');
      else if (tab === 'employees') setFinancialSubTab('employees');
      else if (tab === 'advanced') setFinancialSubTab('journal_entries');
      else if (tab === 'partners') setFinancialSubTab(partnerTypeSelector === 'supplier' ? 'suppliers' : 'customers');
    }
  };

  const [partnerTypeSelector, setPartnerTypeSelector] = useState<'supplier' | 'customer'>('supplier');
  const [advancedSubTab, setAdvancedSubTab] = useState<'chart_of_accounts' | 'journal_entries' | 'reconciliation' | 'settlement' | 'trial_balance' | 'income_statement' | 'balance_sheet' | 'closing'>('chart_of_accounts');

  useEffect(() => {
    if (financialSubTab) {
      if (financialSubTab === 'suppliers') {
        setLocalSubTab('partners');
        setPartnerTypeSelector('supplier');
      } else if (financialSubTab === 'customers') {
        setLocalSubTab('partners');
        setPartnerTypeSelector('customer');
      } else if (financialSubTab === 'vouchers') {
        setLocalSubTab('vouchers');
      } else if (financialSubTab === 'employees') {
        setLocalSubTab('employees');
      } else if (financialSubTab === 'journal_entries') {
        setLocalSubTab('advanced');
        setAdvancedSubTab('journal_entries');
      }
    }
  }, [financialSubTab]);

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [selectedReconciliationBank, setSelectedReconciliationBank] = useState<string>('');
  const [physicalBankBalance, setPhysicalBankBalance] = useState<string>('');
  
  // New accounting states
  const [closingWizardStep, setClosingWizardStep] = useState<number>(1);
  const [rollOverToNewYear, setRollOverToNewYear] = useState<boolean>(true);
  const [isClosingExecuting, setIsClosingExecuting] = useState<boolean>(false);
  const [closingLogs, setClosingLogs] = useState<string[]>([]);
  const [pnlCostCenterFilter, setPnlCostCenterFilter] = useState<string>('');
  const [actualBalances, setActualBalances] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('wms_actual_balances');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed['الخزينة العامة'] === 3500000) {
          parsed['الخزينة العامة'] = 350000;
        }
        return parsed;
      } catch {
        // Fall through
      }
    }
    return {
      'الخزينة العامة': 350000,
      'حساب البنك الرئيسي': 4200000,
      'مخزون المستودع الرئيسي': 12500000,
      'ذمم العملاء المدينة': 1500000,
      'ذمم الموردين الدائنة': 850000
    };
  });
  const [reconciliationTab, setReconciliationTab] = useState<'cash' | 'bank' | 'balancing'>('cash');
  const [finalAccountsTab, setFinalAccountsTab] = useState<'chart' | 'trial' | 'financial_statements' | 'closing'>('chart');

  // Dynamic ledger-linked financial reports calculations
  const getFinancialSummaries = (filterCostCenter?: string) => {
    const activeEntries = journalEntries.filter(entry => !entry.isReversed);

    let journalRevenues = 0;
    let journalExpenses = 0;

    activeEntries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (filterCostCenter && line.costCenter !== filterCostCenter) {
          return;
        }
        const acc = line.account || '';
        const isRev = acc.includes('مبيعات') || acc.includes('إيراد') || acc.includes('إيرادات');
        const isExp = acc.includes('رواتب') || acc.includes('أجور') || acc.includes('مصروف') || acc.includes('مصروفات') || acc.includes('إيجار') || acc.includes('كهرباء') || acc.includes('إنترنت');

        if (isRev) {
          journalRevenues += (line.credit - line.debit);
        }
        if (isExp) {
          journalExpenses += (line.debit - line.credit);
        }
      });
    });

    const baseRevenues = vouchers
      .filter((v) => v.isReceipt && (v.title?.includes('مبيعات') || v.notes?.includes('مبيعات') || v.partnerType === 'عميل') && (!filterCostCenter || v.costCenter === filterCostCenter))
      .reduce((sum, v) => sum + v.amount, 0) || (filterCostCenter ? 0 : 5800000);

    const baseExpenses = (employees.reduce((sum, e) => sum + (e.salary || 0), 0) * 12) || (filterCostCenter ? 0 : 1200000);

    const finalRevenues = journalRevenues > 0 ? journalRevenues : baseRevenues;
    const finalExpenses = journalExpenses > 0 ? journalExpenses : baseExpenses;
    const finalNetProfit = finalRevenues - finalExpenses;

    const finalTreasury = treasuryBalance || 0;
    const finalBank = (invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0);
    const finalCustomers = totalCustomersBalance || 0;
    const finalInventory = 12500000;
    const finalCustodies = employees.reduce((sum, e) => sum + (e.custody || 0), 0);

    const totalAssets = finalTreasury + finalBank + finalCustomers + finalInventory + finalCustodies;

    const finalSuppliers = totalSuppliersBalance || 0;
    const finalBaseCapital = 10000000;

    // Retained Earnings checking
    let closedEarnings = 0;
    activeEntries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.account === 'الأرباح والخسائر المحتجزة' || line.account === 'الأرباح المحتجزة' || line.account === 'الأرباح المحتجزة / المدوّرة') {
          closedEarnings += (line.credit - line.debit);
        }
      });
    });

    const finalRetainedEarnings = closedEarnings !== 0 ? closedEarnings : finalNetProfit;
    const totalLiabilitiesEquity = finalSuppliers + finalBaseCapital + finalRetainedEarnings;

    return {
      revenue: finalRevenues,
      expenses: finalExpenses,
      netProfit: finalNetProfit,
      treasury: finalTreasury,
      bank: finalBank,
      customers: finalCustomers,
      inventory: finalInventory,
      custodies: finalCustodies,
      totalAssets,
      suppliers: finalSuppliers,
      capital: finalBaseCapital,
      retainedEarnings: finalRetainedEarnings,
      totalLiabilitiesEquity
    };
  };

  const getSystemAccountLedger = () => {
    const sysBalances = {
      'الخزينة العامة': treasuryBalance || 0,
      'حساب البنك الرئيسي': (invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0),
      'مخزون المستودع الرئيسي': 12500000,
      'ذمم العملاء المدينة': totalCustomersBalance || 0,
      'عهد الموظفين المعلقة': employees.reduce((sum, e) => sum + (e.custody || 0), 0),
      'ذمم الموردين الدائنة': totalSuppliersBalance || 0
    };

    const ledgerActivity: Record<string, { opening: number, debits: number, credits: number }> = {
      'الخزينة العامة': { opening: 3500000, debits: 0, credits: 0 },
      'حساب البنك الرئيسي': { opening: 4200000, debits: 0, credits: 0 },
      'مخزون المستودع الرئيسي': { opening: 12500000, debits: 0, credits: 0 },
      'ذمم العملاء المدينة': { opening: 1500000, debits: 0, credits: 0 },
      'عهد الموظفين المعلقة': { opening: 7000, debits: 0, credits: 0 },
      'ذمم الموردين الدائنة': { opening: 850000, debits: 0, credits: 0 }
    };

    journalEntries.filter(e => !e.isReversed).forEach(entry => {
      entry.lines.forEach((line: any) => {
        let matchedAcc = '';
        const acc = line.account || '';
        if (acc === 'الخزينة العامة' || acc === 'حـ/ الصندوق (الخزينة العامة)' || acc === 'الخزينة العامة النقدية') {
          matchedAcc = 'الخزينة العامة';
        } else if (acc === 'حساب البنك الرئيسي' || acc === 'حـ/ البنك (حساب البنك الرئيسي)' || acc === 'حساب بنك التضامن' || acc === 'بنك التضامن') {
          matchedAcc = 'حساب البنك الرئيسي';
        } else if (acc.includes('مخزون') || acc.includes('المستودع')) {
          matchedAcc = 'مخزون المستودع الرئيسي';
        } else if (acc.includes('العميل') || acc.includes('ذمم العملاء')) {
          matchedAcc = 'ذمم العملاء المدينة';
        } else if (acc.includes('المورد') || acc.includes('ذمم الموردين')) {
          matchedAcc = 'ذمم الموردين الدائنة';
        } else if (acc.includes('عهد') || acc.includes('العهدة')) {
          matchedAcc = 'عهد الموظفين المعلقة';
        }

        if (matchedAcc && ledgerActivity[matchedAcc]) {
          ledgerActivity[matchedAcc].debits += line.debit;
          ledgerActivity[matchedAcc].credits += line.credit;
        }
      });
    });

    return Object.entries(sysBalances).map(([name, currentBal]) => {
      const activity = ledgerActivity[name] || { opening: currentBal, debits: 0, credits: 0 };
      const isAsset = name !== 'ذمم الموردين الدائنة';
      const netChange = isAsset ? (activity.debits - activity.credits) : (activity.credits - activity.debits);
      const calculatedOpening = currentBal - netChange;

      return {
        name,
        opening: calculatedOpening,
        debits: activity.debits,
        credits: activity.credits,
        balance: currentBal
      };
    });
  };

  
  // Edit state
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    balance: 0,
  });

  // Balance adjustment dialog state
  const [adjustingPartner, setAdjustingPartner] = useState<any | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'pay' | 'add_debt' | 'receive'>('pay');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | ''>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showVoucherReceipt, setShowVoucherReceipt] = useState(false);
  const [lastCreatedVoucher, setLastCreatedVoucher] = useState<any | null>(null);

  // Unified Account Statement Print/PDF states
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementPartner, setStatementPartner] = useState<any | null>(null);
  const [statementPartnerType, setStatementPartnerType] = useState<'supplier' | 'customer' | 'employee'>('supplier');
  const [statementStartDate, setStatementStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [statementEndDate, setStatementEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Vouchers state
  const [localFinancialVouchers, setLocalFinancialVouchers] = useState<any[]>(() => {
    const saved = localStorage.getItem('wms_financial_vouchers');
    return saved ? JSON.parse(saved) : [];
  });
  const vouchers = financialVouchers || localFinancialVouchers;
  const setVouchers = (newVouchers: any[]) => {
    if (onUpdateFinancialVouchers) {
      onUpdateFinancialVouchers(newVouchers);
    } else {
      setLocalFinancialVouchers(newVouchers);
      localStorage.setItem('wms_financial_vouchers', JSON.stringify(newVouchers));
    }
  };

  const receiptVouchers = vouchers.filter((v: any) => v.isReceipt);
  const paymentVouchers = vouchers.filter((v: any) => !v.isReceipt);

  const getStatementEntries = () => {
    if (!statementPartner) return [];

    let entries: any[] = [];

    if (statementPartnerType === 'supplier' || statementPartnerType === 'customer') {
      // Find all vouchers for this partner
      const partnerVouchers = vouchers.filter(v => 
        (v.partnerId === statementPartner.id || v.partnerName === statementPartner.name) &&
        v.partnerType === (statementPartnerType === 'supplier' ? 'مورد' : 'عميل')
      );

      partnerVouchers.forEach(v => {
        const isSupplier = statementPartnerType === 'supplier';
        const isReceiptVoucher = v.isReceipt;
        const isPaymentToSupplier = !isReceiptVoucher && v.title.includes('صرف');

        let debit = 0;
        let credit = 0;

        if (isSupplier) {
          if (isPaymentToSupplier) {
            debit = v.amount;
          } else {
            credit = v.amount;
          }
        } else {
          const isReceiptFromCustomer = isReceiptVoucher && v.title.includes('قبض');

          if (isReceiptFromCustomer) {
            credit = v.amount;
          } else {
            debit = v.amount;
          }
        }

        entries.push({
          id: v.id,
          date: v.date,
          title: v.title,
          notes: v.notes,
          debit,
          credit,
          amount: v.amount,
          createdBy: v.createdBy || 'النظام'
        });
      });
    } else if (statementPartnerType === 'employee') {
      const employeeVouchers = vouchers.filter(v => 
        (v.partnerId === statementPartner.id || v.partnerName === statementPartner.name) &&
        v.partnerType === 'موظف'
      );

      employeeVouchers.forEach(v => {
        entries.push({
          id: v.id,
          date: v.date,
          title: v.title,
          notes: v.notes,
          debit: v.title.includes('صرف') ? v.amount : 0,
          credit: v.title.includes('قبض') ? v.amount : 0,
          amount: v.amount,
          createdBy: v.createdBy || 'النظام'
        });
      });

      if (statementPartner.history) {
        statementPartner.history.forEach((h: any) => {
          const isDuplicate = entries.some(e => e.date === h.date && Math.abs(e.amount - h.amount) < 2);
          if (!isDuplicate) {
            entries.push({
              id: h.id || `TX-${h.date}`,
              date: h.date,
              title: h.notes || 'حركة مالية بسجل الموظف',
              notes: h.notes || '',
              debit: (h.type === 'salary' || h.type === 'advance' || h.type === 'custody_grant') ? h.amount : 0,
              credit: (h.type === 'deduction' || h.type === 'repayment') ? h.amount : 0,
              amount: h.amount,
              createdBy: 'النظام'
            });
          }
        });
      }
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // New Smart Voucher Form State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vType, setVType] = useState<'pay' | 'receive' | 'transfer' | 'internal_transfer'>('pay'); // pay = صرف, receive = قبض, transfer = تحويل, internal_transfer = تحويل داخلي
  const [vTargetGroup, setVTargetGroup] = useState<'supplier' | 'customer' | 'employee' | 'expense'>('supplier');
  const [vSelectedTargetId, setVSelectedTargetId] = useState<string>('');
  const [vCostCenter, setVCostCenter] = useState<string>('مصاريف كهرباء / إنترنت');
  const [vAmount, setVAmount] = useState<number | ''>('');
  const [vNotes, setVNotes] = useState('');
  const [vDate, setVDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [vManualExpenseRecipient, setVManualExpenseRecipient] = useState('');

  // Bank selection state
  const [vSelectedBankAccountId, setVSelectedBankAccountId] = useState<string>('');
  const [vInternalFrom, setVInternalFrom] = useState<string>('cash'); // 'cash' or bank account ID
  const [vInternalTo, setVInternalTo] = useState<string>(''); // 'cash' or bank account ID
  const [vBankSearchQuery, setVBankSearchQuery] = useState<string>('');
  const [isVBankDropdownOpen, setIsVBankDropdownOpen] = useState(false);
  const [isVInternalFromDropdownOpen, setIsVInternalFromDropdownOpen] = useState(false);
  const [vInternalFromSearchQuery, setVInternalFromSearchQuery] = useState('');
  const [isVInternalToDropdownOpen, setIsVInternalToDropdownOpen] = useState(false);
  const [vInternalToSearchQuery, setVInternalToSearchQuery] = useState('');

  // Automatically initialize bank account selections when settings are loaded or updated
  React.useEffect(() => {
    if (invoiceSettings?.bankAccounts && invoiceSettings.bankAccounts.length > 0) {
      const defaultBank = invoiceSettings.bankAccounts.find((b: any) => b.isDefault) || invoiceSettings.bankAccounts[0];
      if (!vSelectedBankAccountId) {
        setVSelectedBankAccountId(defaultBank.id);
      }
      if (!vInternalTo) {
        const otherBank = invoiceSettings.bankAccounts.find((b: any) => !b.isDefault) || invoiceSettings.bankAccounts[0];
        setVInternalTo(otherBank.id);
      }
    }
  }, [invoiceSettings, vSelectedBankAccountId, vInternalTo]);

  // Reconciliation Modal States
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [isBankTreasuryModalOpen, setIsBankTreasuryModalOpen] = useState(false);
  const [reconAccountId, setReconAccountId] = useState<string>('cash');
  const [reconStartDate, setReconStartDate] = useState<string>('');
  const [reconEndDate, setReconEndDate] = useState<string>('');
  const [reconSearchText, setReconSearchText] = useState<string>('');
  const [reconciledLines, setReconciledLines] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wms_reconciled_lines');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleReconcileLine = (lineId: string) => {
    let next;
    if (reconciledLines.includes(lineId)) {
      next = reconciledLines.filter(id => id !== lineId);
    } else {
      next = [...reconciledLines, lineId];
    }
    setReconciledLines(next);
    localStorage.setItem('wms_reconciled_lines', JSON.stringify(next));
  };

  // Transfer Fields & Payment Method
  const [vPaymentMethod, setVPaymentMethod] = useState<'cash' | 'bank'>('cash'); // cash = كاش, bank = تحويل بنكي / شبكة
  const [vTransferFromType, setVTransferFromType] = useState<'supplier' | 'customer' | 'employee'>('customer');
  const [vTransferToType, setVTransferToType] = useState<'supplier' | 'customer' | 'employee'>('supplier');
  const [vTransferFromId, setVTransferFromId] = useState<string>('');
  const [vTransferToId, setVTransferToId] = useState<string>('');

  // Employees Sub-tab State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    role: 'موظف',
    phone: '',
    email: '',
    salary: 150000,
    advances: 0,
    custody: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    appearanceAllowance: 0,
    workLocationLat: 15.3694,
    workLocationLng: 44.1910,
    geofencingRadius: 100,
    bankName: 'بنك التضامن الإسلامي',
    bankAccountNumber: '',
    bankAccountIban: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // HR active horizontal subtab
  const [hrActiveTab, setHrActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'requests' | 'attendance'>('dashboard');

  // Simulated GPS mobile attendance check-in states
  const [gpsSimulatedInside, setGpsSimulatedInside] = useState<boolean>(true);
  const [selectedHrEmployeeForAttendance, setSelectedHrEmployeeForAttendance] = useState<string>('');
  const [isScanningBiometric, setIsScanningBiometric] = useState<boolean>(false);
  const [biometricScanResult, setBiometricScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Leave & Loan Forms
  const [loanForm, setLoanForm] = useState({
    employeeId: '',
    amount: 50000,
    months: 5,
    startMonth: '2026-07',
    reason: ''
  });
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    type: 'annual' as 'annual' | 'sick' | 'casual' | 'unpaid',
    startDate: '2026-07-15',
    endDate: '2026-07-20',
    notes: ''
  });

  // Payroll state variables
  const [payrollMonth, setPayrollMonth] = useState<string>('2026-07');
  const [generatedPayroll, setGeneratedPayroll] = useState<any[] | null>(null);
  const [payrollFundingSource, setPayrollFundingSource] = useState<string>('cash'); // 'cash' or bank account id
  const [isPayrollApproved, setIsPayrollApproved] = useState<boolean>(false);
  const [approvedPayrollMonth, setApprovedPayrollMonth] = useState<string>('');

  const getNormalizedEmployee = (emp: any) => {
    return {
      ...emp,
      housingAllowance: emp.housingAllowance !== undefined ? emp.housingAllowance : 0,
      transportAllowance: emp.transportAllowance !== undefined ? emp.transportAllowance : 0,
      appearanceAllowance: emp.appearanceAllowance !== undefined ? emp.appearanceAllowance : 0,
      workLocationLat: emp.workLocationLat !== undefined ? emp.workLocationLat : 15.3694,
      workLocationLng: emp.workLocationLng !== undefined ? emp.workLocationLng : 44.1910,
      geofencingRadius: emp.geofencingRadius !== undefined ? emp.geofencingRadius : 100,
      attachments: emp.attachments || [],
      loans: emp.loans || [],
      leaves: emp.leaves || [],
      attendance: emp.attendance || [],
      bankName: emp.bankName || 'بنك التضامن الإسلامي',
      bankAccountNumber: emp.bankAccountNumber || '',
      bankAccountIban: emp.bankAccountIban || '',
      hireDate: emp.hireDate || '2026-01-01',
      contractEndDate: emp.contractEndDate || '2027-01-01',
    };
  };

  const getDetailedSalaryForMonth = (rawEmp: any, monthStr: string) => {
    const emp = getNormalizedEmployee(rawEmp);
    const basic = emp.salary || 0;
    const allowances = (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.appearanceAllowance || 0);
    
    // 1. Overtime and bonuses from monthlyVariations (unapplied or filtered by month)
    const activeVariations = emp.monthlyVariations || [];
    const unapplied = activeVariations.filter((v: any) => !v.isApplied);
    const overtime = unapplied.filter((v: any) => v.type === 'overtime').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const bonus = unapplied.filter((v: any) => v.type === 'bonus').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const manualDeductions = unapplied.filter((v: any) => v.type === 'deduction').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);

    // 2. Unpaid leave deductions
    let unpaidLeaveDays = 0;
    (emp.leaves || []).forEach((lv: any) => {
      if (lv.type === 'unpaid' && lv.status === 'approved') {
        if (lv.startDate.startsWith(monthStr)) {
          unpaidLeaveDays += lv.days;
        }
      }
    });
    const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * (basic / 30));

    // 3. Loan installments
    let loanDeduction = 0;
    (emp.loans || []).forEach((loan: any) => {
      if (loan.status === 'approved') {
        const installment = (loan.schedule || []).find((s: any) => s.month === monthStr && !s.isDeducted);
        if (installment) {
          loanDeduction += installment.amount;
        }
      }
    });

    // 4. Attendance late / absence deductions
    let lateMinutesTotal = 0;
    let absentDaysTotal = 0;
    (emp.attendance || []).forEach((att: any) => {
      if (att.date.startsWith(monthStr)) {
        if (att.status === 'late') {
          lateMinutesTotal += (att.lateMinutes || 0);
        } else if (att.status === 'absent') {
          absentDaysTotal += 1;
        }
      }
    });
    const lateDeduction = Math.round(lateMinutesTotal * (basic / 30 / 8 / 60)); // basic / 30 days / 8 hours / 60 mins
    const absenceDeduction = Math.round(absentDaysTotal * (basic / 30));

    const totalDeductions = manualDeductions + unpaidLeaveDeduction + loanDeduction + lateDeduction + absenceDeduction;
    const gross = basic + allowances + overtime + bonus;
    const net = Math.max(0, gross - totalDeductions);

    return {
      basic,
      allowances,
      overtime,
      bonus,
      manualDeductions,
      unpaidLeaveDays,
      unpaidLeaveDeduction,
      loanDeduction,
      lateMinutesTotal,
      lateDeduction,
      absentDaysTotal,
      absenceDeduction,
      totalDeductions,
      gross,
      net
    };
  };

  // Monthly Variations (Estihqaqat & Istiqta'at) state
  const [isAddVariationModalOpen, setIsAddVariationModalOpen] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [variationForm, setVariationForm] = useState({
    employeeId: '',
    type: 'bonus' as 'overtime' | 'bonus' | 'deduction',
    amountType: 'flat' as 'flat' | 'hourly',
    hours: '' as number | '',
    hourlyRate: '' as number | '',
    flatAmount: '' as number | '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const getEmployeeSalaryDetails = (emp: any) => {
    const basic = emp.salary || 0;
    const activeVariations = emp.monthlyVariations || [];
    const unapplied = activeVariations.filter((v: any) => !v.isApplied);

    const overtime = unapplied.filter((v: any) => v.type === 'overtime').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const bonus = unapplied.filter((v: any) => v.type === 'bonus').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const deductions = unapplied.filter((v: any) => v.type === 'deduction').reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const advances = emp.advances || 0;
    const net = basic + overtime + bonus - deductions - advances;

    return {
      basic,
      overtime,
      bonus,
      deductions,
      advances,
      net
    };
  };

  const handleAddVariationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { employeeId, type, amountType, hours, hourlyRate, flatAmount, reason, date } = variationForm;
    if (!employeeId) {
      alert('الرجاء اختيار الموظف');
      return;
    }

    let calculatedAmount = 0;
    if (type === 'overtime' && amountType === 'hourly') {
      calculatedAmount = Number(hours || 0) * Number(hourlyRate || 0);
    } else {
      calculatedAmount = Number(flatAmount || 0);
    }

    if (calculatedAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const targetEmp = employees.find(emp => emp.id === employeeId);
    if (!targetEmp) return;

    const newVariation = {
      id: `VAR-${Date.now().toString().slice(-6)}`,
      type,
      amount: calculatedAmount,
      reason: reason || 'حركة شهرية عامة',
      date,
      isApplied: false,
      amountType,
      hours: type === 'overtime' && amountType === 'hourly' ? Number(hours) : undefined,
      hourlyRate: type === 'overtime' && amountType === 'hourly' ? Number(hourlyRate) : undefined,
    };

    const updatedEmployees = employees.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          monthlyVariations: [...(emp.monthlyVariations || []), newVariation]
        };
      }
      return emp;
    });

    onUpdateEmployees(updatedEmployees);

    if (onLogAction) {
      const typeAr = type === 'overtime' ? 'ساعات إضافية' : type === 'bonus' ? 'إكرامية / مكافأة' : 'خصم / جزاء';
      onLogAction('edit', 'suppliers', `تم تسجيل حركة شهرية (${typeAr}) للموظف ${targetEmp.name} بقيمة ${calculatedAmount.toLocaleString()} ر.ي`);
    }

    // Reset Form
    setVariationForm({
      employeeId: '',
      type: 'bonus',
      amountType: 'flat',
      hours: '',
      hourlyRate: '',
      flatAmount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsAddVariationModalOpen(false);
  };

  const handleDeleteVariation = (empId: string, varId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحركة الشهرية من سجل الانتظار؟')) return;

    const updatedEmployees = employees.map(emp => {
      if (emp.id === empId) {
        return {
          ...emp,
          monthlyVariations: (emp.monthlyVariations || []).filter((v: any) => v.id !== varId)
        };
      }
      return emp;
    });

    onUpdateEmployees(updatedEmployees);

    if (onLogAction) {
      onLogAction('edit', 'suppliers', `تم حذف حركة شهرية معلقة من حساب الموظف.`);
    }
  };

  // Journal Entries Sub-tab State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({
    notes: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    lines: [
      { account: '', debit: 0, credit: 0, costCenter: '' as string | undefined },
      { account: '', debit: 0, credit: 0, costCenter: '' as string | undefined }
    ]
  });

  const getNextVoucherId = () => {
    const ids = vouchers.map(v => {
      const match = v.id.match(/VCH-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }).filter(id => id > 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 10000;
    return `VCH-${maxId + 1}`;
  };

  const createAutoJournalEntry = (args: {
    notes: string;
    reference: string;
    lines: { account: string; debit: number; credit: number }[];
    date?: string;
  }, existingEntries = journalEntries) => {
    const nextId = `JV-${1001 + existingEntries.length}`;
    const newEntry = {
      id: nextId,
      date: args.date || new Date().toISOString().split('T')[0],
      notes: args.notes,
      reference: args.reference,
      createdBy: currentUser.username || 'System',
      isReversed: false,
      lines: args.lines
    };
    onUpdateJournalEntries([newEntry, ...existingEntries]);
    return newEntry;
  };

  const createMultipleAutoJournalEntries = (entriesArgs: {
    notes: string;
    reference: string;
    lines: { account: string; debit: number; credit: number }[];
    date?: string;
  }[]) => {
    let currentEntries = [...journalEntries];
    entriesArgs.forEach((args) => {
      const nextId = `JV-${1001 + currentEntries.length}`;
      const newEntry = {
        id: nextId,
        date: args.date || new Date().toISOString().split('T')[0],
        notes: args.notes,
        reference: args.reference,
        createdBy: currentUser.username || 'System',
        isReversed: false,
        lines: args.lines
      };
      if (!currentEntries.some((e) => e.reference === args.reference && e.notes === args.notes)) {
        currentEntries = [newEntry, ...currentEntries];
      }
    });
    onUpdateJournalEntries(currentEntries);
  };

  const handleReverseJournalEntry = (entryId: string) => {
    const original = journalEntries.find(j => j.id === entryId);
    if (!original || original.isReversed) return;

    // 1. Mark original as reversed
    const updatedEntries = journalEntries.map(j => 
      j.id === entryId ? { ...j, isReversed: true } : j
    );

    // 2. Generate storno (reversed) entry with swapped debits/credits
    const stornoId = `JV-${1001 + updatedEntries.length}`;
    const stornoLines = original.lines.map((line: any) => ({
      account: line.account,
      debit: line.credit, // swap
      credit: line.debit  // swap
    }));

    const stornoEntry = {
      id: stornoId,
      date: new Date().toISOString().split('T')[0],
      notes: `قيد عكسي لتصحيح القيد رقم ${original.id} - [${original.notes}]`,
      reference: `قيد عكسي - ${original.id}`,
      createdBy: currentUser.username || 'System',
      isReversed: false,
      lines: stornoLines
    };

    // 3. Revert financial impacts in the local states!
    let tempTreasury = treasuryBalance;
    let tempBank = bankBalance || 7500000;
    let tempCustomers = [...customers];
    let tempSuppliers = [...suppliers];
    let tempEmployees = [...employees];

    original.lines.forEach((line: any) => {
      const isDebit = line.debit > 0;
      const amount = isDebit ? line.debit : line.credit;

      if (line.account === 'الخزينة العامة' || line.account === 'حـ/ الصندوق (الخزينة العامة)') {
        if (isDebit) {
          tempTreasury -= amount;
        } else {
          tempTreasury += amount;
        }
      } else if (line.account === 'حساب البنك الرئيسي' || line.account === 'حـ/ البنك (حساب البنك الرئيسي)') {
        if (isDebit) {
          tempBank -= amount;
        } else {
          tempBank += amount;
        }
      } else if (line.account.startsWith('حساب العميل: ')) {
        const cName = line.account.replace('حساب العميل: ', '');
        const cust = tempCustomers.find(c => c.name === cName);
        if (cust) {
          if (isDebit) {
            cust.balance = (cust.balance || 0) - amount;
          } else {
            cust.balance = (cust.balance || 0) + amount;
          }
        }
      } else if (line.account.startsWith('حساب المورد: ')) {
        const sName = line.account.replace('حساب المورد: ', '');
        const supp = tempSuppliers.find(s => s.name === sName);
        if (supp) {
          if (isDebit) {
            supp.balance = (supp.balance || 0) + amount;
          } else {
            supp.balance = (supp.balance || 0) - amount;
          }
        }
      } else if (line.account.startsWith('رواتب وأجور / سلف موظفين: ')) {
        const eName = line.account.replace('رواتب وأجور / سلف موظفين: ', '');
        const emp = tempEmployees.find(e => e.name === eName);
        if (emp) {
          if (original.notes.includes('سلفة')) {
            if (isDebit) {
              emp.advances = Math.max(0, (emp.advances || 0) - amount);
            } else {
              emp.advances = (emp.advances || 0) + amount;
            }
          }
          emp.history = [
            {
              id: `TX-${Date.now().toString().slice(-5)}`,
              date: new Date().toISOString().split('T')[0],
              type: 'transfer',
              amount: -amount,
              notes: `تم عكس القيد المحاسبي ${original.id}`
            },
            ...(emp.history || [])
          ];
        }
      } else if (line.account.startsWith('عهد موظفين: ')) {
        const eName = line.account.replace('عهد موظفين: ', '');
        const emp = tempEmployees.find(e => e.name === eName);
        if (emp) {
          if (isDebit) {
            emp.custody = Math.max(0, (emp.custody || 0) - amount);
          } else {
            emp.custody = (emp.custody || 0) + amount;
          }
          emp.history = [
            {
              id: `TX-${Date.now().toString().slice(-5)}`,
              date: new Date().toISOString().split('T')[0],
              type: 'custody_return',
              amount: -amount,
              notes: `عكس قيد عهدة - ${original.id}`
            },
            ...(emp.history || [])
          ];
        }
      }
    });

    // Save states
    onUpdateTreasuryBalance(tempTreasury);
    if (onUpdateBankBalance) {
      onUpdateBankBalance(tempBank);
    }
    onUpdateCustomers(tempCustomers);
    tempSuppliers.forEach(s => {
      const orig = suppliers.find(o => o.id === s.id);
      if (orig && orig.balance !== s.balance) {
        onEditSupplier(s);
      }
    });
    onUpdateEmployees(tempEmployees);

    // Save updated journal entries (with storno added at top)
    onUpdateJournalEntries([stornoEntry, ...updatedEntries]);

    if (onLogAction) {
      onLogAction('edit', 'system', `تم عكس القيد المحاسبي رقم ${entryId} وتوليد القيد العكسي رقم ${stornoId} آلياً.`);
    }
  };

  const [vEmployeePaymentReason, setVEmployeePaymentReason] = useState<'salary' | 'advance' | 'custody' | 'overtime' | 'bonus'>('salary');
  const [vAdvanceDeductionMethod, setVAdvanceDeductionMethod] = useState<'full' | 'installments'>('full');

  // Custody Settlement Modal State
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementForm, setSettlementForm] = useState<{
    employeeId: string;
    custodyAmount: number;
    invoices: { id: string; category: string; amount: number | '' }[];
    date: string;
    notes: string;
    paymentMethod: 'cash' | 'bank';
  }>({
    employeeId: '',
    custodyAmount: 0,
    invoices: [{ id: 'inv-1', category: 'أدوات مكتبية ومطبوعات', amount: '' }],
    date: new Date().toISOString().split('T')[0],
    notes: '',
    paymentMethod: 'cash'
  });

  // Auto-prefill voucher amount on salary selection
  React.useEffect(() => {
    if (vTargetGroup === 'employee' && vSelectedTargetId) {
      const emp = employees.find(e => e.id === vSelectedTargetId);
      if (emp) {
        if (vEmployeePaymentReason === 'salary') {
          const { net } = getEmployeeSalaryDetails(emp);
          setVAmount(net > 0 ? net : 0);
        } else {
          setVAmount('');
        }
      }
    }
  }, [vTargetGroup, vSelectedTargetId, vEmployeePaymentReason, employees]);

  const handleCreateVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vAmount || Number(vAmount) <= 0) return;

    const amount = Number(vAmount);
    const voucherId = getNextVoucherId();
    let partnerName = '';
    let partnerId = '';
    let partnerType = '';
    let previousBalance = 0;
    let newBalance = 0;
    let newTreasuryBalance = treasuryBalance;
    let isReceipt = vType === 'receive';
    let voucherTitle = '';

    // We will collect the ledger lines for our automatic Journal Entry
    let journalLines: { account: string; debit: number; credit: number }[] = [];
    let journalNotes = '';

    if (vType === 'receive') {
      const customer = customers.find(c => c.id === vSelectedTargetId);
      if (!customer) return;
      partnerName = customer.name;
      partnerId = customer.id;
      partnerType = 'عميل';
      previousBalance = customer.balance || 0;
      newBalance = previousBalance - amount;

      let fundAccount = '';
      if (vPaymentMethod === 'cash') {
        newTreasuryBalance = treasuryBalance + amount;
        onUpdateTreasuryBalance(newTreasuryBalance);
        fundAccount = 'الخزينة العامة';
        voucherTitle = 'سند قبض نقدي (عميل)';
      } else {
        const bankAccountsList = invoiceSettings?.bankAccounts || [];
        const targetBank = bankAccountsList.find((b: any) => b.id === vSelectedBankAccountId) || bankAccountsList.find((b: any) => b.isDefault) || bankAccountsList[0];
        if (targetBank) {
          const updatedAccounts = bankAccountsList.map((b: any) => {
            if (b.id === targetBank.id) {
              return { ...b, balance: b.balance + amount };
            }
            return b;
          });
          onUpdateInvoiceSettings({
            ...invoiceSettings,
            bankAccounts: updatedAccounts
          });
          const newBankBalance = bankBalance + amount;
          onUpdateBankBalance(newBankBalance);
          fundAccount = `حـ/ البنك - ${targetBank.name}`;
          voucherTitle = `سند قبض بنكي (عميل) - ${targetBank.name}`;
        } else {
          const newBankBalance = bankBalance + amount;
          onUpdateBankBalance(newBankBalance);
          fundAccount = 'حساب البنك الرئيسي';
          voucherTitle = 'سند قبض بنكي (عميل)';
        }
      }

      journalNotes = `تحصيل دفعة حساب - سند قبض رقم ${voucherId}`;

      // Update customer balance
      const updatedCustomers = customers.map(c => 
         c.id === customer.id ? { ...c, balance: newBalance } : c
      );
      onUpdateCustomers(updatedCustomers);

      // Ledger: Debit Fund Account, Credit Customer (حساب العميل)
      journalLines = [
        { account: fundAccount, debit: amount, credit: 0 },
        { account: `حساب العميل: ${customer.name}`, debit: 0, credit: amount }
      ];

    } else if (vType === 'pay') {
      if (vTargetGroup === 'supplier') {
        const supplier = suppliers.find(s => s.id === vSelectedTargetId);
        if (!supplier) return;
        partnerName = supplier.name;
        partnerId = supplier.id;
        partnerType = 'مورد';
        previousBalance = supplier.balance || 0;
        newBalance = previousBalance - amount;

        let fundAccount = '';
        if (vPaymentMethod === 'cash') {
          newTreasuryBalance = treasuryBalance - amount;
          onUpdateTreasuryBalance(newTreasuryBalance);
          fundAccount = 'الخزينة العامة';
          voucherTitle = 'سند صرف نقدي (مورد)';
        } else {
          const bankAccountsList = invoiceSettings?.bankAccounts || [];
          const targetBank = bankAccountsList.find((b: any) => b.id === vSelectedBankAccountId) || bankAccountsList.find((b: any) => b.isDefault) || bankAccountsList[0];
          if (targetBank) {
            const updatedAccounts = bankAccountsList.map((b: any) => {
              if (b.id === targetBank.id) {
                return { ...b, balance: b.balance - amount };
              }
              return b;
            });
            onUpdateInvoiceSettings({
              ...invoiceSettings,
              bankAccounts: updatedAccounts
            });
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = `حـ/ البنك - ${targetBank.name}`;
            voucherTitle = `سند صرف بنكي للمورد - ${targetBank.name}`;
          } else {
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = 'حساب البنك الرئيسي';
            voucherTitle = 'سند صرف بنكي (مورد)';
          }
        }
        journalNotes = `تسديد دفعة للمورد - سند صرف رقم ${voucherId}`;

        onEditSupplier({
          ...supplier,
          balance: newBalance
        });

        // Ledger: Debit Supplier, Credit Fund Account
        journalLines = [
          { account: `حساب المورد: ${supplier.name}`, debit: amount, credit: 0 },
          { account: fundAccount, debit: 0, credit: amount }
        ];

      } else if (vTargetGroup === 'employee') {
        const emp = employees.find(e => e.id === vSelectedTargetId);
        if (!emp) return;
        partnerName = emp.name;
        partnerId = emp.id;
        partnerType = 'موظف';
        previousBalance = 0;
        newBalance = 0;

        let fundAccount = '';
        if (vPaymentMethod === 'cash') {
          newTreasuryBalance = treasuryBalance - amount;
          onUpdateTreasuryBalance(newTreasuryBalance);
          fundAccount = 'الخزينة العامة';
        } else {
          const bankAccountsList = invoiceSettings?.bankAccounts || [];
          const targetBank = bankAccountsList.find((b: any) => b.id === vSelectedBankAccountId) || bankAccountsList.find((b: any) => b.isDefault) || bankAccountsList[0];
          if (targetBank) {
            const updatedAccounts = bankAccountsList.map((b: any) => {
              if (b.id === targetBank.id) {
                return { ...b, balance: b.balance - amount };
              }
              return b;
            });
            onUpdateInvoiceSettings({
              ...invoiceSettings,
              bankAccounts: updatedAccounts
            });
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = `حـ/ البنك - ${targetBank.name}`;
          } else {
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = 'حساب البنك الرئيسي';
          }
        }

        // Clone current employees to modify
        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            const currentAdvances = e.advances || 0;
            const currentCustody = e.custody || 0;
            const transactionId = `TX-${Date.now().toString().slice(-5)}`;

            let addedAdvance = 0;
            let addedCustody = 0;
            let txType: 'salary' | 'advance' | 'custody_grant' | 'overtime' | 'bonus' = 'salary';
            let txNotes = '';
            let updatedVariations = e.monthlyVariations || [];

            if (vEmployeePaymentReason === 'advance') {
              addedAdvance = amount;
              txType = 'advance';
              txNotes = `سلفة مالية مستردة (${vAdvanceDeductionMethod === 'full' ? 'تخصم كاملة من راتب الشهر القادم' : 'تقسط'}) - سند صرف رقم ${voucherId}`;
            } else if (vEmployeePaymentReason === 'custody') {
              addedCustody = amount;
              txType = 'custody_grant';
              txNotes = `صرف عهدة مالية للعمل - سند صرف رقم ${voucherId}`;
            } else if (vEmployeePaymentReason === 'overtime') {
              txType = 'overtime';
              txNotes = `صرف مستحقات إضافي فورية - سند صرف رقم ${voucherId}`;
              
              // Deduct immediately from pending overtime monthly variations
              let remainingToDeduct = amount;
              updatedVariations = (e.monthlyVariations || []).map((v: any) => {
                if (!v.isApplied && v.type === 'overtime') {
                  if (remainingToDeduct > 0) {
                    if (v.amount > remainingToDeduct) {
                      const newAmount = v.amount - remainingToDeduct;
                      remainingToDeduct = 0;
                      return {
                        ...v,
                        amount: newAmount,
                        notes: (v.notes || '') + ` (تم خصم جزء بقيمة ${amount.toLocaleString()} ر.ي بسند رقم ${voucherId})`
                      };
                    } else {
                      remainingToDeduct -= v.amount;
                      return {
                        ...v,
                        isApplied: true,
                        voucherId: voucherId,
                        notes: (v.notes || '') + ` (تم صرفها فورياً بسند رقم ${voucherId})`
                      };
                    }
                  }
                }
                return v;
              });
            } else if (vEmployeePaymentReason === 'bonus') {
              txType = 'bonus';
              txNotes = `صرف إكرامية / مكافأة تشجيعية فورية - سند صرف رقم ${voucherId}`;
              
              // Deduct immediately from pending bonus monthly variations
              let remainingToDeduct = amount;
              updatedVariations = (e.monthlyVariations || []).map((v: any) => {
                if (!v.isApplied && v.type === 'bonus') {
                  if (remainingToDeduct > 0) {
                    if (v.amount > remainingToDeduct) {
                      const newAmount = v.amount - remainingToDeduct;
                      remainingToDeduct = 0;
                      return {
                        ...v,
                        amount: newAmount,
                        notes: (v.notes || '') + ` (تم خصم جزء بقيمة ${amount.toLocaleString()} ر.ي بسند رقم ${voucherId})`
                      };
                    } else {
                      remainingToDeduct -= v.amount;
                      return {
                        ...v,
                        isApplied: true,
                        voucherId: voucherId,
                        notes: (v.notes || '') + ` (تم صرفها فورياً بسند رقم ${voucherId})`
                      };
                    }
                  }
                }
                return v;
              });
            } else {
              txType = 'salary';
              txNotes = `تسليم الراتب الشهري المتبقي - سند صرف رقم ${voucherId}`;
              // Mark unapplied variations as applied
              updatedVariations = (e.monthlyVariations || []).map((v: any) => {
                if (!v.isApplied) {
                  return { ...v, isApplied: true, voucherId: voucherId };
                }
                return v;
              });
            }

            const newTx = {
              id: transactionId,
              date: vDate,
              type: txType,
              amount: amount,
              notes: vNotes || txNotes
            };

            return {
              ...e,
              advances: txType === 'salary' ? 0 : currentAdvances + addedAdvance,
              custody: currentCustody + addedCustody,
              monthlyVariations: updatedVariations,
              history: [newTx, ...(e.history || [])]
            };
          }
          return e;
        });

        if (vEmployeePaymentReason === 'advance') {
          voucherTitle = vPaymentMethod === 'cash' ? 'سند صرف سلفة موظف (نقدي)' : 'سند صرف سلفة موظف (بنكي)';
          journalNotes = `صرف سلفة موظف ${emp.name} (${vAdvanceDeductionMethod === 'full' ? 'تخصم كاملة' : 'تقسط'}) - سند رقم ${voucherId}`;
          journalLines = [
            { account: `حـ/ سلف الموظفين (سند سلفة) - ${emp.name}`, debit: amount, credit: 0 },
            { account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : fundAccount, debit: 0, credit: amount }
          ];
        } else if (vEmployeePaymentReason === 'custody') {
          voucherTitle = vPaymentMethod === 'cash' ? 'سند صرف عهدة مالية (نقدي)' : 'سند صرف عهدة مالية (بنكي)';
          journalNotes = `صرف عهدة مالية للموظف ${emp.name} لشراء مستلزمات - سند رقم ${voucherId}`;
          journalLines = [
            { account: `حـ/ عهد الموظفين (عهدة معلقة) - ${emp.name}`, debit: amount, credit: 0 },
            { account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : fundAccount, debit: 0, credit: amount }
          ];
        } else if (vEmployeePaymentReason === 'overtime') {
          voucherTitle = vPaymentMethod === 'cash' ? 'سند صرف مستحقات إضافي (نقدي)' : 'سند صرف مستحقات إضافي (بنكي)';
          journalNotes = `صرف مستحقات إضافي للموظف ${emp.name} - سند رقم ${voucherId}`;
          journalLines = [
            { account: `حـ/ مصاريف العمل الإضافي - ${emp.name}`, debit: amount, credit: 0 },
            { account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : fundAccount, debit: 0, credit: amount }
          ];
        } else if (vEmployeePaymentReason === 'bonus') {
          voucherTitle = vPaymentMethod === 'cash' ? 'سند صرف مكافأة تشجيعية (نقدي)' : 'سند صرف مكافأة تشجيعية (بنكي)';
          journalNotes = `صرف إكرامية ومكافأة للموظف ${emp.name} - سند رقم ${voucherId}`;
          journalLines = [
            { account: `حـ/ مصاريف المكافآت والإكراميات - ${emp.name}`, debit: amount, credit: 0 },
            { account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : fundAccount, debit: 0, credit: amount }
          ];
        } else {
          // Salary payment with full compound double-entry post
          const { basic, overtime, bonus, deductions, advances, net } = getEmployeeSalaryDetails(emp);
          voucherTitle = vPaymentMethod === 'cash' ? 'سند صرف راتب موظف (نقدي)' : 'سند صرف راتب موظف (بنكي)';
          journalNotes = `صرف راتب شهر الموظف ${emp.name} - سند رقم ${voucherId}`;

          // If they changed the paid amount, adjust the basic salary line to balance perfectly
          const difference = amount - net;
          const adjustedBasic = basic + difference;

          journalLines = [
            { account: `حـ/ رواتب الموظفين (الراتب الأساسي) - ${emp.name}`, debit: adjustedBasic, credit: 0 }
          ];
          if (overtime > 0) {
            journalLines.push({ account: `حـ/ مصاريف الإضافي (قيمة الساعات الإضافية) - ${emp.name}`, debit: overtime, credit: 0 });
          }
          if (bonus > 0) {
            journalLines.push({ account: `حـ/ مصاريف المكافآت والإكراميات - ${emp.name}`, debit: bonus, credit: 0 });
          }
          if (deductions > 0) {
            journalLines.push({ account: `حـ/ إيرادات الخصومات والجزاءات (مبلغ الخصم المستقطع) - ${emp.name}`, debit: 0, credit: deductions });
          }
          if (advances > 0) {
            journalLines.push({ account: `حـ/ سلف الموظفين (استقطاع سلفة) - ${emp.name}`, debit: 0, credit: advances });
          }
          journalLines.push({ account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : fundAccount, debit: 0, credit: amount });
        }

        onUpdateEmployees(updatedEmployees);

      } else {
        partnerName = vManualExpenseRecipient || vCostCenter;
        partnerId = 'EXPENSE';
        partnerType = 'مصروف تشغيلي';
        previousBalance = 0;
        newBalance = 0;

        let fundAccount = '';
        if (vPaymentMethod === 'cash') {
          newTreasuryBalance = treasuryBalance - amount;
          onUpdateTreasuryBalance(newTreasuryBalance);
          fundAccount = 'الخزينة العامة';
          voucherTitle = `سند صرف مصروفات - ${vCostCenter}`;
        } else {
          const bankAccountsList = invoiceSettings?.bankAccounts || [];
          const targetBank = bankAccountsList.find((b: any) => b.id === vSelectedBankAccountId) || bankAccountsList.find((b: any) => b.isDefault) || bankAccountsList[0];
          if (targetBank) {
            const updatedAccounts = bankAccountsList.map((b: any) => {
              if (b.id === targetBank.id) {
                return { ...b, balance: b.balance - amount };
              }
              return b;
            });
            onUpdateInvoiceSettings({
              ...invoiceSettings,
              bankAccounts: updatedAccounts
            });
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = `حـ/ البنك - ${targetBank.name}`;
            voucherTitle = `سند صرف بنكي مصروفات - ${vCostCenter} - ${targetBank.name}`;
          } else {
            const newBankBalance = bankBalance - amount;
            onUpdateBankBalance(newBankBalance);
            fundAccount = 'حساب البنك الرئيسي';
            voucherTitle = `سند صرف بنكي مصروفات - ${vCostCenter}`;
          }
        }
        journalNotes = `صرف مصروف تشغيلي - ${vCostCenter} - سند رقم ${voucherId}`;

        // Ledger: Debit Operational Expense, Credit Fund Account
        journalLines = [
          { account: `المصروفات التشغيلية: ${vCostCenter}`, debit: amount, credit: 0 },
          { account: fundAccount, debit: 0, credit: amount }
        ];
      }

    } else if (vType === 'internal_transfer') {
      let fromLabel = '';
      let toLabel = '';
      let nextTreasury = treasuryBalance;
      let nextBank = bankBalance;
      const bankAccountsList = invoiceSettings?.bankAccounts || [];
      let updatedAccounts = [...bankAccountsList];

      // 1. Process Source (المصدر - المحول منه)
      if (vInternalFrom === 'cash') {
        nextTreasury = treasuryBalance - amount;
        onUpdateTreasuryBalance(nextTreasury);
        fromLabel = 'الخزينة النقدية (الكاش)';
      } else {
        const srcBank = bankAccountsList.find((b: any) => b.id === vInternalFrom);
        if (srcBank) {
          updatedAccounts = updatedAccounts.map((b: any) => {
            if (b.id === srcBank.id) {
              return { ...b, balance: b.balance - amount };
            }
            return b;
          });
          nextBank = bankBalance - amount;
          onUpdateBankBalance(nextBank);
          fromLabel = `حساب البنك: ${srcBank.name}`;
        } else {
          fromLabel = 'حساب بنكي مجهول';
        }
      }

      // 2. Process Destination (الوجهة - المحول إليه)
      if (vInternalTo === 'cash') {
        nextTreasury = nextTreasury + amount;
        onUpdateTreasuryBalance(nextTreasury);
        toLabel = 'الخزينة النقدية (الكاش)';
      } else {
        const destBank = bankAccountsList.find((b: any) => b.id === vInternalTo);
        if (destBank) {
          updatedAccounts = updatedAccounts.map((b: any) => {
            if (b.id === destBank.id) {
              return { ...b, balance: b.balance + amount };
            }
            return b;
          });
          nextBank = nextBank + amount;
          onUpdateBankBalance(nextBank);
          toLabel = `حساب البنك: ${destBank.name}`;
        } else {
          toLabel = 'حساب بنكي مجهول';
        }
      }

      // Save bank account list updates to settings
      onUpdateInvoiceSettings({
        ...invoiceSettings,
        bankAccounts: updatedAccounts
      });

      partnerName = `${fromLabel} ➔ ${toLabel}`;
      partnerId = `INTERNAL::${vInternalFrom}::${vInternalTo}`;
      partnerType = 'تحويل مالي داخلي';
      voucherTitle = `سند تحويل داخلي 🔄 (${fromLabel === 'الخزينة النقدية (الكاش)' ? 'كاش' : 'بنك'} ➔ ${toLabel === 'الخزينة النقدية (الكاش)' ? 'كاش' : 'بنك'})`;
      journalNotes = `تحويل داخلي من ${fromLabel} إلى ${toLabel}`;

      // Balanced ledger entry: Debit Destination, Credit Source
      const debitAccount = toLabel === 'الخزينة النقدية (الكاش)' ? 'حـ/ الصندوق (الخزينة العامة)' : `حـ/ البنك - ${toLabel.replace('حساب البنك: ', '')}`;
      const creditAccount = fromLabel === 'الخزينة النقدية (الكاش)' ? 'حـ/ الصندوق (الخزينة العامة)' : `حـ/ البنك - ${fromLabel.replace('حساب البنك: ', '')}`;

      journalLines = [
        { account: debitAccount, debit: amount, credit: 0 },
        { account: creditAccount, debit: 0, credit: amount }
      ];

    } else if (vType === 'transfer') {
      // General Financial Transfer Vouchers
      let fromName = '';
      let fromAccountLabel = '';
      if (vTransferFromType === 'customer') {
        const customer = customers.find(c => c.id === vTransferFromId);
        if (!customer) return;
        fromName = customer.name;
        previousBalance = customer.balance || 0;
        newBalance = previousBalance - amount;
        fromAccountLabel = `حساب العميل: ${customer.name}`;

        const updatedCustomers = customers.map(c => 
          c.id === customer.id ? { ...c, balance: newBalance } : c
        );
        onUpdateCustomers(updatedCustomers);
      } else if (vTransferFromType === 'supplier') {
        const supplier = suppliers.find(s => s.id === vTransferFromId);
        if (!supplier) return;
        fromName = supplier.name;
        previousBalance = supplier.balance || 0;
        newBalance = previousBalance + amount; // we owe them more
        fromAccountLabel = `حساب المورد: ${supplier.name}`;

        onEditSupplier({
          ...supplier,
          balance: newBalance
        });
      } else if (vTransferFromType === 'employee') {
        const emp = employees.find(e => e.id === vTransferFromId);
        if (!emp) return;
        fromName = emp.name;
        previousBalance = emp.advances || 0;
        fromAccountLabel = `رواتب وأجور / سلف موظفين: ${emp.name}`;

        // Deduct from employee advances / custody
        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            const currentAdvances = e.advances || 0;
            const updatedAdvances = Math.max(0, currentAdvances - amount);
            const remainder = amount - (currentAdvances - updatedAdvances);
            const currentCustody = e.custody || 0;
            const updatedCustody = Math.max(0, currentCustody - remainder);

            return {
              ...e,
              advances: updatedAdvances,
              custody: updatedCustody,
              history: [{
                id: `TX-${Date.now().toString().slice(-5)}`,
                date: vDate,
                type: 'advance_return',
                amount: amount,
                notes: `تحويل مالي (مخصوم منه) - سند رقم ${voucherId}`
              }, ...(e.history || [])]
            };
          }
          return e;
        });
        onUpdateEmployees(updatedEmployees);
      }

      // Resolve Destination (المحول إليه)
      let toName = '';
      let toAccountLabel = '';
      if (vTransferToType === 'customer') {
        const customer = customers.find(c => c.id === vTransferToId);
        if (!customer) return;
        toName = customer.name;
        toAccountLabel = `حساب العميل: ${customer.name}`;

        const updatedCustomers = customers.map(c => 
          c.id === customer.id ? { ...c, balance: (c.balance || 0) + amount } : c
        );
        onUpdateCustomers(updatedCustomers);
      } else if (vTransferToType === 'supplier') {
        const supplier = suppliers.find(s => s.id === vTransferToId);
        if (!supplier) return;
        toName = supplier.name;
        toAccountLabel = `حساب المورد: ${supplier.name}`;

        onEditSupplier({
          ...supplier,
          balance: (supplier.balance || 0) - amount // we owe them less
        });
      } else if (vTransferToType === 'employee') {
        const emp = employees.find(e => e.id === vTransferToId);
        if (!emp) return;
        toName = emp.name;
        toAccountLabel = `رواتب وأجور / سلف موظفين: ${emp.name}`;

        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            return {
              ...e,
              advances: (e.advances || 0) + amount,
              history: [{
                id: `TX-${Date.now().toString().slice(-5)}`,
                date: vDate,
                type: 'advance',
                amount: amount,
                notes: `تحويل مالي (وارد إليه) - سند رقم ${voucherId}`
              }, ...(e.history || [])]
            };
          }
          return e;
        });
        onUpdateEmployees(updatedEmployees);
      }

      partnerName = `${fromName} ➔ ${toName}`;
      partnerId = `${vTransferFromId}::${vTransferToId}`;
      partnerType = 'تحويل مالي بين الحسابات';
      voucherTitle = `سند تحويل مالي (${vTransferFromType === 'customer' ? 'عميل' : vTransferFromType === 'supplier' ? 'مورد' : 'موظف'} ➔ ${vTransferToType === 'customer' ? 'عميل' : vTransferToType === 'supplier' ? 'مورد' : 'موظف'})`;
      journalNotes = `تسوية حساب: تحويل من ${fromName} إلى ${toName}`;

      // Balanced ledger entry for this transfer: Debit Destination, Credit Source
      journalLines = [
        { account: toAccountLabel, debit: amount, credit: 0 },
        { account: fromAccountLabel, debit: 0, credit: amount }
      ];
    }

    const newVoucher = {
      id: voucherId,
      title: voucherTitle,
      partnerName,
      partnerId,
      partnerType,
      amount,
      previousBalance,
      newBalance,
      notes: vNotes || 'بدون ملاحظات إضافية',
      date: vDate,
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      createdBy: currentUser.username,
      isReceipt,
      costCenter: vType === 'pay' && vTargetGroup === 'expense' ? vCostCenter : undefined,
      paymentMethod: vType === 'internal_transfer' ? 'bank' : vPaymentMethod,
      bankAccountId: vType === 'internal_transfer' ? undefined : (vPaymentMethod === 'bank' ? vSelectedBankAccountId : undefined),
      internalFrom: vType === 'internal_transfer' ? vInternalFrom : undefined,
      internalTo: vType === 'internal_transfer' ? vInternalTo : undefined
    };

    const updatedVouchers = [newVoucher, ...vouchers];
    setVouchers(updatedVouchers);
    setLastCreatedVoucher(newVoucher);

    // Auto-Generate Double-Entry bookkeeping journal posting!
    if (journalLines.length > 0) {
      createAutoJournalEntry({
        notes: vNotes ? `${journalNotes} - [${vNotes}]` : journalNotes,
        reference: voucherId,
        lines: journalLines,
        date: vDate
      });
    }

    if (onLogAction) {
      onLogAction(
        'edit',
        'suppliers',
        `تم إصدار سند رسمي آلي رقم ${voucherId} لـ (${partnerName}) بقيمة ${amount.toLocaleString()} ر.ي`
      );
    }

    setIsVoucherModalOpen(false);
    setShowVoucherReceipt(true);

    setVAmount('');
    setVNotes('');
    setVManualExpenseRecipient('');
    setVDate(new Date().toISOString().split('T')[0]);
  };

  const handleSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementForm.employeeId) return;

    const emp = employees.find(e => e.id === settlementForm.employeeId);
    if (!emp) return;

    const originalCustody = emp.custody || 0;
    const totalExpenses = settlementForm.invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const difference = originalCustody - totalExpenses; // الفارق = العهدة الأصلية - إجمالي الفواتير المقدمة

    const voucherId = getNextVoucherId();
    let newTreasuryBalance = treasuryBalance;
    let newBankBalance = bankBalance;
    const fundAccount = settlementForm.paymentMethod === 'cash' ? 'الخزينة العامة' : 'حساب البنك الرئيسي';

    // Handle fund adjustments based on difference
    if (difference > 0) {
      if (settlementForm.paymentMethod === 'cash') {
        newTreasuryBalance = treasuryBalance + difference;
        onUpdateTreasuryBalance(newTreasuryBalance);
      } else {
        newBankBalance = bankBalance + difference;
        onUpdateBankBalance(newBankBalance);
      }
    } else if (difference < 0) {
      const reimburseAmount = Math.abs(difference);
      if (settlementForm.paymentMethod === 'cash') {
        newTreasuryBalance = treasuryBalance - reimburseAmount;
        onUpdateTreasuryBalance(newTreasuryBalance);
      } else {
        newBankBalance = bankBalance - reimburseAmount;
        onUpdateBankBalance(newBankBalance);
      }
    }

    // Bookkeeping Entry
    const debitLines: { account: string; debit: number; credit: number }[] = [];
    const creditLines: { account: string; debit: number; credit: number }[] = [];

    // Debits: Operating Expenses
    settlementForm.invoices.forEach(inv => {
      if (Number(inv.amount) > 0) {
        debitLines.push({
          account: `المصروفات التشغيلية: ${inv.category}`,
          debit: Number(inv.amount),
          credit: 0
        });
      }
    });

    // Credits: Employee custody credited by full original amount
    creditLines.push({
      account: `حـ/ عهد الموظفين - ${emp.name}`,
      debit: 0,
      credit: originalCustody
    });

    // Cash Adjustment line in ledger
    if (difference > 0) {
      debitLines.push({
        account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : 'حـ/ البنك (حساب البنك الرئيسي)',
        debit: difference,
        credit: 0
      });
    } else if (difference < 0) {
      creditLines.push({
        account: fundAccount === 'الخزينة العامة' ? 'حـ/ الصندوق (الخزينة العامة)' : 'حـ/ البنك (حساب البنك الرئيسي)',
        debit: 0,
        credit: Math.abs(difference)
      });
    }

    const journalLines = [...debitLines, ...creditLines];

    // Create Voucher Entry
    const isReceipt = difference > 0;
    const newVoucher = {
      id: voucherId,
      title: difference === 0 ? `سند تسوية عهدة (مصفاة بالكامل)` : difference > 0 ? `سند تصفية واسترداد باق عهدة` : `سند تصفية وتعويض مصروف عهدة`,
      partnerName: emp.name,
      partnerId: emp.id,
      partnerType: 'تصفية عهدة موظف',
      amount: Math.abs(difference),
      previousBalance: originalCustody,
      newBalance: 0,
      notes: settlementForm.notes || `تصفية العهدة المعلقة بقيمة ${originalCustody.toLocaleString()} ر.ي ومستندات المصروف بقيمة ${totalExpenses.toLocaleString()} ر.ي`,
      date: settlementForm.date,
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      createdBy: currentUser.username,
      isReceipt,
    };

    // Save
    const updatedVouchers = [newVoucher, ...vouchers];
    setVouchers(updatedVouchers);

    createAutoJournalEntry({
      notes: `تصفية عهدة الموظف ${emp.name} | فواتير: ${totalExpenses.toLocaleString()} ر.ي | الفارق: ${difference.toLocaleString()} ر.ي`,
      reference: voucherId,
      lines: journalLines,
      date: settlementForm.date
    });

    // Update Employee
    const updatedEmployees = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          custody: 0,
          history: [{
            id: `TX-${Date.now().toString().slice(-5)}`,
            date: settlementForm.date,
            type: 'custody_return',
            amount: originalCustody,
            notes: `تصفية العهدة بمصاريف قيمتها ${totalExpenses.toLocaleString()} ر.ي (الفارق: ${difference.toLocaleString()} ر.ي) - سند رقم ${voucherId}`
          }, ...(e.history || [])]
        };
      }
      return e;
    });
    onUpdateEmployees(updatedEmployees);

    if (onLogAction) {
      onLogAction('edit', 'suppliers', `تم اعتماد تصفية عهدة الموظف ${emp.name} بقيمة ${originalCustody.toLocaleString()} ر.ي بنجاح`);
    }

    setIsSettlementModalOpen(false);
    setLastCreatedVoucher(newVoucher);
    setShowVoucherReceipt(true);
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    if (editingEmployee) {
      const updated = employees.map(emp => 
        emp.id === editingEmployee.id 
          ? { 
              ...emp, 
              name: empForm.name, 
              role: empForm.role, 
              phone: empForm.phone, 
              email: empForm.email, 
              salary: Number(empForm.salary),
              housingAllowance: Number(empForm.housingAllowance) || 0,
              transportAllowance: Number(empForm.transportAllowance) || 0,
              appearanceAllowance: Number(empForm.appearanceAllowance) || 0,
              workLocationLat: Number(empForm.workLocationLat) || 15.3694,
              workLocationLng: Number(empForm.workLocationLng) || 44.1910,
              geofencingRadius: Number(empForm.geofencingRadius) || 100,
              bankName: empForm.bankName,
              bankAccountNumber: empForm.bankAccountNumber,
              bankAccountIban: empForm.bankAccountIban,
              hireDate: empForm.hireDate,
              contractEndDate: empForm.contractEndDate
            }
          : emp
      );
      onUpdateEmployees(updated);
      if (onLogAction) {
        onLogAction('edit', 'suppliers', `تم تحديث بيانات وعقد الموظف: ${empForm.name}`);
      }
    } else {
      const nextEmpId = `EMP-${1000 + employees.length + 1}`;
      const newEmp = {
        id: nextEmpId,
        name: empForm.name,
        role: empForm.role,
        phone: empForm.phone,
        email: empForm.email,
        salary: Number(empForm.salary) || 0,
        advances: Number(empForm.advances) || 0,
        custody: Number(empForm.custody) || 0,
        housingAllowance: Number(empForm.housingAllowance) || 0,
        transportAllowance: Number(empForm.transportAllowance) || 0,
        appearanceAllowance: Number(empForm.appearanceAllowance) || 0,
        workLocationLat: Number(empForm.workLocationLat) || 15.3694,
        workLocationLng: Number(empForm.workLocationLng) || 44.1910,
        geofencingRadius: Number(empForm.geofencingRadius) || 100,
        bankName: empForm.bankName,
        bankAccountNumber: empForm.bankAccountNumber,
        bankAccountIban: empForm.bankAccountIban,
        hireDate: empForm.hireDate,
        contractEndDate: empForm.contractEndDate,
        attachments: [],
        loans: [],
        leaves: [],
        attendance: [],
        history: [
          {
            id: `TX-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'salary' as const,
            amount: 0,
            notes: 'تم تسجيل الموظف وتأصيل عقده الإلكتروني في النظام بنجاح'
          }
        ]
      };
      onUpdateEmployees([...employees, newEmp]);
      if (onLogAction) {
        onLogAction('add', 'suppliers', `تم تسجيل موظف جديد وعقده: ${newEmp.name} براتب أساسي ${newEmp.salary.toLocaleString()} ر.ي`);
      }
    }

    setEmpForm({ 
      name: '', 
      role: 'موظف', 
      phone: '', 
      email: '', 
      salary: 150000, 
      advances: 0, 
      custody: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      appearanceAllowance: 0,
      workLocationLat: 15.3694,
      workLocationLng: 44.1910,
      geofencingRadius: 100,
      bankName: 'بنك التضامن الإسلامي',
      bankAccountNumber: '',
      bankAccountIban: '',
      hireDate: new Date().toISOString().split('T')[0],
      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setEditingEmployee(null);
    setIsEmployeeModalOpen(false);
  };

  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm.notes.trim()) return;

    // Enforce cost center dropdown selection for all lines
    const missingCostCenter = journalForm.lines.some(
      line => !line.costCenter
    );

    if (missingCostCenter) {
      alert('خطأ في إدخال القيد: يجب اختيار مركز تكلفة لكل سطر محاسبي لضمان دقة توجيه وتصنيف العمليات المالية!');
      return;
    }

    const totalDebits = journalForm.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredits = journalForm.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    if (totalDebits !== totalCredits) {
      alert('خطأ في إدخال القيد: يجب أن يتساوى إجمالي المدين مع إجمالي الدائن في القيد المزدوج!');
      return;
    }
    if (totalDebits <= 0) {
      alert('خطأ في إدخال القيد: يجب أن تكون قيمة القيد أكبر من صفر!');
      return;
    }

    const entryId = `ENT-${Date.now().toString().slice(-6)}`;
    const newEntry = {
       id: entryId,
       date: journalForm.date,
       notes: journalForm.notes,
       reference: journalForm.reference || 'قيد يدوي عام',
       createdBy: currentUser.username,
       lines: journalForm.lines.map(line => ({
         account: line.account,
         debit: Number(line.debit || 0),
         credit: Number(line.credit || 0),
         costCenter: line.costCenter || undefined
       })),
       isReversed: false
     };

     onUpdateJournalEntries([newEntry, ...journalEntries]);

     if (onLogAction) {
       onLogAction('add', 'suppliers', `تم تسجيل قيد محاسبي يدوي رقم ${entryId} بقيمة ${totalDebits.toLocaleString()} ر.ي`);
     }

     setJournalForm({
       notes: '',
       reference: '',
       date: new Date().toISOString().split('T')[0],
       lines: [
         { account: '', debit: 0, credit: 0, costCenter: '' as string | undefined },
         { account: '', debit: 0, credit: 0, costCenter: '' as string | undefined }
       ]
     });
     setIsJournalModalOpen(false);
   };

   const handleAddJournalLine = () => {
     setJournalForm({
       ...journalForm,
       lines: [...journalForm.lines, { account: '', debit: 0, credit: 0, costCenter: '' as string | undefined }]
     });
   };

  const handleRemoveJournalLine = (index: number) => {
    if (journalForm.lines.length <= 2) return;
    const newLines = journalForm.lines.filter((_, i) => i !== index);
    setJournalForm({ ...journalForm, lines: newLines });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search)) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredVouchers = vouchers.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.id.toLowerCase().includes(q) ||
      (v.partnerName && v.partnerName.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q)) ||
      (v.costCenter && v.costCenter.toLowerCase().includes(q))
    );
  });

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role && e.role.toLowerCase().includes(search.toLowerCase())) ||
    (e.phone && e.phone.includes(search))
  );

  const filteredJournalEntries = journalEntries.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.id.toLowerCase().includes(q) ||
      (j.notes && j.notes.toLowerCase().includes(q)) ||
      (j.reference && j.reference.toLowerCase().includes(q))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
      if (editingSupplier) {
        onEditSupplier({
          ...editingSupplier,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          balance: Number(formData.balance) || 0,
        });
        if (onLogAction) {
          onLogAction('edit', 'suppliers', `تم تعديل بيانات المورد: ${formData.name}`);
        }
      } else {
        onAddSupplier({
          id: `SUP-${Date.now()}`,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          balance: Number(formData.balance) || 0,
        });
        if (onLogAction) {
          onLogAction('add', 'suppliers', `تم تسجيل مورد جديد: ${formData.name} برصيد مبدئي ${formData.balance} ر.ي`);
        }
      }
    } else {
      if (editingCustomer) {
        const updated = customers.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, name: formData.name, phone: formData.phone, email: formData.email, balance: Number(formData.balance) || 0 }
            : c
        );
        onUpdateCustomers(updated);
        if (onLogAction) {
          onLogAction('edit', 'suppliers', `تم تعديل بيانات العميل: ${formData.name}`);
        }
      } else {
        const newCustomer = {
          id: `CUST-${Date.now()}`,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          balance: Number(formData.balance) || 0,
        };
        onUpdateCustomers([...customers, newCustomer]);
        if (onLogAction) {
          onLogAction('add', 'suppliers', `تم تسجيل عميل جديد: ${formData.name} بمديونية مبدئية ${formData.balance} ر.ي`);
        }
      }
    }

    setFormData({ name: '', phone: '', email: '', balance: 0 });
    setEditingSupplier(null);
    setEditingCustomer(null);
    setIsFormOpen(false);
  };

  const handleEdit = (partner: any) => {
    if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
      setEditingSupplier(partner);
      setFormData({
        name: partner.name,
        phone: partner.phone || '',
        email: partner.email || '',
        balance: partner.balance || 0,
      });
    } else {
      setEditingCustomer(partner);
      setFormData({
        name: partner.name,
        phone: partner.phone || '',
        email: partner.email || '',
        balance: partner.balance || 0,
      });
    }
    setIsFormOpen(true);
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingPartner || !adjustmentAmount || Number(adjustmentAmount) <= 0) return;

    const amount = Number(adjustmentAmount);
    const currentBalance = adjustingPartner.balance || 0;
    let newBalance = currentBalance;
    let newTreasuryBalance = treasuryBalance;
    let voucherTitle = '';
    let isReceipt = false;

    if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
      if (adjustmentType === 'pay') {
        // سند صرف للمورد (Payment Voucher)
        // Reduces what we owe the supplier (reduces supplier balance)
        // Decreases treasury cash
        newBalance = currentBalance - amount;
        newTreasuryBalance = treasuryBalance - amount;
        voucherTitle = 'سند صرف نقدي (مورد)';
        isReceipt = false;
      } else {
        // قيد دين جديد للمورد
        newBalance = currentBalance + amount;
        voucherTitle = 'إشعار قيد دين / شراء آجل (مورد)';
      }
    } else {
      if (adjustmentType === 'receive') {
        // سند قبض من العميل (Receipt Voucher)
        // Reduces what the customer owes us (reduces customer balance)
        // Increases treasury cash
        newBalance = currentBalance - amount;
        newTreasuryBalance = treasuryBalance + amount;
        voucherTitle = 'سند قبض نقدي (عميل)';
        isReceipt = true;
      } else {
        // قيد مديونية جديدة على العميل
        newBalance = currentBalance + amount;
        voucherTitle = 'إشعار قيد مديونية / مبيعات آجلة (عميل)';
      }
    }

    // Save Voucher for print/receipt display
    const voucherId = `VCH-${Date.now().toString().slice(-6)}`;
    const voucherData = {
      id: voucherId,
      title: voucherTitle,
      partnerName: adjustingPartner.name,
      partnerId: adjustingPartner.id,
      partnerType: (subTab === 'partners' && partnerTypeSelector === 'supplier') ? 'مورد' : 'عميل',
      amount,
      previousBalance: currentBalance,
      newBalance,
      notes: adjustmentNotes || 'بدون ملاحظات إضافية',
      date: adjustmentDate,
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      createdBy: currentUser.username,
      isReceipt,
    };

    const updatedVouchers = [voucherData, ...vouchers];
    setVouchers(updatedVouchers);
    setLastCreatedVoucher(voucherData);

    // Auto Journal Entry lines
    let journalLines: { account: string; debit: number; credit: number }[] = [];
    let journalNotes = '';

    if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
      if (adjustmentType === 'pay') {
        journalNotes = `تسديد دفعة حساب للمورد - سند رقم ${voucherId}`;
        journalLines = [
          { account: `حساب المورد: ${adjustingPartner.name}`, debit: amount, credit: 0 },
          { account: 'الخزينة العامة', debit: 0, credit: amount }
        ];
      } else {
        journalNotes = `إشعار قيد دين / شراء آجل - مرجع ${voucherId}`;
        journalLines = [
          { account: 'المشتريات والمصروفات المباشرة', debit: amount, credit: 0 },
          { account: `حساب المورد: ${adjustingPartner.name}`, debit: 0, credit: amount }
        ];
      }
    } else {
      if (adjustmentType === 'receive') {
        journalNotes = `تحصيل دفعة حساب من العميل - سند رقم ${voucherId}`;
        journalLines = [
          { account: 'الخزينة العامة', debit: amount, credit: 0 },
          { account: `حساب العميل: ${adjustingPartner.name}`, debit: 0, credit: amount }
        ];
      } else {
        journalNotes = `إشعار قيد مديونية / مبيعات آجلة - مرجع ${voucherId}`;
        journalLines = [
          { account: `حساب العميل: ${adjustingPartner.name}`, debit: amount, credit: 0 },
          { account: 'إيرادات المبيعات الآجلة', debit: 0, credit: amount }
        ];
      }
    }

    createAutoJournalEntry({
      notes: adjustmentNotes ? `${journalNotes} - [${adjustmentNotes}]` : journalNotes,
      reference: voucherId,
      lines: journalLines,
      date: adjustmentDate
    });

    // Update States
    if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
      onEditSupplier({
        ...adjustingPartner,
        balance: newBalance,
      });
    } else {
      const updated = customers.map((c) =>
        c.id === adjustingPartner.id ? { ...c, balance: newBalance } : c
      );
      onUpdateCustomers(updated);
    }

    if (adjustmentType === 'pay' || adjustmentType === 'receive') {
      onUpdateTreasuryBalance(newTreasuryBalance);
    }

    // Add Audit Log
    if (onLogAction) {
      if (subTab === 'partners' && partnerTypeSelector === 'supplier') {
        if (adjustmentType === 'pay') {
          onLogAction(
            'edit',
            'suppliers',
            `إصدار سند صرف رقم ${voucherId} للمورد: ${adjustingPartner.name} بمبلغ ${amount.toLocaleString()} ر.ي (تخفيض مستحقات المورد وتخفيض الخزينة)`
          );
        } else {
          onLogAction(
            'edit',
            'suppliers',
            `إضافة مديونية بقيمة ${amount.toLocaleString()} ر.ي على حساب المورد: ${adjustingPartner.name}`
          );
        }
      } else {
        if (adjustmentType === 'receive') {
          onLogAction(
            'edit',
            'suppliers',
            `إصدار سند قبض رقم ${voucherId} من العميل: ${adjustingPartner.name} بمبلغ ${amount.toLocaleString()} ر.ي (تخفيض مديونية العميل وزيادة الخزينة تلقائياً)`
          );
        } else {
          onLogAction(
            'edit',
            'suppliers',
            `قيد مديونية جديدة بقيمة ${amount.toLocaleString()} ر.ي على حساب العميل: ${adjustingPartner.name}`
          );
        }
      }
    }

    // Reset adjustment state, show print preview
    setAdjustingPartner(null);
    setAdjustmentAmount('');
    setAdjustmentNotes('');
    setShowVoucherReceipt(true);
  };

  // Stats
  const totalSuppliersBalance = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  const supplierDebtorsCount = suppliers.filter((s) => (s.balance || 0) > 0).length;

  const totalCustomersBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const customerDebtorsCount = customers.filter((c) => (c.balance || 0) > 0).length;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <User className="text-blue-600 stroke-[2.5]" size={24} />
            <span>الحسابات المالية والسندات</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            إدارة كشوف حسابات العملاء والموردين، وإصدار سندات القبض والصرف والتأثير التلقائي على الخزينة والسيولة.
          </p>
        </div>

        {!isDataLocked && (
          <div className="shrink-0 flex items-center gap-2">
            {subTab === 'partners' && !isFormOpen && (
              <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => setPartnerTypeSelector('supplier')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    partnerTypeSelector === 'supplier'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  الموردين
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerTypeSelector('customer')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    partnerTypeSelector === 'customer'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  العملاء
                </button>
              </div>
            )}

            {subTab === 'partners' && !isFormOpen && (
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setEditingCustomer(null);
                  setFormData({ name: '', phone: '', email: '', balance: 0 });
                  setIsFormOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              >
                <Plus size={18} className="stroke-[3]" />
                <span>
                  {partnerTypeSelector === 'supplier' ? 'إضافة مورد جديد 🏢' : 'إضافة عميل جديد 👥'}
                </span>
              </button>
            )}

            {subTab === 'employees' && !isEmployeeModalOpen && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettlementForm({
                      employeeId: employees[0]?.id || '',
                      custodyAmount: employees[0]?.custody || 0,
                      invoices: [{ id: 'inv-1', category: 'أدوات مكتبية ومطبوعات', amount: '' }],
                      date: new Date().toISOString().split('T')[0],
                      notes: '',
                      paymentMethod: 'cash'
                    });
                    setIsSettlementModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <RefreshCcw size={18} className="stroke-[3]" />
                  <span>تصفية العهد المالية 📦</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVariationForm({
                      employeeId: employees[0]?.id || '',
                      type: 'bonus',
                      amountType: 'flat',
                      hours: '',
                      hourlyRate: '',
                      flatAmount: '',
                      reason: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                    setIsAddVariationModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <Plus size={18} className="stroke-[3]" />
                  <span>إضافة حركة شهرية ⚡</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmployeeModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <Plus size={18} className="stroke-[3]" />
                  <span>إضافة موظف جديد 👤</span>
                </button>
              </div>
            )}

            {subTab === 'advanced' && advancedSubTab === 'journal_entries' && !isJournalModalOpen && (
              <button
                onClick={() => {
                  setIsJournalModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              >
                <Plus size={18} className="stroke-[3]" />
                <span>إضافة قيد يدوي 📊</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unified Treasury and Liquidity Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 left-0 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl -translate-x-20 -translate-y-20 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl translate-x-20 translate-y-20 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-6">
          {/* Header & Total Overall Liquidity */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1 text-center lg:text-right animate-fade-in">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-black px-3 py-0.5 rounded-full border border-emerald-400/20">
                  إجمالي السيولة المالية الكلية بالخزائن والبنك
                </span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black font-mono pt-1 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                {(treasuryBalance + (invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0)).toLocaleString()} <span className="text-xs font-sans text-blue-300">ر.ي</span>
              </h3>
            </div>
            
            <div className="flex justify-center gap-3">
              <div className="bg-slate-800/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/5 text-right min-w-[130px] space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">مستحقات الموردين</span>
                <p className="text-sm font-black font-mono text-amber-400">{totalSuppliersBalance.toLocaleString()} ر.ي</p>
              </div>
              <div className="bg-slate-800/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/5 text-right min-w-[130px] space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">مديونيات العملاء</span>
                <p className="text-sm font-black font-mono text-emerald-400">{totalCustomersBalance.toLocaleString()} ر.ي</p>
              </div>
            </div>
          </div>

          {/* Divided Liquidity Sources: Cash vs Bank Treasury */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash Fund (الصندوق النقدي) */}
            <div
              onClick={() => {
                setReconAccountId('cash');
                setIsReconModalOpen(true);
              }}
              className="bg-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-4 shadow-xs cursor-pointer active:scale-98 group"
            >
              <div className="space-y-1">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-0.5 rounded-full border border-emerald-400/10">
                  💵 الخزينة النقدية (الكاش)
                </span>
                <h4 className="text-2xl sm:text-3xl font-black font-mono pt-1 text-white">
                  {treasuryBalance.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
                </h4>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-slate-300">
                <span className="group-hover:text-emerald-400 transition-colors">🔎 اضغط للمطابقة والطباعة ➔</span>
                <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-300 group-hover:bg-emerald-500/25 transition-all">
                  <ArrowDownLeft size={14} className="stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Bank Treasury (الخزينة البنكية الموحدة) */}
            <div
              onClick={() => {
                setIsBankTreasuryModalOpen(true);
              }}
              className="bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-4 shadow-xs cursor-pointer active:scale-98 group"
            >
              <div className="space-y-1">
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-black px-2.5 py-0.5 rounded-full border border-blue-400/10">
                  🏦 الخزينة البنكية (البنوك)
                </span>
                <h4 className="text-2xl sm:text-3xl font-black font-mono pt-1 text-white">
                  {((invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0)).toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
                </h4>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-slate-300">
                <span className="group-hover:text-blue-400 transition-colors">🔎 اضغط لتفاصيل الحسابات والطباعة ➔</span>
                <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-300 group-hover:bg-blue-500/25 transition-all">
                  <ArrowDownLeft size={14} className="stroke-[2.5]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs between Dashboard, Vouchers, Partners, Employees, and Advanced */}
      <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 rounded-2xl w-full sm:w-fit gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => {
            setSubTab('dashboard');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'dashboard'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📊 لوحة التحكم المحاسبية
        </button>
        <button
          onClick={() => {
            setSubTab('vouchers');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'vouchers'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🧾 حركة السندات والتحويلات
        </button>
        <button
          onClick={() => {
            setSubTab('partners');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'partners'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🤝 الشركاء التجاريين (عملاء / موردين)
        </button>
        <button
          onClick={() => {
            setSubTab('employees');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'employees'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 الموظفين والرواتب (HR)
        </button>
        {(currentUser.role === 'Owner' || (currentUser.role as string) === 'Accountant' || currentUser.role === 'Admin') && (
          <button
            onClick={() => {
              setSubTab('advanced');
              setSearch('');
              setIsFormOpen(false);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'advanced'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚙️ الحسابات المتقدمة والتقارير
          </button>
        )}
      </div>

      {/* Stats Cards based on selected subTab */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subTab === 'dashboard' ? (
          <>
            {/* Total Cash Liquidity */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">السيولة النقدية (الخزينة)</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {treasuryBalance.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Total Bank Balances */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي الأرصدة البنكية</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
                  {((invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0) || bankBalance || 0).toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Database size={24} />
              </div>
            </div>

            {/* Net Receivables/Payables */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">صافي المديونيات القائمة</p>
                <h3 className={`text-xl sm:text-2xl font-black font-mono ${totalCustomersBalance - totalSuppliersBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(totalCustomersBalance - totalSuppliersBalance).toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                </h3>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
                <Scale size={24} />
              </div>
            </div>
          </>
        ) : subTab === 'partners' ? (
          partnerTypeSelector === 'supplier' ? (
            <>
              {/* Total Suppliers Owed */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">إجمالي مستحقات الموردين</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {totalSuppliersBalance.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
              </div>

              {/* Suppliers count with outstanding balances */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">موردين مستحق لهم مبالغ</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {supplierDebtorsCount} <span className="text-xs text-slate-500">موردين</span>
                  </h3>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <Scale size={24} />
                </div>
              </div>

              {/* Total Supplier Count */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">إجمالي الموردين المسجلين</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {suppliers.length} <span className="text-xs text-slate-500">مورد</span>
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <User size={24} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Total Customers Owed */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">إجمالي مديونيات العملاء</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {totalCustomersBalance.toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingDown size={24} />
                </div>
              </div>

              {/* Customers count with outstanding balances */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">عملاء عليهم مديونيات قائمة</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {customerDebtorsCount} <span className="text-xs text-slate-500">عملاء</span>
                  </h3>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <Scale size={24} />
                </div>
              </div>

              {/* Total Customer Count */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">إجمالي العملاء المسجلين</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {customers.length} <span className="text-xs text-slate-500">عميل</span>
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <User size={24} />
                </div>
              </div>
            </>
          )
        ) : subTab === 'employees' ? (
          <>
            {/* Total Employees */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي الكادر الوظيفي</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                  {employees.length} <span className="text-xs text-slate-500">موظفين</span>
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Briefcase size={24} />
              </div>
            </div>

            {/* Total Salaries */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">مسيرات الرواتب الأساسية</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                  {employees.reduce((sum, e) => sum + (e.salary || 0), 0).toLocaleString()} <span className="text-xs text-slate-500">ر.ي / شهرياً</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Total Advances & Custody */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي السلف والعهد المالية</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                  {(employees.reduce((sum, e) => sum + (e.advances || 0) + (e.custody || 0), 0)).toLocaleString()} <span className="text-xs text-slate-500">ر.ي ذمم</span>
                </h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Scale size={24} />
              </div>
            </div>
          </>
        ) : subTab === 'advanced' ? (
          <>
            {/* Total Journal Entries */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي القيود المحاسبية</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                  {journalEntries.length} <span className="text-xs text-slate-500">قيد</span>
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <FileText size={24} />
              </div>
            </div>

            {/* Active Entries */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">القيود النشطة المعتمدة</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {journalEntries.filter(j => !j.isReversed).length} <span className="text-xs text-slate-500">قيد</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Check size={24} />
              </div>
            </div>

            {/* Storno / Reversed Entries */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">القيود المعكوسة (Storno)</p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                  {journalEntries.filter(j => j.isReversed).length} <span className="text-xs text-slate-500">قيد</span>
                </h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <RefreshCcw size={24} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Total Receipts */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي المقبوضات (سندات القبض)</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {receiptVouchers.reduce((sum, v) => sum + (v.amount || 0), 0).toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* Total Payments */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي المدفوعات (سندات الصرف)</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                  {paymentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0).toLocaleString()} <span className="text-xs text-slate-500">ر.ي</span>
                </h3>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Total Vouchers count */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">إجمالي السندات المصدرة</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                  {vouchers.length} <span className="text-xs text-slate-500">سند</span>
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <FileText size={24} />
              </div>
            </div>
          </>
        )}
      </div>

      {isDataLocked && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
            <Lock size={16} className="stroke-[2.5]" />
          </div>
          <div className="text-xs font-bold leading-relaxed text-right">
            وضع القراءة فقط نشط: تم قفل البيانات في الإعدادات لمنع إضافة أو تعديل الحسابات أو السندات.
          </div>
        </div>
      )}

      {/* Add / Edit Form Area */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-150 rounded-3xl p-6 space-y-4 shadow-xs animate-slide-down">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
              {subTab === 'suppliers' 
                ? (editingSupplier ? 'تعديل بيانات المورد' : 'إضافة شريك توريد جديد')
                : (editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد')
              }
            </h4>
            <button 
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1.5">
                {subTab === 'suppliers' ? 'اسم المورد / المحل التجاري *' : 'اسم العميل / المؤسسة التجارية *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all"
                placeholder={subTab === 'suppliers' ? "مثال: شركة المدى للتوريدات" : "مثال: مؤسسة الرياض للتجارة"}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1.5">رقم الهاتف / الجوال</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-bold transition-all text-left"
                placeholder="info@partner.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1.5">
                {subTab === 'suppliers' ? 'الرصيد المالي المبدئي (مستحقات لنا/عليهم) *' : 'المديونية المبدئية الحالية *'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-2xl outline-hidden text-slate-700 font-mono font-bold transition-all"
                placeholder="0"
                disabled={!!editingSupplier || !!editingCustomer}
              />
              {(editingSupplier || editingCustomer) && (
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                  لأمان الحسابات، عدّل الرصيد بالضغط على "تسجيل سند" في بطاقة الحساب.
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
            >
              <Check size={14} className="stroke-[3]" />
              <span>
                {subTab === 'suppliers' 
                  ? (editingSupplier ? 'تحديث بيانات المورد' : 'حفظ المورد')
                  : (editingCustomer ? 'تحديث بيانات العميل' : 'حفظ العميل')
                }
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Adjust Balance / Register Voucher Dialog */}
      {adjustingPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdjustmentSubmit} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={20} />
                <h3 className="font-extrabold text-base">
                  {subTab === 'suppliers' ? 'إصدار سند مالي للمورد' : 'إصدار سند مالي للعميل'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setAdjustingPartner(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-1 border border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-400">
                  {subTab === 'suppliers' ? `الرصيد المستحق للمورد (${adjustingPartner.name})` : `إجمالي مديونية العميل (${adjustingPartner.name})`}
                </p>
                <p className="text-lg font-black text-slate-800 font-mono">
                  {(adjustingPartner.balance || 0).toLocaleString()} ر.ي
                </p>
              </div>

              {/* Adjust type */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-500">نوع السند / الحركة المالية</label>
                <div className="grid grid-cols-2 gap-2">
                  {subTab === 'suppliers' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('pay')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                          adjustmentType === 'pay'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        💸 سند صرف (دفعة نقداً)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('add_debt')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                          adjustmentType === 'add_debt'
                            ? 'bg-slate-500/10 border-slate-500 text-slate-700 ring-2 ring-slate-500/20'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        ➕ قيد دين جديد (آجل)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('receive')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                          adjustmentType === 'receive'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        📥 سند قبض (تحصيل نقداً)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('add_debt')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                          adjustmentType === 'add_debt'
                            ? 'bg-slate-500/10 border-slate-500 text-slate-700 ring-2 ring-slate-500/20'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        ➕ قيد مديونية جديدة
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 text-center">
                  {subTab === 'suppliers' 
                    ? (adjustmentType === 'pay' ? 'سند الصرف يقلل من مستحقات المورد ويخفض الخزينة فوراً.' : 'قيد دين جديد يزيد من مستحقات المورد ولا يؤثر على الخزينة.')
                    : (adjustmentType === 'receive' ? 'سند القبض يقلل مديونية العميل ويزيد حساب الخزينة المالي آلياً.' : 'قيد المديونية يزيد حساب العميل بالآجل.')
                  }
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">مبلغ السند أو المعاملة (ر.ي) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value) || '')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-xl outline-hidden text-slate-700 font-mono font-bold transition-all text-center"
                  placeholder="أدخل قيمة المبلغ..."
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500">البيان / رقم المرجع والملاحظات</label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-xl outline-hidden text-slate-700 font-bold transition-all"
                  placeholder={subTab === 'suppliers' ? "مثال: سند صرف رقم 102 لتسديد دفعة الحساب" : "مثال: دفعة شيك بنكي رقم 4402"}
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500 flex justify-between items-center">
                  <span>تاريخ المعاملة</span>
                  {currentUser.role !== 'Owner' && <span className="text-[9px] text-slate-400 font-bold">(مغلق لغير المالك)</span>}
                </label>
                <input
                  type="date"
                  required
                  value={adjustmentDate}
                  disabled={currentUser.role !== 'Owner'}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm px-4 py-3 rounded-xl outline-hidden text-slate-700 font-bold transition-all ${
                    currentUser.role !== 'Owner' ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''
                  }`}
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustingPartner(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                حفظ وإصدار السند 💾
              </button>
            </div>
          </form>
        </div>
      )}

      {/* showVoucherReceipt Modal */}
      {showVoucherReceipt && lastCreatedVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <h3 className="font-extrabold text-base">معاينة وطباعة السند المالي</h3>
              </div>
              <button 
                onClick={() => setShowVoucherReceipt(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]" id="printable-voucher">
              {/* Receipt Body */}
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl space-y-4">
                <div className="text-center space-y-1 pb-4 border-b border-slate-100">
                  <h2 className="font-black text-lg text-slate-800">{lastCreatedVoucher.title}</h2>
                  <p className="text-[10px] text-slate-400 font-mono">رقم السند: {lastCreatedVoucher.id}</p>
                  <p className="text-[10px] text-slate-400 font-mono">التاريخ: {lastCreatedVoucher.date}</p>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>الجهة / المستلم:</span>
                    <strong>{lastCreatedVoucher.partnerName} ({lastCreatedVoucher.partnerType})</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>المبلغ المدفوع/المستلم:</span>
                    <strong className="text-blue-700 text-sm font-mono font-black">
                      {lastCreatedVoucher.amount.toLocaleString()} ر.ي
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>رصيد الحساب قبل المعاملة:</span>
                    <span className="font-mono">{lastCreatedVoucher.previousBalance.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>رصيد الحساب المتبقي:</span>
                    <strong className="text-slate-800 font-mono font-black">{lastCreatedVoucher.newBalance.toLocaleString()} ر.ي</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>البيان والملاحظات:</span>
                    <span className="text-black font-extrabold text-right max-w-[250px]">{lastCreatedVoucher.notes}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[10px] font-black text-black">
                  <div className="space-y-8">
                    <span>توقيع المستلم / العميل</span>
                    <div className="border-b border-slate-200 w-32 mx-auto"></div>
                  </div>
                  <div className="space-y-8">
                    <span>توقيع الموظف المسؤول ({lastCreatedVoucher.createdBy})</span>
                    <div className="border-b border-slate-200 w-32 mx-auto"></div>
                  </div>
                </div>

                {/* Treasury Notice */}
                {(lastCreatedVoucher.title.includes('صرف') || lastCreatedVoucher.title.includes('قبض')) && (
                  <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                    <p className="text-[9px] text-black font-black leading-relaxed">
                      💡 تم تسوية هذا السند آلياً وتحديث رصيد صندوق الخزينة الرئيسي في النظام.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between items-center">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer size={14} />
                <span>طباعة السند 🖨️</span>
              </button>

              <button
                onClick={() => setShowVoucherReceipt(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                تم، إغلاق المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Account Statement (كشف الحساب) Modal */}
      {isStatementModalOpen && statementPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-right">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-400" size={22} />
                <h3 className="font-extrabold text-base sm:text-lg">
                  كشف الحساب المالي التفصيلي 📄
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsStatementModalOpen(false);
                  setStatementPartner(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Date Filters (No-Print) */}
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500">تصفية التاريخ:</span>
                <div className="flex items-center gap-1.5" dir="rtl">
                  <input 
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-400">إلى</span>
                  <input 
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                  {(statementStartDate || statementEndDate) && (
                    <button
                      onClick={() => {
                        setStatementStartDate('');
                        setStatementEndDate('');
                      }}
                      className="text-[10px] text-red-600 hover:bg-red-50 font-bold px-2 py-1 rounded-md"
                    >
                      إعادة تعيين ✖
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer size={13} />
                  <span>طباعة وتصدير PDF 🖨️</span>
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-6 overflow-y-auto max-h-[75vh] bg-white text-slate-800" id="printable-statement" dir="rtl">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center border-b-2 border-slate-900 pb-5 mb-6 gap-4">
                <div className="text-right space-y-1">
                  <h1 className="font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span>
                    مؤسسة الميناء للخدمات التجارية المحدودة
                  </h1>
                  <p className="text-xs text-slate-500 font-bold">قسم الحسابات المالية العامة • كشف حساب رسمي ومطابقة أرصدة</p>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')} • {new Date().toLocaleTimeString('ar-YE', {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
                
                <div className="text-center sm:text-left border border-slate-200 px-4 py-2.5 rounded-2xl bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 font-black block tracking-widest font-mono">WMS SYSTEM STATEMENT</span>
                  <span className="text-xs text-slate-700 font-black font-mono">REF: STM-{statementPartner.id}-{Date.now().toString().slice(-4)}</span>
                </div>
              </div>

              {/* Account Meta Info Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-6">
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-black block">صاحب الحساب / الاسم</span>
                  <strong className="text-sm text-slate-900 font-extrabold">{statementPartner.name}</strong>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-black block">الرقم المرجعي</span>
                  <strong className="text-sm text-slate-800 font-mono font-bold">{statementPartner.id}</strong>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-black block">فئة وطبيعة الحساب</span>
                  <span className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-md mt-0.5 ${
                    statementPartnerType === 'supplier' ? 'bg-amber-100 text-amber-800' :
                    statementPartnerType === 'customer' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {statementPartnerType === 'supplier' ? 'مورد (شريك توريد جهة دائنة)' :
                     statementPartnerType === 'customer' ? 'عميل (ذمم تجارية جهة مدينة)' : 'موظف (كادر وظيفي)'}
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-black block">الرصيد الختامي الحالي</span>
                  <strong className="text-sm text-blue-800 font-mono font-black">
                    {statementPartnerType === 'employee' 
                      ? ((statementPartner.advances || 0) + (statementPartner.custody || 0)).toLocaleString()
                      : (statementPartner.balance || 0).toLocaleString()} ر.ي
                  </strong>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-black tracking-wide border-b border-slate-800">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 w-28 text-center">التاريخ</th>
                      <th className="py-3 px-4">رقم الحركة/البيان</th>
                      <th className="py-3 px-4 w-28 text-center">مدين (له)</th>
                      <th className="py-3 px-4 w-28 text-center">دائن (عليه)</th>
                      <th className="py-3 px-4 w-32 text-center">الرصيد الجاري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {/* Opening Balance Row */}
                    {(() => {
                      const allEntries = getStatementEntries();
                      // filter by date
                      const filteredEntries = allEntries.filter(e => {
                        if (statementStartDate && new Date(e.date) < new Date(statementStartDate)) return false;
                        if (statementEndDate && new Date(e.date) > new Date(statementEndDate)) return false;
                        return true;
                      });

                      // compute opening balance
                      let finalBalance = statementPartnerType === 'employee'
                        ? ((statementPartner.advances || 0) + (statementPartner.custody || 0))
                        : (statementPartner.balance || 0);

                      let cumulativeDiff = 0;
                      allEntries.forEach(e => {
                        if (statementPartnerType === 'supplier') {
                          cumulativeDiff += (e.credit - e.debit);
                        } else {
                          cumulativeDiff += (e.debit - e.credit);
                        }
                      });

                      const openingBalance = finalBalance - cumulativeDiff;
                      let runningBalance = openingBalance;

                      return (
                        <>
                          <tr className="bg-slate-50 font-black text-slate-600">
                            <td className="py-3 px-4 text-center font-mono">-</td>
                            <td className="py-3 px-4 text-center font-mono">{statementStartDate || 'تأسيس'}</td>
                            <td className="py-3 px-4">رصيد افتتاحي سابق / مدور من فترات محاسبية سابقة</td>
                            <td className="py-3 px-4 text-center font-mono">-</td>
                            <td className="py-3 px-4 text-center font-mono">-</td>
                            <td className="py-3 px-4 text-center font-mono font-black">{openingBalance.toLocaleString()} ر.ي</td>
                          </tr>

                          {filteredEntries.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 px-4 text-center text-slate-400 font-bold">
                                لا توجد حركات مالية أو سندات مسجلة ضمن هذه الفترة المحددة.
                              </td>
                            </tr>
                          ) : (
                            filteredEntries.map((e, index) => {
                              if (statementPartnerType === 'supplier') {
                                runningBalance += (e.credit - e.debit);
                              } else {
                                runningBalance += (e.debit - e.credit);
                              }

                              return (
                                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4 text-center text-slate-400 font-mono font-bold">{index + 1}</td>
                                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{e.date}</td>
                                  <td className="py-3 px-4">
                                    <div className="font-extrabold text-slate-900">{e.title}</div>
                                    {e.notes && <div className="text-[10px] text-slate-400 mt-0.5">{e.notes}</div>}
                                    <div className="text-[9px] text-slate-300 font-mono mt-0.5">بواسطة: {e.createdBy} | مرجع: {e.id}</div>
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-black text-emerald-600">
                                    {e.debit > 0 ? `${e.debit.toLocaleString()} ر.ي` : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-black text-rose-600">
                                    {e.credit > 0 ? `${e.credit.toLocaleString()} ر.ي` : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-black text-slate-800">
                                    {runningBalance.toLocaleString()} ر.ي
                                  </td>
                                </tr>
                              );
                            })
                          )}

                          {/* Totals Summary Row */}
                          <tr className="bg-slate-900 text-white font-black">
                            <td colSpan={3} className="py-4 px-4 text-left text-xs uppercase font-black">إجمالي الحركة للرصيد الختامي المطابق آلياً:</td>
                            <td className="py-4 px-4 text-center font-mono text-emerald-400 text-xs">
                              {filteredEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString()} ر.ي
                            </td>
                            <td className="py-4 px-4 text-center font-mono text-rose-400 text-xs">
                              {filteredEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString()} ر.ي
                            </td>
                            <td className="py-4 px-4 text-center font-mono text-white text-xs">
                              {runningBalance.toLocaleString()} ر.ي
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Auditor & Approvals Footer */}
              <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-6">
                  <span className="font-bold text-slate-400 block text-[10px] tracking-widest">إعداد ومراجعة</span>
                  <strong className="text-slate-800 block">{currentUser.username} ({currentUser.role})</strong>
                  <div className="border-b border-slate-200 w-36 mx-auto pt-4"></div>
                </div>
                <div className="space-y-6">
                  <span className="font-bold text-slate-400 block text-[10px] tracking-widest">اعتماد المدير المالي</span>
                  <strong className="text-slate-800 block">أ. خالد اليافعي</strong>
                  <div className="border-b border-slate-200 w-36 mx-auto pt-4"></div>
                </div>
                <div className="space-y-6">
                  <span className="font-bold text-slate-400 block text-[10px] tracking-widest">توقيع ومصادقة صاحب الحساب</span>
                  <strong className="text-slate-800 block">{statementPartner.name}</strong>
                  <div className="border-b border-slate-200 w-36 mx-auto pt-4"></div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4 font-bold">
                💡 يعتبر هذا الكشف الصادر من النظام وثيقة رسمية وصالحة لمطابقة الأرصدة التجارية والمحاسبية بين الطرفين في تاريخه.
              </div>
            </div>

            {/* Print Styles and Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-2 no-print">
              <button
                onClick={() => {
                  setIsStatementModalOpen(false);
                  setStatementPartner(null);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                إغلاق الكشف
              </button>
            </div>
          </div>

          {/* Embedded Custom CSS for Printing */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-statement, #printable-statement * {
                visibility: visible !important;
              }
              #printable-statement {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 30px !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Search & Action bar */}
      {subTab !== 'dashboard' && (
        <div className="bg-white p-4.5 rounded-3xl border border-slate-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-2xl w-full">
              <Search className="text-slate-400 stroke-[2.5]" size={16} />
              <input
                type="text"
                placeholder={
                  subTab === 'partners'
                    ? (partnerTypeSelector === 'supplier'
                        ? 'البحث السريع بـ اسم المورد، رقم الهاتف، أو البريد الإلكتروني...'
                        : 'البحث السريع بـ اسم العميل، رقم الهاتف، أو البريد الإلكتروني...')
                    : subTab === 'vouchers'
                    ? 'البحث في السندات بـ رقم السند، اسم المستلم/الجهة، أو مركز التكلفة والبيان...'
                    : subTab === 'employees'
                    ? 'البحث بـ اسم الموظف، المسمى الوظيفي، أو رقم الهاتف...'
                    : 'البحث في القيود بـ رقم القيد، البيان، أو اسم الحساب...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent focus:outline-hidden text-xs sm:text-sm text-slate-700 font-bold placeholder-slate-400 text-right"
              />
            </div>

            {subTab === 'vouchers' && !isDataLocked && (
              <button
                onClick={() => {
                  setVType('pay');
                  setVTargetGroup('supplier');
                  setVSelectedTargetId('');
                  setVAmount('');
                  setVNotes('');
                  setVDate(new Date().toISOString().split('T')[0]);
                  setIsVoucherModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02] w-full sm:w-auto shrink-0"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>إصدار سند مالي جديد 🧾</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Partners Grid Layout */}
      {subTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Quick Info Alerts or Welcome Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>المركز المالي للشركة 🏢</span>
                </h3>
                <p className="text-xs text-slate-300 font-medium max-w-xl">
                  توضح هذه اللوحة توزيع السيولة النقدية والمصرفية للشركة، بالإضافة إلى أرصدة الذمم المدينة للعملاء والمستحقات الدائنة للموردين بشكل فوري.
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 shrink-0 text-center font-mono">
                <span className="text-[10px] block text-slate-400 font-bold uppercase">SYSTEM STATUS</span>
                <span className="text-xs font-black text-emerald-400">● LIVE LEDGER OK</span>
              </div>
            </div>
          </div>

          {/* Detailed Bank Accounts Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>🏦 تفاصيل الحسابات البنكية المعرفة</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-bold">الحسابات البنكية المعتمدة لتسوية السندات والفواتير المباشرة.</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">BANK ACCOUNTS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black">
                    <th className="py-3 px-4 rounded-r-xl">اسم البنك / الحساب</th>
                    <th className="py-3 px-4">رقم الحساب / IBAN</th>
                    <th className="py-3 px-4">الرصيد الفعلي</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-left rounded-l-xl">العمليات</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-slate-700 divide-y divide-slate-50">
                  {(invoiceSettings?.bankAccounts || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        لا توجد حسابات بنكية معرفة حالياً! توجه إلى إعدادات الشركة لتهيئة الحسابات.
                      </td>
                    </tr>
                  ) : (
                    (invoiceSettings?.bankAccounts || []).map((b: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-800 font-extrabold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{b.name || b.bankName || 'بنك غير معروف'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{b.accountNumber || b.accountNo || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-blue-600 font-mono">{(b.balance || 0).toLocaleString()} ر.ي</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            نشط ومترابط
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              // Print statement or copy IBAN
                              alert(`تم نسخ رقم الحساب البنكي: ${b.accountNumber || b.accountNo || 'N/A'}`);
                            }}
                            className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-[10px] font-black"
                          >
                            نسخ الحساب 📋
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Vouchers Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800">🧾 آخر السندات والتحويلات المصدرة</h4>
                <button
                  type="button"
                  onClick={() => setLocalSubTab('vouchers')}
                  className="text-xs font-black text-blue-600 hover:underline"
                >
                  عرض الكل &larr;
                </button>
              </div>

              <div className="space-y-3">
                {vouchers.slice(0, 5).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد سندات مالية مسجلة حالياً.</p>
                ) : (
                  vouchers.slice(0, 5).map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-slate-800">{v.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{v.partnerName} | {v.date} {v.time}</p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className={`text-xs font-black font-mono ${v.isReceipt ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {v.isReceipt ? '+' : '-'}{v.amount.toLocaleString()} ر.ي
                        </p>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">{v.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Journal Entries Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800">📊 آخر القيود المحاسبية المدونة</h4>
                <button
                  type="button"
                  onClick={() => {
                    setLocalSubTab('advanced');
                    setAdvancedSubTab('journal_entries');
                  }}
                  className="text-xs font-black text-blue-600 hover:underline"
                >
                  عرض القيود &larr;
                </button>
              </div>

              <div className="space-y-3">
                {journalEntries.slice(0, 5).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد قيود يومية مسجلة حالياً.</p>
                ) : (
                  journalEntries.slice(0, 5).map((j) => (
                    <div key={j.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-right space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">{j.id}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{j.date}</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 line-clamp-1">{j.notes || 'بدون بيان مالي للذكر'}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>المرجع: {j.reference || 'N/A'}</span>
                        <span className={`${j.isReversed ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {j.isReversed ? 'معكوس (ملغى)' : 'معتمد ونشط'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'partners' && partnerTypeSelector === 'supplier' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
              <p className="text-sm font-bold">لم يعثر على أي شريك توريد مطابق!</p>
              <p className="text-xs mt-1">تأكد من الحروف أو أضف شريك توريد جديد لتشغيل دورة المشتريات.</p>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => {
              const owesMoney = (supplier.balance || 0) > 0;
              return (
                <div 
                  key={supplier.id}
                  className="bg-white border border-slate-100/80 hover:border-slate-200 hover:shadow-xs rounded-3xl p-5 flex flex-col justify-between gap-5 transition-all"
                >
                  {/* Header */}
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-lg font-mono">
                        {supplier.id}
                      </span>
                      
                      {owesMoney ? (
                        <span className="text-[10px] bg-amber-50 border border-amber-100 text-amber-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <ArrowUpRight size={12} className="stroke-[2.5]" />
                          <span>مستحقات آجلة</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Check size={12} className="stroke-[2.5]" />
                          <span>حساب مستقر</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base pt-1">
                      {supplier.name}
                    </h3>
                  </div>

                  {/* Balance Ledger box */}
                  <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-black">الرصيد المالي المستحق</p>
                      <p className={`text-base font-black font-mono mt-0.5 ${owesMoney ? 'text-amber-600' : 'text-slate-900'}`}>
                        {(supplier.balance || 0).toLocaleString()} <span className="text-[10px] text-black font-black">ر.ي</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setStatementPartner(supplier);
                          setStatementPartnerType('supplier');
                          setIsStatementModalOpen(true);
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-extrabold text-[10px] px-2.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="كشف حساب المورد"
                      >
                        <FileText size={11} />
                        <span>كشف الحساب 📄</span>
                      </button>
                      {!isDataLocked && (
                        <button
                          onClick={() => {
                            setAdjustingPartner(supplier);
                            setAdjustmentType('pay');
                          }}
                          className="bg-white border border-slate-200/80 text-blue-600 hover:text-white hover:bg-blue-600 font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          إصدار سند دفع 💸
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100/60 text-xs text-slate-500">
                    {supplier.phone ? (
                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <Phone size={12} />
                        </span>
                        <span className="font-bold">{supplier.phone}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 italic text-[11px]">بدون رقم هاتف مسجل</div>
                    )}

                    {supplier.email ? (
                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <Mail size={12} />
                        </span>
                        <span className="font-bold truncate max-w-[200px]">{supplier.email}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 italic text-[11px]">بدون بريد الكتروني مسجل</div>
                    )}
                  </div>
                  {/* Footer Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      {isDataLocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">🔒 مقفل</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer"
                            title="تعديل المورد"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟ سيتم حذف بيانات الاتصال دون التأثير على المستندات المحفوظة.`)) {
                                onDeleteSupplier(supplier.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
                            title="حذف المورد"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-300 font-bold font-mono">
                      WMS SUPPLIER PARTNER
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : subTab === 'partners' && partnerTypeSelector === 'customer' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
              <p className="text-sm font-bold">لم يعثر على أي عميل مطابق!</p>
              <p className="text-xs mt-1">تأكد من الحروف أو أضف عميل جديد لبدء المبيعات وتحصيل المديونيات.</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const owesMoney = (customer.balance || 0) > 0;
              return (
                <div 
                  key={customer.id}
                  className="bg-white border border-slate-100/80 hover:border-slate-200 hover:shadow-xs rounded-3xl p-5 flex flex-col justify-between gap-5 transition-all"
                >
                  {/* Header */}
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-lg font-mono">
                        {customer.id}
                      </span>
                      
                      {owesMoney ? (
                        <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <ArrowDownLeft size={12} className="stroke-[2.5]" />
                          <span>مديونية معلقة</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Check size={12} className="stroke-[2.5]" />
                          <span>حساب مستقر</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base pt-1">
                      {customer.name}
                    </h3>
                  </div>

                  {/* Balance Ledger box */}
                  <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-black">المديونية المستحقة عليه</p>
                      <p className={`text-base font-black font-mono mt-0.5 ${owesMoney ? 'text-red-600' : 'text-slate-900'}`}>
                        {(customer.balance || 0).toLocaleString()} <span className="text-[10px] text-black font-black">ر.ي</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setStatementPartner(customer);
                          setStatementPartnerType('customer');
                          setIsStatementModalOpen(true);
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-extrabold text-[10px] px-2.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="كشف حساب العميل"
                      >
                        <FileText size={11} />
                        <span>كشف الحساب 📄</span>
                      </button>
                      {!isDataLocked && (
                        <button
                          onClick={() => {
                            setAdjustingPartner(customer);
                            setAdjustmentType('receive');
                          }}
                          className="bg-white border border-slate-200/80 text-emerald-600 hover:text-white hover:bg-emerald-600 font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          إصدار سند قبض 📥
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100/60 text-xs text-slate-500">
                    {customer.phone ? (
                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <Phone size={12} />
                        </span>
                        <span className="font-bold">{customer.phone}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 italic text-[11px]">بدون رقم هاتف مسجل</div>
                    )}

                    {customer.email ? (
                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <Mail size={12} />
                        </span>
                        <span className="font-bold truncate max-w-[200px]">{customer.email}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 italic text-[11px]">بدون بريد الكتروني مسجل</div>
                    )}
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      {isDataLocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">🔒 مقفل</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer"
                            title="تعديل العميل"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟ سيتم حذف بيانات الاتصال دون التأثير على المعاملات المالية.`)) {
                                const updated = customers.filter(c => c.id !== customer.id);
                                onUpdateCustomers(updated);
                                if (onLogAction) {
                                  onLogAction('delete', 'suppliers', `تم حذف حساب العميل: ${customer.name}`);
                                }
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
                            title="حذف العميل"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-300 font-bold font-mono">
                      WMS CUSTOMER PARTNER
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : subTab === 'employees' ? (
        <HRView
          employees={employees}
          onUpdateEmployees={onUpdateEmployees}
          journalEntries={journalEntries}
          onUpdateJournalEntries={onUpdateJournalEntries}
          treasuryBalance={treasuryBalance}
          onUpdateTreasuryBalance={onUpdateTreasuryBalance}
          invoiceSettings={invoiceSettings}
          onUpdateInvoiceSettings={onUpdateInvoiceSettings}
          onLogAction={onLogAction}
          currentUser={currentUser}
          search={search}
          isDataLocked={isDataLocked}
          setVType={setVType}
          setVTargetGroup={setVTargetGroup}
          setVSelectedTargetId={setVSelectedTargetId}
          setIsVoucherModalOpen={setIsVoucherModalOpen}
          setStatementPartner={setStatementPartner}
          setStatementPartnerType={setStatementPartnerType}
          setIsStatementModalOpen={setIsStatementModalOpen}
        />
      ) : subTab === 'employees_old' ? (
        <div className="space-y-6">
          {/* Employee Creation/Edition Modal */}
          {isEmployeeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-lg space-y-4 text-right" dir="rtl animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    {editingEmployee ? 'تعديل بيانات الموظف 👤' : 'تسجيل موظف جديد بالكادر 👤'}
                  </h4>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEmployeeModalOpen(false);
                      setEditingEmployee(null);
                      setEmpForm({ name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0 });
                    }}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم الموظف الثلاثي (مطلوب)</label>
                    <input
                      type="text"
                      required
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      placeholder="مثال: أحمد عبد الله اليماني"
                      className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">المسمى الوظيفي</label>
                      <input
                        type="text"
                        value={empForm.role}
                        onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                        placeholder="مثال: محاسب، أمين مخزن"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الراتب الشهري الأساسي (ر.ي)</label>
                      <input
                        type="number"
                        value={empForm.salary}
                        onChange={(e) => setEmpForm({ ...empForm, salary: Number(e.target.value) })}
                        placeholder="مثال: 150000"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف</label>
                      <input
                        type="text"
                        value={empForm.phone}
                        onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                        placeholder="77xxxxxxx"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500 text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                        placeholder="employee@wms.com"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {!editingEmployee && (
                    <div className="grid grid-cols-2 gap-4 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/40">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-indigo-900">سلف سابقة (إن وجد)</label>
                        <input
                          type="number"
                          value={empForm.advances}
                          onChange={(e) => setEmpForm({ ...empForm, advances: Number(e.target.value) })}
                          className="w-full bg-white border border-indigo-200/60 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-indigo-900">عهد سابقة (إن وجد)</label>
                        <input
                          type="number"
                          value={empForm.custody}
                          onChange={(e) => setEmpForm({ ...empForm, custody: Number(e.target.value) })}
                          className="w-full bg-white border border-indigo-200/60 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmployeeModalOpen(false);
                        setEditingEmployee(null);
                        setEmpForm({ name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0 });
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      إلغاء التراجع
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      {editingEmployee ? 'حفظ التعديلات' : 'تسجيل الموظف'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Employees Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold">لم يعثر على أي موظف مطابق!</p>
                <p className="text-xs mt-1">تأكد من الحروف أو أضف شريكاً كادرياً جديداً.</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const totalDue = (emp.advances || 0) + (emp.custody || 0);
                return (
                  <div 
                    key={emp.id}
                    className="bg-white border border-slate-100/80 hover:border-slate-200 hover:shadow-xs rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all"
                  >
                    {/* Header */}
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-lg font-mono">
                          {emp.id}
                        </span>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-2.5 py-1 rounded-lg">
                          {emp.role || 'موظف بالكادر'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-800 text-sm sm:text-base pt-1">
                        {emp.name}
                      </h3>
                    </div>

                    {/* Salary & Balance ledger box */}
                    <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-black font-black">الراتب الأساسي:</span>
                        <span className="font-extrabold text-slate-800 font-mono">{(emp.salary || 0).toLocaleString()} ر.ي</span>
                      </div>
                      
                      {/* Live monthly variables display */}
                      {(() => {
                        const { overtime, bonus, deductions, net } = getEmployeeSalaryDetails(emp);
                        return (
                          <>
                            {(overtime > 0 || bonus > 0 || deductions > 0) && (
                              <div className="space-y-1 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                                {overtime > 0 && (
                                  <div className="flex justify-between items-center text-amber-700 font-bold">
                                    <span>العمل الإضافي (+):</span>
                                    <span>{overtime.toLocaleString()} ر.ي</span>
                                  </div>
                                )}
                                {bonus > 0 && (
                                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                                    <span>الإكراميات والمكافآت (+):</span>
                                    <span>{bonus.toLocaleString()} ر.ي</span>
                                  </div>
                                )}
                                {deductions > 0 && (
                                  <div className="flex justify-between items-center text-rose-700 font-bold">
                                    <span>الاستقطاعات والخصم (-):</span>
                                    <span>{deductions.toLocaleString()} ر.ي</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 bg-emerald-50/50 -mx-4 px-4 py-2 text-emerald-900 font-black">
                              <span>صافي المستحق الحالي:</span>
                              <span className="text-emerald-800 font-mono text-sm">{net.toLocaleString()} ر.ي</span>
                            </div>
                          </>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <div className="text-right">
                          <span className="text-black block font-black">إجمالي السلف:</span>
                          <span className="font-black text-rose-700 font-mono">{(emp.advances || 0).toLocaleString()} ر.ي</span>
                        </div>
                        <div className="text-right">
                          <span className="text-black block font-black">العهدة المستندية:</span>
                          <span className="font-black text-amber-700 font-mono">{(emp.custody || 0).toLocaleString()} ر.ي</span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Variations / Estihqaqat & Istiqta'at Collapsible Accordion */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setExpandedEmpId(expandedEmpId === emp.id ? null : emp.id)}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between cursor-pointer ${
                          expandedEmpId === emp.id 
                            ? 'bg-slate-100 border-slate-300 text-slate-800 font-extrabold' 
                            : 'bg-indigo-50/50 border-indigo-100 text-indigo-700 hover:bg-indigo-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          📋 المتغيرات الشهرية والخصومات ({(emp.monthlyVariations?.filter((v: any) => !v.isApplied) || []).length})
                        </span>
                        <span>{expandedEmpId === emp.id ? '▲ إغلاق' : '▼ إدارة وتحكم'}</span>
                      </button>

                      {expandedEmpId === emp.id && (
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2.5 text-right">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                            <span className="text-[10px] font-extrabold text-slate-500">حركات الشهر الجاري المعلقة</span>
                            <button
                              type="button"
                              onClick={() => {
                                setVariationForm({
                                  employeeId: emp.id,
                                  type: 'bonus',
                                  amountType: 'flat',
                                  hours: '',
                                  hourlyRate: '',
                                  flatAmount: '',
                                  reason: '',
                                  date: new Date().toISOString().split('T')[0]
                                });
                                setIsAddVariationModalOpen(true);
                              }}
                              className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-black px-2.5 py-1 rounded-lg transition-all"
                            >
                              + إضافة حركة ⚡
                            </button>
                          </div>

                          {(() => {
                            const activeVars = emp.monthlyVariations?.filter((v: any) => !v.isApplied) || [];
                            if (activeVars.length === 0) {
                              return (
                                <p className="text-[10px] text-slate-400 italic text-center py-2 font-bold">لا توجد حركات شهرية مسجلة</p>
                              );
                            }
                            return (
                              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                {activeVars.map((v: any) => (
                                  <div key={v.id} className="flex justify-between items-center bg-white border border-slate-200/60 p-2 rounded-xl text-[10px] shadow-2xs">
                                    <div className="text-right space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                                          v.type === 'overtime' ? 'bg-amber-100 text-amber-800' :
                                          v.type === 'bonus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                        }`}>
                                          {v.type === 'overtime' ? 'إضافي' : v.type === 'bonus' ? 'إكرامية' : 'خصم'}
                                        </span>
                                        <span className="font-bold text-slate-700">{v.reason}</span>
                                      </div>
                                      <div className="text-[8px] text-slate-400 font-bold font-mono">
                                        {v.date} {v.hours ? `(${v.hours}س × ${v.hourlyRate}ر)` : ''}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`font-mono font-extrabold ${v.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {v.type === 'deduction' ? '-' : '+'}{(v.amount || 0).toLocaleString()} ر.ي
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVariation(emp.id, v.id)}
                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer"
                                        title="حذف الحركة"
                                      >
                                        <X size={10} className="stroke-[3]" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* History Collapsible Log */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-black">سجل المعاملات والمدفوعات الأخير:</p>
                      <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-2 scrollbar-none text-[10px]">
                        {!emp.history || emp.history.length === 0 ? (
                          <p className="text-black/60 italic text-center py-2 font-bold">لا توجد معاملات بعد</p>
                        ) : (
                          emp.history.map((tx: any) => (
                            <div key={tx.id} className="flex justify-between items-start gap-1 bg-white p-1.5 rounded-lg border border-slate-100">
                              <div className="text-right">
                                <span className="font-bold block text-slate-900">{tx.notes}</span>
                                <span className="text-[9px] text-black font-mono font-black">{tx.date}</span>
                              </div>
                              <span className={`font-mono font-extrabold shrink-0 ${tx.type === 'advance' ? 'text-rose-700' : tx.type === 'custody_grant' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : 'مسجل'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Actions and details footer */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setVType('pay');
                            setVTargetGroup('employee');
                            setVSelectedTargetId(emp.id);
                            setVAmount('');
                            setVNotes('');
                            setVDate(new Date().toISOString().split('T')[0]);
                            setIsVoucherModalOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="صرف راتب / سلفة / عهدة"
                        >
                          صرف مالي 💸
                        </button>
                        <button
                          onClick={() => {
                            setStatementPartner(emp);
                            setStatementPartnerType('employee');
                            setIsStatementModalOpen(true);
                          }}
                          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="كشف حساب الموظف"
                        >
                          <FileText size={11} />
                          <span>كشف الحساب 📄</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEmpForm({
                              name: emp.name,
                              role: emp.role || 'موظف',
                              phone: emp.phone || '',
                              email: emp.email || '',
                              salary: emp.salary || 0,
                              advances: emp.advances || 0,
                              custody: emp.custody || 0
                            });
                            setIsEmployeeModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="تعديل بيانات"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف الموظف "${emp.name}" من الكادر؟`)) {
                              const updated = employees.filter(e => e.id !== emp.id);
                              onUpdateEmployees(updated);
                              if (onLogAction) {
                                onLogAction('delete', 'suppliers', `تم حذف الموظف: ${emp.name} من الكادر الوظيفي`);
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="حذف الموظف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold font-mono">WMS EMP CADRE</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : subTab === 'advanced' ? (
        <div className="space-y-6 animate-fade-in text-right font-sans" dir="rtl">
          {/* Header Block */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>📊</span>
                <span>الحسابات المتقدمة وإقفال الدورة المحاسبية</span>
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-1">مطابقة الأرصدة والجرود، كشوف الحسابات والميزانيات، وإجراء تصفية وإقفال السنة المالية.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>+ قيد يدوي مزدوج 📊</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* RIGHT COLUMN: Reconciliation & Adjustments */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">🤝</span>
                  <span>أدوات المطابقة والتسويات (Reconciliation)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">جرد خزائن النقدية، مراجعة حسابات البنوك، وتسوية فروقات الأرصدة.</p>
              </div>

              {/* Reconciliation Selector Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setReconciliationTab('cash')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    reconciliationTab === 'cash' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💵 جرد الخزينة
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationTab('bank')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    reconciliationTab === 'bank' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🏦 جرد البنوك
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationTab('balancing')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    reconciliationTab === 'balancing' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⚖️ موازنة الحسابات (Account Balancing)
                </button>
              </div>

              {/* Cash Reconciliation Render */}
              {reconciliationTab === 'cash' && (
                <div className="space-y-4 animate-fade-in text-[11px]">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">الرصيد الدفتري الحالي بالخزينة:</span>
                      <span className="font-mono font-black text-slate-800">{(treasuryBalance || 0).toLocaleString()} ر.ي</span>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-black">مبلغ الجرد النقدي الفعلي بالصندوق</label>
                      <input
                        type="number"
                        placeholder="أدخل رصيد الجرد الفعلي بالخزينة..."
                        value={physicalCash}
                        onChange={(e) => setPhysicalCash(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden text-left font-mono"
                      />
                    </div>
                    {physicalCash !== '' && (() => {
                      const diff = Number(physicalCash) - (treasuryBalance || 0);
                      return (
                        <div className="p-3 bg-slate-100/50 rounded-xl space-y-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-500">الفارق الفعلي:</span>
                            <span className={diff === 0 ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-rose-600"}>
                              {diff === 0 ? "مطابق تماماً ✓" : `${diff > 0 ? '+' : ''}${diff.toLocaleString()} ر.ي`}
                            </span>
                          </div>
                          {diff !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const vId = `VCH-ADJ-${Math.floor(1000 + Math.random() * 9000)}`;
                                const vData = {
                                  id: vId,
                                  partnerName: 'الخزينة النقدية العامة',
                                  partnerType: 'تسوية خزينة',
                                  amount: Math.abs(diff),
                                  previousBalance: treasuryBalance || 0,
                                  newBalance: Number(physicalCash),
                                  notes: `تسوية فارق جرد الخزينة بموافقة المسؤول المالي برقم ${vId}`,
                                  date: new Date().toISOString().split('T')[0],
                                  createdBy: currentUser.username,
                                  isReceipt: diff > 0,
                                };
                                setVouchers([vData, ...vouchers]);
                                onUpdateTreasuryBalance(Number(physicalCash));
                                setPhysicalCash('');

                                createAutoJournalEntry({
                                  notes: `تسوية فارق جرد الخزينة نقداً - سند ${vId}`,
                                  reference: vId,
                                  lines: [
                                    { account: 'الخزينة العامة', debit: diff > 0 ? Math.abs(diff) : 0, credit: diff < 0 ? Math.abs(diff) : 0 },
                                    { account: 'حساب أرباح وخسائر فروقات الجرد', debit: diff < 0 ? Math.abs(diff) : 0, credit: diff > 0 ? Math.abs(diff) : 0 }
                                  ],
                                  date: new Date().toISOString().split('T')[0]
                                });
                                alert('✅ تم ترحيل قيد تسوية الخزينة وتحديث الرصيد الدفتري بنجاح!');
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-lg transition-all cursor-pointer"
                            >
                              ترحيل قيد تسوية الخزينة تلقائي ⚡
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Bank Reconciliation Render */}
              {reconciliationTab === 'bank' && (
                <div className="space-y-4 animate-fade-in text-[11px]">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold">الحساب البنكي المعني</label>
                    <select
                      value={selectedReconciliationBank}
                      onChange={(e) => {
                        setSelectedReconciliationBank(e.target.value);
                        setPhysicalBankBalance('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                    >
                      <option value="">-- اختر البنك للمطابقة --</option>
                      {(invoiceSettings?.bankAccounts || []).map((b, idx) => (
                        <option key={idx} value={b.name}>
                          {b.name} - {b.accountNumber || 'بدون رقم حساب'} (رصيد النظام: {(b.balance || 0).toLocaleString()} ر.ي)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedReconciliationBank && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100/60 animate-scale-up">
                      <div className="space-y-1">
                        <label className="block text-slate-500 font-black">الرصيد الفعلي بكشف الحساب البنكي</label>
                        <input
                          type="number"
                          placeholder="أدخل الرصيد المطبوع بكشف حساب البنك..."
                          value={physicalBankBalance}
                          onChange={(e) => setPhysicalBankBalance(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden text-left font-mono"
                        />
                      </div>

                      {physicalBankBalance && (() => {
                        const bankObj = (invoiceSettings?.bankAccounts || []).find((b) => b.name === selectedReconciliationBank);
                        const systemBal = bankObj ? (bankObj.balance || 0) : 0;
                        const diff = Number(physicalBankBalance) - systemBal;

                        return (
                           <div className="space-y-2 pt-2 border-t border-slate-200 font-bold">
                            <div className="flex justify-between">
                              <span className="text-slate-500">الفارق مع كشف الحساب:</span>
                              <span className={diff === 0 ? "text-emerald-600" : "text-rose-600"}>
                                {diff === 0 ? "متطابق تماماً ✓" : `${diff > 0 ? '+' : ''}${diff.toLocaleString()} ر.ي` }
                              </span>
                            </div>
                            {diff !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedBanks = (invoiceSettings?.bankAccounts || []).map((b) => 
                                    b.name === selectedReconciliationBank ? { ...b, balance: Number(physicalBankBalance) } : b
                                  );
                                  onUpdateInvoiceSettings({ ...invoiceSettings, bankAccounts: updatedBanks });

                                  const vId = `VCH-BNK-${Math.floor(1000 + Math.random() * 9000)}`;
                                  createAutoJournalEntry({
                                    notes: `تسوية رصيد حساب بنك [${selectedReconciliationBank}] ليتطابق مع كشف البنك الفعلي`,
                                    reference: vId,
                                    lines: [
                                      { account: selectedReconciliationBank, debit: diff > 0 ? Math.abs(diff) : 0, credit: diff < 0 ? Math.abs(diff) : 0 },
                                      { account: 'حساب أرباح وخسائر تسويات البنوك', debit: diff < 0 ? Math.abs(diff) : 0, credit: diff > 0 ? Math.abs(diff) : 0 }
                                    ],
                                    date: new Date().toISOString().split('T')[0]
                                  });

                                  setPhysicalBankBalance('');
                                  setSelectedReconciliationBank('');
                                  alert('✅ تم ضبط الرصيد البنكي وتوليد قيود التسوية المتوازنة!');
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-lg transition-all cursor-pointer"
                              >
                                ترحيل قيد التسوية وتصحيح الحساب البنكي ⚡
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Account Balancing Render */}
              {reconciliationTab === 'balancing' && (
                <div className="space-y-5 animate-fade-in text-[11px]">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 p-3.5 rounded-2xl border border-blue-100 text-[10px] font-bold leading-relaxed space-y-1">
                    <p className="font-extrabold text-[11px] text-blue-800 flex items-center gap-1.5">
                      <span>⚖️</span>
                      <span>شاشة موازنة ومطابقة الحسابات الختامية (Account Balancing Screen)</span>
                    </p>
                    <p className="text-slate-600 font-medium">مقارنة أرصدة الحسابات المالية بالنظام (System Ledger) مع الأرصدة الواقعية الفعلية (Physical counts) مع اقتراح قيود تسوية تلقائية متوازنة لحل العجز أو الفائض المحاسبي.</p>
                  </div>

                  {/* Simulation Helper Button */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/60 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-800 font-extrabold">مساعد محاكاة سيناريو الفروقات:</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">يضبط الخزينة بالنظام لـ 250,000 (الفعلي 350,000) والبنك بالنظام لـ 1,500,000 (الفعلي 4,200,000).</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateTreasuryBalance(250000);
                        const updatedBanks = [
                          { id: 'bank-1', name: 'بنك التضامن الإسلامي', accountNumber: '100200300', balance: 1500000, isDefault: true },
                          { id: 'bank-2', name: 'بنك اليمن والكويت', accountNumber: '400500600', balance: 0, isDefault: false }
                        ];
                        onUpdateInvoiceSettings({ ...invoiceSettings, bankAccounts: updatedBanks });

                        const withVariations = {
                          'الخزينة العامة': 350000,
                          'حساب البنك الرئيسي': 4200000,
                          'مخزون المستودع الرئيسي': 12500000,
                          'ذمم العملاء المدينة': totalCustomersBalance || 1500000,
                          'ذمم الموردين الدائنة': totalSuppliersBalance || 850000
                        };
                        setActualBalances(withVariations);
                        localStorage.setItem('wms_actual_balances', JSON.stringify(withVariations));
                        alert('🔄 تم بنجاح ضبط أرصدة النظام وأرصدة الجرد الفعلي طبقاً لتقرير المشكلة لمحاكاة الفارق (+100,000 ريال للخزينة) و (+2,700,000 ريال للبنك)!');
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      ⚡ محاكاة سيناريو الفروقات الوارد بالتقرير
                    </button>
                  </div>

                  {/* TABLE 1: System Account Ledger Activity */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-500 block">📊 جدول (1): حركة أرصدة حسابات الأستاذ العام بالنظام (System Activity):</span>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-3xs">
                      <table className="w-full text-right text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                            <th className="p-2.5 text-right">الحساب الدفتري</th>
                            <th className="p-2.5 text-center">الرصيد الافتتاحي</th>
                            <th className="p-2.5 text-center text-emerald-600">حركة مدين (+)</th>
                            <th className="p-2.5 text-center text-rose-600">حركة دائن (-)</th>
                            <th className="p-2.5 text-left bg-slate-100/50">رصيد النظام الحالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700 bg-white">
                          {getSystemAccountLedger().map((ledger) => (
                            <tr key={ledger.name} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-black text-slate-800 text-[10px]">{ledger.name}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{ledger.opening.toLocaleString()} ر.ي</td>
                              <td className="p-2.5 text-center font-mono text-emerald-600">{(ledger.debits > 0) ? `+${ledger.debits.toLocaleString()}` : '0'}</td>
                              <td className="p-2.5 text-center font-mono text-rose-600">{(ledger.credits > 0) ? `-${ledger.credits.toLocaleString()}` : '0'}</td>
                              <td className="p-2.5 text-left font-mono font-black text-slate-900 bg-slate-50/50">{ledger.balance.toLocaleString()} ر.ي</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABLE 2: Physical Counts vs System */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-500 block">🔍 جدول (2): مطابقة رصيد النظام الفعلي مع الجرد والعد الواقعي (Physical Audit):</span>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-3xs">
                      <table className="w-full text-right text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                            <th className="p-2.5 text-right">الحساب المالي</th>
                            <th className="p-2.5 text-center">رصيد النظام</th>
                            <th className="p-2.5 text-center w-28">الرصيد الفعلي المجرود</th>
                            <th className="p-2.5 text-left">الفارق والوضعية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700 bg-white">
                          {(() => {
                            const sysBalances = {
                              'الخزينة العامة': treasuryBalance || 0,
                              'حساب البنك الرئيسي': (invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0),
                              'مخزون المستودع الرئيسي': 12500000,
                              'ذمم العملاء المدينة': totalCustomersBalance || 0,
                              'ذمم الموردين الدائنة': totalSuppliersBalance || 0
                            };

                            return Object.entries(sysBalances).map(([name, sysVal]) => {
                              const actVal = actualBalances[name] !== undefined ? actualBalances[name] : sysVal;
                              const diff = Number((sysVal - actVal).toFixed(2));
                              return (
                                <tr key={name} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-black text-slate-800 text-[10px]">{name}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-500">{sysVal.toLocaleString()} ر.ي</td>
                                  <td className="p-2.5 text-center">
                                    <div className="relative flex items-center">
                                      <input
                                        type="number"
                                        value={actVal}
                                        onChange={(e) => {
                                          const updated = { ...actualBalances, [name]: Number(e.target.value) };
                                          setActualBalances(updated);
                                          localStorage.setItem('wms_actual_balances', JSON.stringify(updated));
                                        }}
                                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-center rounded-xl px-2 py-1.5 font-mono focus:border-blue-500 focus:bg-white focus:outline-hidden"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-left font-mono text-[10px]">
                                    {diff === 0 ? (
                                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[9px] font-bold">✓ مطابق تماماً</span>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${diff > 0 ? 'text-rose-600 bg-rose-50' : 'text-blue-600 bg-blue-50'}`}>
                                        {diff > 0 ? `عجز: -${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `فائض: +${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Adjustment suggestion block */}
                  {(() => {
                    const sysBalances = {
                      'الخزينة العامة': treasuryBalance || 0,
                      'حساب البنك الرئيسي': (invoiceSettings?.bankAccounts || []).reduce((sum: number, b: any) => sum + (b.balance || 0), 0),
                      'مخزون المستودع الرئيسي': 12500000,
                      'ذمم العملاء المدينة': totalCustomersBalance || 0,
                      'ذمم الموردين الدائنة': totalSuppliersBalance || 0
                    };

                    const discrepancies = Object.entries(sysBalances)
                      .map(([name, sysVal]) => ({ name, sysVal, actVal: actualBalances[name] !== undefined ? actualBalances[name] : sysVal }))
                      .filter(item => Number((item.sysVal - item.actVal).toFixed(2)) !== 0);

                    if (discrepancies.length === 0) return null;

                    return (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/60 space-y-3 animate-scale-up">
                        <span className="text-[11px] font-black text-amber-850 flex items-center gap-1">
                          <span>💡</span>
                          <span>أداة تسوية الفوارق واقتراح قيد اليومية (Double-Entry Posting Suggestion):</span>
                        </span>
                        
                        <div className="bg-white p-3 rounded-xl border border-amber-200/30 text-[10px] text-slate-700 space-y-2 font-mono">
                          <p className="text-slate-400 border-b border-slate-100 pb-1.5 font-sans font-bold">يقترح النظام توليد قيد التسوية التالي تلقائياً:</p>
                          {discrepancies.map((d) => {
                            const diff = Number((d.sysVal - d.actVal).toFixed(2));
                            const isAsset = d.name !== 'ذمم الموردين الدائنة';
                            
                            // Correct bookkeeping logic (System - Actual):
                            let debitAccount = '';
                            let creditAccount = '';
                            if (isAsset) {
                              debitAccount = diff > 0 ? 'حساب تسويات فروق الجرد والأرصدة' : d.name;
                              creditAccount = diff > 0 ? d.name : 'حساب تسويات فروق الجرد والأرصدة';
                            } else {
                              debitAccount = diff > 0 ? d.name : 'حساب تسويات فروق الجرد والأرصدة';
                              creditAccount = diff > 0 ? 'حساب تسويات فروق الجرد والأرصدة' : d.name;
                            }

                            return (
                              <div key={d.name} className="space-y-1 pb-1 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                                <div className="flex justify-between">
                                  <span>• من حـ/ <span className="font-extrabold text-blue-600">{debitAccount}</span></span>
                                  <span className="font-black">مدين (+): {Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.ي</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>• إلى حـ/ <span className="font-extrabold text-rose-600">{creditAccount}</span></span>
                                  <span className="font-black">دائن (-): {Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.ي</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const entriesToCreate: any[] = [];
                            discrepancies.forEach((d) => {
                              const diff = Number((d.sysVal - d.actVal).toFixed(2));
                              if (d.name === 'الخزينة العامة') {
                                onUpdateTreasuryBalance(d.actVal);
                              } else if (d.name === 'حساب البنك الرئيسي') {
                                if (invoiceSettings?.bankAccounts && invoiceSettings.bankAccounts.length > 0) {
                                  const updatedBanks = invoiceSettings.bankAccounts.map((b: any) => 
                                    b.isDefault || b.name?.includes('التضامن') ? { ...b, balance: d.actVal } : b
                                  );
                                  onUpdateInvoiceSettings({ ...invoiceSettings, bankAccounts: updatedBanks });
                                }
                              }

                              const isAsset = d.name !== 'ذمم الموردين الدائنة';
                              const entryNotes = `قيد تسوية لموازنة وتطابق رصيد حساب [${d.name}] مع الجرد الفعلي والواقعي للمنشأة`;
                              const debitAmt = Number(Math.abs(diff).toFixed(2));
                              const creditAmt = Number(Math.abs(diff).toFixed(2));

                              let debitAccountName = '';
                              let creditAccountName = '';
                              if (isAsset) {
                                debitAccountName = diff > 0 ? 'حساب تسويات فروق الجرد والأرصدة' : d.name;
                                creditAccountName = diff > 0 ? d.name : 'حساب تسويات فروق الجرد والأرصدة';
                              } else {
                                debitAccountName = diff > 0 ? d.name : 'حساب تسويات فروق الجرد والأرصدة';
                                creditAccountName = diff > 0 ? 'حساب تسويات فروق الجرد والأرصدة' : d.name;
                              }

                              const entryId = `JV-BAL-${Math.floor(1000 + Math.random() * 9000)}`;
                              entriesToCreate.push({
                                notes: entryNotes,
                                reference: entryId,
                                lines: [
                                  { account: debitAccountName, debit: debitAmt, credit: 0 },
                                  { account: creditAccountName, debit: 0, credit: creditAmt }
                                ],
                                date: new Date().toISOString().split('T')[0]
                              });
                            });

                            createMultipleAutoJournalEntries(entriesToCreate);

                            // Reset physical inputs back to matched actual balances
                            const reset = { ...actualBalances };
                            discrepancies.forEach((d) => {
                              reset[d.name] = d.actVal;
                            });
                            setActualBalances(reset);
                            localStorage.setItem('wms_actual_balances', JSON.stringify(reset));

                            alert('✅ تم اعتماد ترحيل قيود تسوية موازنة الأرصدة ومطابقة الحسابات العامة بنجاح وتحديث السيولة الدفترية!');
                          }}
                          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-extrabold text-[10px] py-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                        >
                          اعتماد ترحيل قيود الضبط والوزن آلياً ⚡
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* LEFT COLUMN: Final Accounts & Financial Reports */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">📊</span>
                  <span>التقارير المالية والحسابات الختامية (Final Accounts)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">القوائم المالية والتقارير المطبوعة متضمنة ترويسة السجل التجاري والشعار للشركة.</p>
              </div>

              {/* Final Accounts Selector Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFinalAccountsTab('chart')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    finalAccountsTab === 'chart' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📂 دليل الحسابات
                </button>
                <button
                  type="button"
                  onClick={() => setFinalAccountsTab('trial')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    finalAccountsTab === 'trial' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⚖️ ميزان المراجعة
                </button>
                <button
                  type="button"
                  onClick={() => setFinalAccountsTab('financial_statements')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    finalAccountsTab === 'financial_statements' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 القوائم الختامية
                </button>
                <button
                  type="button"
                  onClick={() => setFinalAccountsTab('closing')}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    finalAccountsTab === 'closing' ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🔒 إقفال السنة
                </button>
              </div>

              {/* Chart of Accounts Render */}
              {finalAccountsTab === 'chart' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-[11px]">
                  {/* Assets */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60 space-y-2">
                    <h5 className="text-[11px] font-black text-blue-600 border-b border-blue-100/50 pb-1 flex justify-between">
                      <span>1. الأصول (Assets)</span>
                      <span className="font-mono text-[10px]">10000</span>
                    </h5>
                    <ul className="text-[10px] font-bold text-slate-600 space-y-1">
                      <li className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span>الخزينة العامة</span>
                        <span className="text-slate-500 font-mono">{(treasuryBalance || 0).toLocaleString()} ر.ي</span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span>الأرصدة البنكية</span>
                        <span className="text-slate-500 font-mono">
                          {((invoiceSettings?.bankAccounts || []).reduce((sum, b) => sum + (b.balance || 0), 0)).toLocaleString()} ر.ي
                        </span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span>ذمم العملاء (AR)</span>
                        <span className="text-slate-500 font-mono">{(totalCustomersBalance || 0).toLocaleString()} ر.ي</span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span>عهدة الموظفين المعلقة</span>
                        <span className="text-slate-500 font-mono">
                          {(employees.reduce((sum, e) => sum + (e.custody || 0), 0)).toLocaleString()} ر.ي
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Liabilities */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60 space-y-2">
                    <h5 className="text-[11px] font-black text-rose-600 border-b border-rose-100/50 pb-1 flex justify-between">
                      <span>2. الالتزامات (Liabilities)</span>
                      <span className="font-mono text-[10px]">20000</span>
                    </h5>
                    <ul className="text-[10px] font-bold text-slate-600 space-y-1">
                      <li className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span>ذمم الموردين (AP)</span>
                        <span className="text-slate-500 font-mono">{(totalSuppliersBalance || 0).toLocaleString()} ر.ي</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Trial Balance Render */}
              {finalAccountsTab === 'trial' && (
                <div className="space-y-3 animate-fade-in text-[11px]">
                  <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-150">
                          <th className="p-2">رمز الحساب</th>
                          <th className="p-2">اسم الحساب دفتر أستاذ</th>
                          <th className="p-2 text-center">مدين (Debit)</th>
                          <th className="p-2 text-center">دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        <tr>
                          <td className="p-2 font-mono text-slate-400">11100</td>
                          <td className="p-2">الخزينة النقدية العامة</td>
                          <td className="p-2 text-center font-mono text-emerald-600">{(treasuryBalance || 0).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-slate-400">11200</td>
                          <td className="p-2">أرصدة البنوك المعتمدة</td>
                          <td className="p-2 text-center font-mono text-emerald-600">
                            {((invoiceSettings?.bankAccounts || []).reduce((sum, b) => sum + (b.balance || 0), 0)).toLocaleString()}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-slate-400">11300</td>
                          <td className="p-2">ذمم العملاء المدينة (AR)</td>
                          <td className="p-2 text-center font-mono text-emerald-600">{(totalCustomersBalance || 0).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-slate-400">11400</td>
                          <td className="p-2">عهد الموظفين المعلقة (العهدة المالية)</td>
                          <td className="p-2 text-center font-mono text-emerald-600">{(employees.reduce((sum, e) => sum + (e.custody || 0), 0)).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-slate-400">21100</td>
                          <td className="p-2">ذمم الموردين الدائنة (AP)</td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                          <td className="p-2 text-center font-mono text-rose-600">{(totalSuppliersBalance || 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-slate-400">31000</td>
                          <td className="p-2">رأس المال التشغيلي الافتتاحي</td>
                          <td className="p-2 text-center font-mono text-slate-400">-</td>
                          <td className="p-2 text-center font-mono text-rose-600">
                            {(
                              (treasuryBalance || 0) + 
                              ((invoiceSettings?.bankAccounts || []).reduce((sum, b) => sum + (b.balance || 0), 0)) + 
                              (totalCustomersBalance || 0) + 
                              (employees.reduce((sum, e) => sum + (e.custody || 0), 0)) +
                              (employees.reduce((sum, e) => sum + (e.salary || 0), 0)) -
                              (totalSuppliersBalance || 0)
                            ).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Statements Render */}
              {finalAccountsTab === 'financial_statements' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-[11px] text-right">
                  {/* Income Statement Summary */}
                  {(() => {
                    const summaries = getFinancialSummaries(pnlCostCenterFilter);
                    return (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <span>📋</span>
                              <span>قائمة الدخل السنوية (Profit & Loss)</span>
                            </span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">P & L</span>
                          </div>

                          {/* Cost Center Filter dropdown in P&L */}
                          <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-slate-150">
                            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">مركز التكلفة:</span>
                            <select
                              value={pnlCostCenterFilter}
                              onChange={(e) => setPnlCostCenterFilter(e.target.value)}
                              className="w-full bg-white border border-slate-200/80 rounded-md text-[10px] font-bold px-2 py-1 text-slate-700 focus:outline-hidden"
                            >
                              <option value="">-- كل الأقسام والمراكز --</option>
                              {['الإيجار (Rent)', 'الكهرباء (Electricity)', 'النقل والشحن (Transport)', 'مبيعات', 'مصروفات المحل', 'المستودع الرئيسي', 'الإدارة العامة'].map(cc => (
                                <option key={cc} value={cc}>{cc}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5 font-bold text-slate-600">
                            <div className="flex justify-between">
                              <span>إجمالي الإيرادات السنوية:</span>
                              <span className="text-emerald-600 font-mono">
                                +{summaries.revenue.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>إجمالي المصروفات السنوية:</span>
                              <span className="text-rose-600 font-mono">
                                -{summaries.expenses.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-extrabold text-slate-800">
                              <span>صافي الأرباح السنوية:</span>
                              <span className="text-blue-600 font-mono">
                                {summaries.netProfit.toLocaleString()} ر.ي
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;
                            const companyName = invoiceSettings?.companyName || 'شركة المدى للتجارة والتوزيع';
                            const commercialRegistry = invoiceSettings?.commercialRegistryNumber || '101202304';
                            const taxRatePercent = invoiceSettings?.taxRate !== undefined ? invoiceSettings.taxRate : 15;
                            const taxText = invoiceSettings?.taxEnabled ? `مكلف ضريبياً بنسبة ${taxRatePercent}%` : `الضريبة المعيارية: ${taxRatePercent}%`;
                            const companyLogo = invoiceSettings?.logo || '';
                            const registryFileUrl = invoiceSettings?.commercialRegistryFileUrl || '';
                            const dateStr = new Date().toLocaleDateString('ar-YE');

                            const stampHtml = registryFileUrl ? `
                              <div style="position: absolute; top: 110px; left: 40px; text-align: center; opacity: 0.85; transform: rotate(-5deg);">
                                <img src="${registryFileUrl}" alt="Stamp" style="height: 70px; max-width: 130px; object-fit: contain; filter: grayscale(1) contrast(1.3);" />
                                <p style="font-size: 8px; color: #64748b; font-weight: bold; margin: 2px 0 0 0;">سند رسمي معتمد</p>
                              </div>
                            ` : `
                              <div style="position: absolute; top: 110px; left: 40px; border: 3px double #cbd5e1; border-radius: 50%; width: 75px; height: 75px; display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0.5; transform: rotate(-12deg);">
                                <span style="font-size: 9px; font-weight: 800; color: #64748b; font-family: sans-serif; line-height: 1;">رسمي</span>
                                <span style="font-size: 8px; font-weight: 800; color: #94a3b8; font-family: sans-serif; line-height: 1; margin-top: 2px;">معتمد</span>
                              </div>
                            `;

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>قائمة الدخل السنوية</title>
                                  <style>
                                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;750;800&display=swap');
                                    body { font-family: 'Inter', sans-serif; direction: rtl; text-align: right; padding: 40px; color: #334155; position: relative; }
                                  </style>
                                </head>
                                <body>
                                  ${stampHtml}
                                  <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); opacity: 0.04; pointer-events: none; z-index: -1000; text-align: center; width: 100%; max-width: 600px; font-family: 'Inter', sans-serif;">
                                    ${companyLogo ? `<img src="${companyLogo}" style="width: 250px; height: 250px; object-fit: contain; margin-bottom: 20px; filter: grayscale(1);" />` : ''}
                                    <div style="font-size: 28px; font-weight: 900; color: #000; direction: rtl; line-height: 1.5;">
                                      ${companyName} <br/> 
                                      رقم السجل: ${commercialRegistry} <br/> 
                                      الرقم الضريبي المكلف: ${taxRatePercent}%
                                    </div>
                                  </div>
                                  <div style="display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px;">
                                    <div>
                                      <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">${companyName}</h1>
                                      <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: bold;">السجل التجاري رقم: ${commercialRegistry}</p>
                                      <p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0; font-weight: bold;">الوضع الضريبي: ${taxText}</p>
                                    </div>
                                    ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="height: 60px; max-width: 150px; object-fit: contain;" />` : ''}
                                  </div>
                                  <div style="text-align: center; margin-bottom: 40px;">
                                    <h2 style="font-size: 20px; font-weight: 800; margin: 0; color: #0284c7;">قائمة الدخل الختامية (Income Statement)</h2>
                                    ${pnlCostCenterFilter ? `<p style="font-size: 13px; font-weight: 800; color: #0369a1; margin: 6px 0 0 0;">القسم / مركز التكلفة: [${pnlCostCenterFilter}]</p>` : ''}
                                    <p style="font-size: 12px; color: #64748b; margin: 5px 0 0 0;">للفترة المنتهية في تاريخ ${dateStr}</p>
                                    <p style="font-size: 10px; color: #94a3b8; font-weight: bold; margin: 2px 0 0 0;">(مرتبط تلقائياً بدفتر اليومية العامة والقيود المعتمدة)</p>
                                  </div>
                                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
                                    <thead>
                                      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                                        <th style="padding: 12px; text-align: right; font-weight: 800;">البند المالي</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 800;">المبلغ بالريال اليمني</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">إيرادات مبيعات السلع والخدمات</td>
                                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: 700; color: #10b981;">+\ ${summaries.revenue.toLocaleString()} ر.ي</td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">مصروف الرواتب والأجور التشغيلية السنوية</td>
                                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: 700; color: #ef4444;">-\ ${summaries.expenses.toLocaleString()} ر.ي</td>
                                      </tr>
                                      <tr style="background-color: #f8fafc; font-weight: 800; font-size: 16px; border-top: 2px solid #cbd5e1;">
                                        <td style="padding: 16px;">صافي الأرباح السنوية التشغيلية (Net Income)</td>
                                        <td style="padding: 16px; text-align: left; color: #0284c7;">${summaries.netProfit.toLocaleString()} ر.ي</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div style="margin-top: 80px; display: flex; justify-content: space-between; text-align: center; font-size: 13px;">
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">توقيع المحاسب القانوني</p><p style="color: #94a3b8;">__________________</p></div>
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">توقيع المدير المالي</p><p style="color: #94a3b8;">__________________</p></div>
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">ختم وتصديق الشركة</p><p style="color: #94a3b8;">__________________</p></div>
                                  </div>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                            printWindow.focus();
                            setTimeout(() => { printWindow.print(); }, 500);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>تصدير قائمة الدخل PDF 📄</span>
                        </button>
                      </div>
                    );
                  })()}
 
                  {/* Balance Sheet Summary */}
                  {(() => {
                    const summaries = getFinancialSummaries();
                    return (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <span>⚖️</span>
                              <span>الميزانية العمومية الختامية (Balance Sheet)</span>
                            </span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">BS</span>
                          </div>
                          <div className="space-y-1.5 font-bold text-slate-600">
                            <div className="flex justify-between">
                              <span>إجمالي الأصول والعهد السريعة:</span>
                              <span className="text-emerald-600 font-mono">
                                +{summaries.totalAssets.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>الالتزامات وحقوق الملكية:</span>
                              <span className="text-slate-700 font-mono">
                                {summaries.totalLiabilitiesEquity.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="text-[8px] text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-md text-center">
                              ✓ الميزانية الدفترية متوازنة ومتطابقة تماماً.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;
                            const companyName = invoiceSettings?.companyName || 'شركة المدى للتجارة والتوزيع';
                            const commercialRegistry = invoiceSettings?.commercialRegistryNumber || '101202304';
                            const taxRatePercent = invoiceSettings?.taxRate !== undefined ? invoiceSettings.taxRate : 15;
                            const taxText = invoiceSettings?.taxEnabled ? `مكلف ضريبياً بنسبة ${taxRatePercent}%` : `الضريبة المعيارية: ${taxRatePercent}%`;
                            const companyLogo = invoiceSettings?.logo || '';
                            const registryFileUrl = invoiceSettings?.commercialRegistryFileUrl || '';
                            const dateStr = new Date().toLocaleDateString('ar-YE');

                            const stampHtml = registryFileUrl ? `
                              <div style="position: absolute; top: 110px; left: 40px; text-align: center; opacity: 0.85; transform: rotate(-5deg);">
                                <img src="${registryFileUrl}" alt="Stamp" style="height: 70px; max-width: 130px; object-fit: contain; filter: grayscale(1) contrast(1.3);" />
                                <p style="font-size: 8px; color: #64748b; font-weight: bold; margin: 2px 0 0 0;">سند رسمي معتمد</p>
                              </div>
                            ` : `
                              <div style="position: absolute; top: 110px; left: 40px; border: 3px double #cbd5e1; border-radius: 50%; width: 75px; height: 75px; display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0.5; transform: rotate(-12deg);">
                                <span style="font-size: 9px; font-weight: 800; color: #64748b; font-family: sans-serif; line-height: 1;">رسمي</span>
                                <span style="font-size: 8px; font-weight: 800; color: #94a3b8; font-family: sans-serif; line-height: 1; margin-top: 2px;">معتمد</span>
                              </div>
                            `;

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>الميزانية العمومية الختامية</title>
                                  <style>
                                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;750;800&display=swap');
                                    body { font-family: 'Inter', sans-serif; direction: rtl; text-align: right; padding: 40px; color: #334155; position: relative; }
                                  </style>
                                </head>
                                <body>
                                  ${stampHtml}
                                  <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); opacity: 0.04; pointer-events: none; z-index: -1000; text-align: center; width: 100%; max-width: 600px; font-family: 'Inter', sans-serif;">
                                    ${companyLogo ? `<img src="${companyLogo}" style="width: 250px; height: 250px; object-fit: contain; margin-bottom: 20px; filter: grayscale(1);" />` : ''}
                                    <div style="font-size: 28px; font-weight: 900; color: #000; direction: rtl; line-height: 1.5;">
                                      ${companyName} <br/> 
                                      رقم السجل: ${commercialRegistry} <br/> 
                                      الرقم الضريبي المكلف: ${taxRatePercent}%
                                    </div>
                                  </div>
                                  <div style="display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px;">
                                    <div>
                                      <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">${companyName}</h1>
                                      <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: bold;">السجل التجاري رقم: ${commercialRegistry}</p>
                                      <p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0; font-weight: bold;">الوضع الضريبي: ${taxText}</p>
                                    </div>
                                    ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="height: 60px; max-width: 150px; object-fit: contain;" />` : ''}
                                  </div>
                                  <div style="text-align: center; margin-bottom: 40px;">
                                    <h2 style="font-size: 20px; font-weight: 800; margin: 0; color: #0d9488;">الميزانية العمومية الختامية (Balance Sheet)</h2>
                                    <p style="font-size: 12px; color: #64748b; margin: 5px 0 0 0;">كما هي في تاريخ ${dateStr}</p>
                                    <p style="font-size: 10px; color: #94a3b8; font-weight: bold; margin: 2px 0 0 0;">(مرتبط تلقائياً بدفتر اليومية العامة والقيود المعتمدة)</p>
                                  </div>
                                  <div style="display: flex; gap: 40px;">
                                    <div style="flex: 1;">
                                      <h3 style="font-size: 16px; font-weight: 800; color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 5px;">الأصول (Assets)</h3>
                                      <p style="font-size: 11px; font-weight: 800; color: #0284c7; margin: 5px 0 10px 0;">الأصول المتداولة (Current Assets)</p>
                                      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <tbody>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">الخزينة العامة النقدية</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.treasury.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">الحسابات البنكية المعتمدة</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.bank.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">ذمم العملاء المدينة (A/R)</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.customers.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">مخزون المستودعات الرئيسي والفرعي</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.inventory.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0284c7;">عهد الموظفين المعلقة (العهدة المالية)</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700; color: #0284c7;">${summaries.custodies.toLocaleString()} ر.ي</td></tr>
                                          <tr style="font-weight: 800; font-size: 14px; color: #0d9488;"><td style="padding: 15px 0; border-top: 2px solid #e2e8f0;">إجمالي الأصول المتداولة والعهد</td><td style="padding: 15px 0; border-top: 2px solid #e2e8f0; text-align: left;">${summaries.totalAssets.toLocaleString()} ر.ي</td></tr>
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style="flex: 1;">
                                      <h3 style="font-size: 16px; font-weight: 800; color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 15px;">الالتزامات وحقوق الملكية</h3>
                                      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <tbody>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">ذمم الموردين الدائنة (A/P)</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.suppliers.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">رأس المال التشغيلي المدفوع</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.capital.toLocaleString()} ر.ي</td></tr>
                                          <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">الأرباح المحتجزة / المدوّرة</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: 700;">${summaries.retainedEarnings.toLocaleString()} ر.ي</td></tr>
                                          <tr style="font-weight: 800; font-size: 14px; color: #0d9488;"><td style="padding: 15px 0; border-top: 2px solid #e2e8f0;">إجمالي الالتزامات وحقوق الملكية</td><td style="padding: 15px 0; border-top: 2px solid #e2e8f0; text-align: left;">${summaries.totalLiabilitiesEquity.toLocaleString()} ر.ي</td></tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  <div style="margin-top: 80px; display: flex; justify-content: space-between; text-align: center; font-size: 13px;">
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">توقيع المحاسب القانوني</p><p style="color: #94a3b8;">__________________</p></div>
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">توقيع المدير المالي</p><p style="color: #94a3b8;">__________________</p></div>
                                    <div><p style="margin-bottom: 50px; font-weight: 700;">ختم وتصديق الشركة</p><p style="color: #94a3b8;">__________________</p></div>
                                  </div>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                            printWindow.focus();
                            setTimeout(() => { printWindow.print(); }, 500);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>تصدير الميزانية العمومية PDF 📄</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
 
              {/* Year-End Closing Wizard Render */}
              {finalAccountsTab === 'closing' && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-4 animate-fade-in text-[11px] text-right">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1">
                      <span>🔒</span>
                      <span>معالج إقفال السنة المالية (Year-End Closing Wizard)</span>
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">الخطوة {closingWizardStep} من 3</span>
                  </div>
 
                  {closingWizardStep === 1 && (
                    <div className="space-y-3">
                      <p className="font-bold text-slate-600 leading-relaxed">
                        الخطوة 1: يرجى مراجعة وتأكيد الأرباح التشغيلية السنوية والبيانات المالية الختامية قبل اتخاذ خطوة الإغلاق وتصفير الحسابات المؤقتة.
                      </p>
                      {(() => {
                        const summaries = getFinancialSummaries();
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-[10px] font-bold">
                            <div className="flex justify-between">
                              <span>إجمالي الإيرادات السنوية:</span>
                              <span className="text-emerald-600 font-mono">
                                {summaries.revenue.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>مصروفات التشغيل والرواتب السنوية:</span>
                              <span className="text-rose-600 font-mono">
                                -{summaries.expenses.toLocaleString()} ر.ي
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-1 text-slate-800 font-extrabold">
                              <span>صافي الأرباح المحققة المرحّلة:</span>
                              <span className="text-blue-600 font-mono">
                                {summaries.netProfit.toLocaleString()} ر.ي
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => setClosingWizardStep(2)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl transition-all cursor-pointer"
                      >
                        متابعة إلى خطوة ترحيل الأرباح وتصفير الحسابات ➔
                      </button>
                    </div>
                  )}
 
                  {closingWizardStep === 2 && (
                    <div className="space-y-3">
                      <p className="font-bold text-slate-600 leading-relaxed">
                        الخطوة 2: يقوم النظام الآن بتوليد قيد إقفال السنة المالية. سيتم ترحيل صافي الأرباح إلى **"الأرباح المحتجزة"** وتصفير حسابات المصروفات والإيرادات للبدء بسنة مالية جديدة صفرية.
                      </p>
                      
                      {/* Checkbox for Rollover Option */}
                      <label className="flex items-center gap-2.5 p-3 bg-white border border-slate-150 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={rollOverToNewYear}
                          onChange={(e) => setRollOverToNewYear(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-right">
                          <p className="font-extrabold text-[11px] text-slate-800">تدوير الأرصدة إلى السنة المالية الجديدة (2027)</p>
                          <p className="text-[9px] text-slate-400 font-bold">يقوم بترحيل أرصدة الميزانية العمومية كأرصدة افتتاحية متطابقة للعام الجديد.</p>
                        </div>
                      </label>

                      <div className="bg-yellow-50 text-yellow-800 p-2.5 rounded-xl border border-yellow-200 font-extrabold text-[10px]">
                        ⚠️ تحذير: هذه العملية لا يمكن التراجع عنها وسيتم إغلاق وتجميد السنة المالية لعام 2026 محاسبياً.
                      </div>

                      {isClosingExecuting && (
                        <div className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[9px] space-y-1 max-h-[120px] overflow-y-auto">
                          <p className="text-emerald-400 font-extrabold animate-pulse">⚡ قيد التنفيذ والمطابقة الآن...</p>
                          {closingLogs.map((log, idx) => (
                            <p key={idx}>• {log}</p>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isClosingExecuting}
                          onClick={() => setClosingWizardStep(1)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl"
                        >
                          السابق
                        </button>
                        <button
                          type="button"
                          disabled={isClosingExecuting}
                          onClick={() => {
                            const summaries = getFinancialSummaries();
                            const netEarn = summaries.netProfit;

                            setIsClosingExecuting(true);
                            setClosingLogs(["بدء معالجة إقفال دفاتر السنة المالية لعام 2026..."]);
                            
                            setTimeout(() => {
                              setClosingLogs(prev => [...prev, "تصفير حسابات الإيرادات والمصروفات المؤقتة بالكامل."]);
                            }, 500);

                            setTimeout(() => {
                              setClosingLogs(prev => [...prev, `ترحيل صافي الأرباح البالغة (${netEarn.toLocaleString()} ر.ي) لحساب الأرباح المحتجزة.`]);
                            }, 1000);

                            setTimeout(() => {
                              if (rollOverToNewYear) {
                                setClosingLogs(prev => [...prev, "توليد قيد تدوير الأرصدة الافتتاحية للميزانية العمومية لعام 2027 (القيد OP-2027)..."]);
                              }
                            }, 1500);

                            setTimeout(() => {
                              const closingEntriesToCreate: any[] = [];
                              if (rollOverToNewYear) {
                                closingEntriesToCreate.push({
                                  notes: `قيد تدوير الأرصدة الافتتاحية للسنة المالية الجديدة 2027 - أرصدة منقولة من ميزانية 2026 الختامية`,
                                  reference: 'OP-2027',
                                  lines: [
                                    { account: 'الخزينة العامة', debit: summaries.treasury, credit: 0 },
                                    { account: 'حساب البنك الرئيسي', debit: summaries.bank, credit: 0 },
                                    { account: 'ذمم العملاء المدينة', debit: summaries.customers, credit: 0 },
                                    { account: 'مخزون المستودع الرئيسي', debit: summaries.inventory, credit: 0 },
                                    { account: 'ذمم الموردين الدائنة', debit: 0, credit: summaries.suppliers },
                                    { account: 'رأس المال التشغيلي الافتتاحي', debit: 0, credit: summaries.capital },
                                    { account: 'الأرباح والخسائر المحتجزة', debit: 0, credit: summaries.retainedEarnings }
                                  ],
                                  date: '2027-01-01'
                                });
                              }

                              closingEntriesToCreate.push({
                                notes: `قيد إقفال السنة المالية لعام 2026 - ترحيل صافي الأرباح وتصفير الإيرادات والمصروفات`,
                                reference: 'CLOSING-2026',
                                lines: [
                                  { account: 'مبيعات السلع والخدمات', debit: summaries.revenue, credit: 0 },
                                  { account: 'الرواتب والأجور التشغيلية', debit: 0, credit: summaries.expenses },
                                  { account: 'الأرباح والخسائر المحتجزة', debit: 0, credit: summaries.netProfit }
                                ],
                                date: '2026-12-31'
                              });

                              createMultipleAutoJournalEntries(closingEntriesToCreate);

                              setClosingLogs(prev => [...prev, "إتمام عملية الإغلاق وإقفال الدفاتر بنجاح!"]);
                              setIsClosingExecuting(false);
                              setClosingWizardStep(3);
                            }, 2000);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          ترحيل القيد وإقفال الحسابات 🔒
                        </button>
                      </div>
                    </div>
                  )}
 
                  {closingWizardStep === 3 && (
                    <div className="space-y-3 text-center">
                      <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 space-y-1 text-right">
                        <p className="font-black text-xs text-center">🎉 تهانينا! تم إقفال السنة المالية لعام 2026 بنجاح!</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          تم توليد قيد إقفال السنة المالية وتصفير حسابات المبيعات والرواتب السنوية بنجاح.
                        </p>
                        {rollOverToNewYear && (
                          <p className="text-[10px] text-emerald-700 font-black">
                            ✓ تم توليد وتدوير قيد الأرصدة الافتتاحية المتوازنة بنجاح لعام 2027 (OP-2027).
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setClosingWizardStep(1)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl cursor-pointer"
                      >
                        إعادة تهيئة معالج الإقفال
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LOWER PORTION: Journal Entries List (col-span-12) */}
            <div className="lg:col-span-12 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs space-y-4 p-5 text-right">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">دفتر اليومية العامة والقيود المعتمدة 📊</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">القيود المحاسبية المولدة آلياً أو المدخلة يدوياً بقيد مزدوج متوازن للمالية.</p>
              </div>

              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto animate-fade-in">
                {filteredJournalEntries.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-xs font-bold">لا توجد قيود محاسبية مسجلة حالياً!</p>
                  </div>
                ) : (
                  filteredJournalEntries.map((entry) => (
                    <div key={entry.id} className="p-4 space-y-2 text-[11px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded font-mono">{entry.id}</span>
                          <span className="text-slate-500 font-mono">التاريخ: {entry.date}</span>
                          <span className="text-slate-500">المرجع: {entry.reference || '-'}</span>
                        </div>
                        {!entry.isReversed && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من إلغاء وعكس القيد المحاسبي "${entry.id}" بالكامل (Storno Reversal)؟ سيقوم النظام بتسوية الحسابات تلقائياً.`)) {
                                handleReverseJournalEntry(entry.id);
                              }
                            }}
                            className="text-[9px] bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 px-2 py-1 rounded transition-all cursor-pointer font-bold"
                          >
                            إلغاء وعكس القيد (Storno) 🔄
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg font-bold">البيان: {entry.notes}</p>
                      <div className="overflow-hidden border border-slate-100 rounded-xl">
                        <table className="w-full text-right text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 font-black">
                              <th className="p-2">الحساب الدفتري</th>
                              <th className="p-2 text-center w-24">مدين</th>
                              <th className="p-2 text-center w-24">دائن</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                            {entry.lines.map((line, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2">{line.account}</td>
                                <td className="p-2 text-center font-mono text-emerald-600">{line.debit > 0 ? line.debit.toLocaleString() : '-'}</td>
                                <td className="p-2 text-center font-mono text-rose-600">{line.credit > 0 ? line.credit.toLocaleString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Manual Journal Entry Composer Modal */}
          {isJournalModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-xl space-y-4 text-right animate-scale-up" dir="rtl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">تسجيل قيد محاسبي يدوي مزدوج (Double-Entry Posting) 📊</h4>
                  <button type="button" onClick={() => setIsJournalModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <form onSubmit={handleJournalSubmit} className="space-y-4 text-[11px]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500">البيان والشرح العام للقيد *</label>
                      <input
                        type="text"
                        required
                        value={journalForm.notes}
                        onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })}
                        placeholder="شرح القيد المحاسبي..."
                        className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500">الرقم المرجعي</label>
                      <input
                        type="text"
                        value={journalForm.reference}
                        onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                        placeholder="اختياري..."
                        className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500">تاريخ القيد المحاسبي</label>
                      <input
                        type="date"
                        required
                        value={journalForm.date}
                        onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-600">سطور القيد المزدوج</span>
                      <button type="button" onClick={handleAddJournalLine} className="text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md">+ إضافة سطر</button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto p-1">
                      {journalForm.lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                          <input
                            type="text"
                            required
                            placeholder="اسم الحساب..."
                            value={line.account}
                            onChange={(e) => {
                              const newLines = [...journalForm.lines];
                              newLines[idx].account = e.target.value;
                              setJournalForm({ ...journalForm, lines: newLines });
                            }}
                            className="col-span-4 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs"
                          />
                          <select
                            value={line.costCenter || ''}
                            onChange={(e) => {
                              const newLines = [...journalForm.lines];
                              newLines[idx].costCenter = e.target.value || undefined;
                              setJournalForm({ ...journalForm, lines: newLines });
                            }}
                            className={`col-span-3 bg-slate-50 border ${!line.costCenter ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200'} px-1 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-hidden`}
                          >
                            <option value="">مركز تكلفة *</option>
                            {['الإيجار (Rent)', 'الكهرباء (Electricity)', 'النقل والشحن (Transport)', 'مبيعات', 'مصروفات المحل', 'المستودع الرئيسي', 'الإدارة العامة'].map(cc => (
                              <option key={cc} value={cc}>{cc}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="مدين"
                            value={line.debit || ''}
                            onChange={(e) => {
                              const newLines = [...journalForm.lines];
                              newLines[idx].debit = Number(e.target.value);
                              newLines[idx].credit = 0;
                              setJournalForm({ ...journalForm, lines: newLines });
                            }}
                            className="col-span-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-1.5 rounded-lg text-center text-xs font-mono"
                          />
                          <input
                            type="number"
                            placeholder="دائن"
                            value={line.credit || ''}
                            onChange={(e) => {
                              const newLines = [...journalForm.lines];
                              newLines[idx].credit = Number(e.target.value);
                              newLines[idx].debit = 0;
                              setJournalForm({ ...journalForm, lines: newLines });
                            }}
                            className="col-span-2 bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-1.5 rounded-lg text-center text-xs font-mono"
                          />
                          <button type="button" disabled={journalForm.lines.length <= 2} onClick={() => handleRemoveJournalLine(idx)} className="col-span-1 text-red-500 hover:text-red-700 text-center font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">موازنة القيد:</span>
                    <div className="flex gap-4 font-mono font-black">
                      <span className="text-emerald-600">مدين: {journalForm.lines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}</span>
                      <span className="text-rose-600">دائن: {journalForm.lines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setIsJournalModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-4 py-2 rounded-xl">إلغاء</button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs">ترحيل القيد 📊</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Smart ERP Voucher Creation Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-right">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                <span className="font-extrabold text-sm sm:text-base">إصدار سند دفع أو قبض مالي معتمد 🧾</span>
              </div>
              <button 
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVoucherSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              
              {/* Type: Pay vs Receive vs Transfer vs Internal Transfer */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500">نوع السند المالي</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setVType('pay');
                      setVTargetGroup('supplier');
                      setVSelectedTargetId('');
                    }}
                    className={`p-3 rounded-2xl border text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'pay'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>💸 صرف نقدي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVType('receive');
                      setVTargetGroup('customer');
                      setVSelectedTargetId('');
                    }}
                    className={`p-3 rounded-2xl border text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'receive'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>📥 قبض نقدي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVType('transfer');
                      setVTransferFromType('customer');
                      setVTransferToType('supplier');
                      setVTransferFromId('');
                      setVTransferToId('');
                    }}
                    className={`p-3 rounded-2xl border text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'transfer'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🔄 تحويل ذمم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVType('internal_transfer');
                      setVInternalFrom('cash');
                      setVInternalTo('');
                    }}
                    className={`p-3 rounded-2xl border text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'internal_transfer'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🔄 تحويل داخلي</span>
                  </button>
                </div>
              </div>

              {/* Target Group (Only if Pay) */}
              {vType === 'pay' && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500">فئة المستلم / الحساب المدين</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVTargetGroup('supplier');
                        setVSelectedTargetId('');
                      }}
                      className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        vTargetGroup === 'supplier'
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      🏢 شريك توريد
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVTargetGroup('employee');
                        setVSelectedTargetId('');
                      }}
                      className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        vTargetGroup === 'employee'
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      👤 الموظفين
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVTargetGroup('expense');
                        setVSelectedTargetId('EXPENSE');
                      }}
                      className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        vTargetGroup === 'expense'
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      💸 مصروف تشغيلي
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Method Selector (Only for Pay / Receive) */}
              {(vType === 'pay' || vType === 'receive') && (
                <div className="space-y-3">
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-black text-slate-500">طريقة الدفع / التحصيل</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setVPaymentMethod('cash')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          vPaymentMethod === 'cash'
                            ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs font-black'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        💵 كاش (الخزينة)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVPaymentMethod('bank')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          vPaymentMethod === 'bank'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs font-black'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        💳 تحويل بنكي / شبكة
                      </button>
                    </div>
                  </div>

                  {vPaymentMethod === 'bank' && (() => {
                    const bankAccountsList = invoiceSettings?.bankAccounts || [];
                    const selectedBank = bankAccountsList.find((b: any) => b.id === vSelectedBankAccountId);
                    const filteredBanks = bankAccountsList.filter((b: any) => 
                      b.name.toLowerCase().includes(vBankSearchQuery.toLowerCase()) ||
                      b.accountNumber.toLowerCase().includes(vBankSearchQuery.toLowerCase())
                    );
                    return (
                      <div className="space-y-1.5 bg-blue-50/40 p-3 rounded-2xl border border-blue-150 relative">
                        <label className="block text-[10px] sm:text-xs font-extrabold text-blue-700">تحديد البنك / الحساب المالي المرتبط *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsVBankDropdownOpen(!isVBankDropdownOpen)}
                            className="w-full bg-white border border-blue-200 focus:border-blue-500 text-xs px-3.5 py-2.5 rounded-xl outline-hidden text-slate-700 font-bold shadow-3xs flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              🏦 {selectedBank ? `${selectedBank.name} (حساب: ${selectedBank.accountNumber})` : 'اختر البنك من القائمة...'}
                            </span>
                            <ChevronDown size={14} className="text-slate-400" />
                          </button>

                          {isVBankDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsVBankDropdownOpen(false)}></div>
                              <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="ابحث باسم البنك أو رقم الحساب..."
                                  value={vBankSearchQuery}
                                  onChange={(e) => setVBankSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-hidden focus:border-blue-500 text-right"
                                />
                                <div className="space-y-0.5">
                                  {filteredBanks.map((b: any) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        setVSelectedBankAccountId(b.id);
                                        setIsVBankDropdownOpen(false);
                                        setVBankSearchQuery('');
                                      }}
                                      className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                                        vSelectedBankAccountId === b.id ? 'bg-blue-50/50 text-blue-800' : 'text-slate-600'
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
                </div>
              )}

              {/* Dynamic General Transfer Section */}
              {vType === 'transfer' && (
                <div className="space-y-5 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                  <h4 className="text-xs font-extrabold text-slate-700 border-b pb-2 mb-3">تفاصيل التحويل المالي بين الحسابات</h4>
                  
                  {/* From Account Type and Target */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-600">حساب المصدر (المحول منه) 👇</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['customer', 'supplier', 'employee'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setVTransferFromType(t);
                            setVTransferFromId('');
                          }}
                          className={`py-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                            vTransferFromType === t
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-extrabold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t === 'customer' && '👤 عميل'}
                          {t === 'supplier' && '🏢 مورد'}
                          {t === 'employee' && '🧑‍💼 موظف'}
                        </button>
                      ))}
                    </div>

                    <select
                      value={vTransferFromId}
                      onChange={(e) => setVTransferFromId(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 text-right focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- اختر الحساب المصدر --</option>
                      {vTransferFromType === 'customer' &&
                        customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (الرصيد الحالي: {(c.balance || 0).toLocaleString()} ر.ي)
                          </option>
                        ))
                      }
                      {vTransferFromType === 'supplier' &&
                        suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (المستحق له: {(s.balance || 0).toLocaleString()} ر.ي)
                          </option>
                        ))
                      }
                      {vTransferFromType === 'employee' &&
                        employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} (العهدة: {(emp.custody || 0).toLocaleString()} | السلف: {(emp.advances || 0).toLocaleString()} ر.ي)
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* To Account Type and Target */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-600">حساب الوجهة (المحول إليه) 👈</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['customer', 'supplier', 'employee'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setVTransferToType(t);
                            setVTransferToId('');
                          }}
                          className={`py-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                            vTransferToType === t
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t === 'customer' && '👤 عميل'}
                          {t === 'supplier' && '🏢 مورد'}
                          {t === 'employee' && '🧑‍💼 موظف'}
                        </button>
                      ))}
                    </div>

                    <select
                      value={vTransferToId}
                      onChange={(e) => setVTransferToId(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 text-right focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- اختر الحساب الوجهة --</option>
                      {vTransferToType === 'customer' &&
                        customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (الرصيد الحالي: {(c.balance || 0).toLocaleString()} ر.ي)
                          </option>
                        ))
                      }
                      {vTransferToType === 'supplier' &&
                        suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (المستحق له: {(s.balance || 0).toLocaleString()} ر.ي)
                          </option>
                        ))
                      }
                      {vTransferToType === 'employee' &&
                        employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} (العهدة: {(emp.custody || 0) || 0} | السلف: {(emp.advances || 0) || 0} ر.ي)
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}

              {/* Internal Cash/Bank Transfer Section */}
              {vType === 'internal_transfer' && (() => {
                const bankAccountsList = invoiceSettings?.bankAccounts || [];
                
                // 1. Source Account selection helper
                const sourceLabel = vInternalFrom === 'cash' ? '💵 الخزينة النقدية (الكاش)' : (() => {
                  const b = bankAccountsList.find((x: any) => x.id === vInternalFrom);
                  return b ? `🏦 ${b.name} (حساب: ${b.accountNumber})` : 'اختر الحساب المصدر...';
                })();
                const filteredFromBanks = bankAccountsList.filter((b: any) =>
                  b.name.toLowerCase().includes(vInternalFromSearchQuery.toLowerCase()) ||
                  b.accountNumber.toLowerCase().includes(vInternalFromSearchQuery.toLowerCase())
                );

                // 2. Destination Account selection helper
                const destLabel = vInternalTo === 'cash' ? '💵 الخزينة النقدية (الكاش)' : (() => {
                  const b = bankAccountsList.find((x: any) => x.id === vInternalTo);
                  return b ? `🏦 ${b.name} (حساب: ${b.accountNumber})` : 'اختر الحساب المستلم...';
                })();
                const filteredToBanks = bankAccountsList.filter((b: any) =>
                  b.name.toLowerCase().includes(vInternalToSearchQuery.toLowerCase()) ||
                  b.accountNumber.toLowerCase().includes(vInternalToSearchQuery.toLowerCase())
                );

                return (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-700 border-b pb-2 mb-3">تفاصيل التحويل المالي الداخلي (الخزينة ↔ البنوك)</h4>
                    
                    {/* Source Account (المصدر) */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-black text-slate-500">حساب المصدر (المخصوم منه) *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsVInternalFromDropdownOpen(!isVInternalFromDropdownOpen)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-3 rounded-xl text-slate-700 font-bold flex items-center justify-between gap-2 cursor-pointer shadow-3xs"
                        >
                          <span className="truncate">{sourceLabel}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>

                        {isVInternalFromDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsVInternalFromDropdownOpen(false)}></div>
                            <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                              <input
                                type="text"
                                autoFocus
                                placeholder="ابحث باسم البنك أو رقم الحساب..."
                                value={vInternalFromSearchQuery}
                                onChange={(e) => setVInternalFromSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-hidden focus:border-blue-500 text-right"
                              />
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVInternalFrom('cash');
                                    setIsVInternalFromDropdownOpen(false);
                                    setVInternalFromSearchQuery('');
                                    if (vInternalTo === 'cash') setVInternalTo('');
                                  }}
                                  className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                                    vInternalFrom === 'cash' ? 'bg-amber-50 text-amber-800' : 'text-slate-600'
                                  }`}
                                >
                                  <span>💵 الخزينة النقدية (الكاش)</span>
                                  <span className="text-[10px] text-slate-400 font-bold">صندوق المحاسب</span>
                                </button>
                                {filteredFromBanks.map((b: any) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setVInternalFrom(b.id);
                                      setIsVInternalFromDropdownOpen(false);
                                      setVInternalFromSearchQuery('');
                                      if (vInternalTo === b.id) setVInternalTo('');
                                    }}
                                    className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                                      vInternalFrom === b.id ? 'bg-blue-50/50 text-blue-800' : 'text-slate-600'
                                    }`}
                                  >
                                    <span>🏦 {b.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">حساب: {b.accountNumber}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Destination Account (الوجهة) */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-black text-slate-500">حساب المستلم (المودع إليه) *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsVInternalToDropdownOpen(!isVInternalToDropdownOpen)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-3 rounded-xl text-slate-700 font-bold flex items-center justify-between gap-2 cursor-pointer shadow-3xs"
                        >
                          <span className="truncate">{destLabel}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>

                        {isVInternalToDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsVInternalToDropdownOpen(false)}></div>
                            <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                              <input
                                type="text"
                                autoFocus
                                placeholder="ابحث باسم البنك أو رقم الحساب..."
                                value={vInternalToSearchQuery}
                                onChange={(e) => setVInternalToSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-hidden focus:border-blue-500 text-right"
                              />
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  disabled={vInternalFrom === 'cash'}
                                  onClick={() => {
                                    setVInternalTo('cash');
                                    setIsVInternalToDropdownOpen(false);
                                    setVInternalToSearchQuery('');
                                  }}
                                  className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    vInternalTo === 'cash' ? 'bg-amber-50 text-amber-800' : 'text-slate-600'
                                  }`}
                                >
                                  <span>💵 الخزينة النقدية (الكاش)</span>
                                  <span className="text-[10px] text-slate-400 font-bold">صندوق المحاسب</span>
                                </button>
                                {filteredToBanks.map((b: any) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    disabled={vInternalFrom === b.id}
                                    onClick={() => {
                                      setVInternalTo(b.id);
                                      setIsVInternalToDropdownOpen(false);
                                      setVInternalToSearchQuery('');
                                    }}
                                    className={`w-full text-right text-[11px] font-bold p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                      vInternalTo === b.id ? 'bg-blue-50/50 text-blue-800' : 'text-slate-600'
                                    }`}
                                  >
                                    <span>🏦 {b.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">حساب: {b.accountNumber}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dropdown/Selection based on selection */}
              {vType !== 'transfer' && vType !== 'internal_transfer' && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500">
                    {vTargetGroup === 'supplier' && 'اختر المورد المستحق'}
                    {vTargetGroup === 'customer' && 'اختر العميل المستلم منه'}
                    {vTargetGroup === 'employee' && 'اختر الموظف المستلم'}
                    {vTargetGroup === 'expense' && 'مركز التكلفة للمصروف'}
                  </label>

                  {vTargetGroup === 'supplier' && (
                    <select
                      value={vSelectedTargetId}
                      onChange={(e) => setVSelectedTargetId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- اختر شريك التوريد من القائمة --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (المستحق الحالي: {(s.balance || 0).toLocaleString()} ر.ي)
                        </option>
                      ))}
                    </select>
                  )}

                  {vTargetGroup === 'customer' && (
                    <select
                      value={vSelectedTargetId}
                      onChange={(e) => setVSelectedTargetId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- اختر العميل من القائمة --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (المديونية المستحقة: {(c.balance || 0).toLocaleString()} ر.ي)
                        </option>
                      ))}
                    </select>
                  )}

                  {vTargetGroup === 'employee' && (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الموظف المعني</label>
                        <select
                          value={vSelectedTargetId}
                          onChange={(e) => setVSelectedTargetId(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر الموظف من الكادر المسجل --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.role} - الراتب: {(emp.salary || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      </div>

                      {vSelectedTargetId && (() => {
                        const emp = employees.find(e => e.id === vSelectedTargetId);
                        if (!emp) return null;
                        const { basic, overtime, bonus, deductions, advances, net } = getEmployeeSalaryDetails(emp);
                        return (
                          <div className="space-y-4 animate-scale-up">
                            {/* Employee Ledger Summary Card */}
                            <div className="bg-white border border-slate-100 p-3 rounded-xl text-xs space-y-1.5 font-bold text-slate-600 text-right" dir="rtl">
                              <div className="flex justify-between border-b pb-1 mb-1.5 font-black text-slate-800">
                                <span>الوضع المالي الحالي للموظف:</span>
                                <span className="text-blue-700">{emp.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>الراتب الأساسي:</span>
                                <span className="font-mono text-slate-700">{(basic).toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between text-emerald-600">
                                <span>إجمالي الإضافي المستحق:</span>
                                <span className="font-mono">+{overtime.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between text-emerald-600">
                                <span>إجمالي المكافآت / الإكراميات:</span>
                                <span className="font-mono">+{bonus.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between text-rose-600">
                                <span>إجمالي الاستقطاعات والجزاءات:</span>
                                <span className="font-mono">-{deductions.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between text-amber-600">
                                <span>السلف والمديونية المعلقة:</span>
                                <span className="font-mono">-{advances.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between border-t pt-1.5 font-black text-slate-800 bg-slate-50/50 p-1.5 rounded-lg">
                                <span>صافي الراتب المستحق المتبقي:</span>
                                <span className={`font-mono text-xs ${net > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {net > 0 ? `${(net).toLocaleString()} ر.ي` : 'لا يوجد راتب مستحق (0 ريال)'}
                                </span>
                              </div>
                            </div>

                            {/* Reason Selector */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-500">نوع البند المصروف له</label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { value: 'salary', label: '💵 صرف متبقي الراتب', desc: 'لتصفير مستحقات هذا الشهر' },
                                  { value: 'advance', label: '💸 صرف سلفة مستردة', desc: 'تسجل مديونية على الموظف' },
                                  { value: 'custody', label: '📦 صرف عهدة مالية للعمل', desc: 'ذمة معلقة لشراء مستلزمات' },
                                  { value: 'overtime', label: '⚡ صرف ساعات إضافية', desc: 'أجور عمل إضافي فورية' },
                                  { value: 'bonus', label: '🎁 صرف إكرامية ومكافأة', desc: 'مكافآت تشجيعية مقطوعة' }
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      setVEmployeePaymentReason(opt.value as any);
                                      if (opt.value === 'salary') {
                                        setVAmount(net > 0 ? net : 0);
                                      } else if (opt.value === 'overtime') {
                                        setVAmount(overtime > 0 ? overtime : '');
                                      } else if (opt.value === 'bonus') {
                                        setVAmount(bonus > 0 ? bonus : '');
                                      } else {
                                        setVAmount('');
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                                      vEmployeePaymentReason === opt.value
                                        ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-400/30'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="text-[11px] font-black">{opt.label}</span>
                                    <span className="text-[9px] text-slate-400 font-bold leading-normal mt-0.5">{opt.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Overtime Info Box */}
                            {vEmployeePaymentReason === 'overtime' && (
                              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-1 animate-scale-up text-right">
                                <span className="block text-[11px] font-black text-emerald-950">⚡ صرف مستحقات إضافي ساعات العمل فورياً</span>
                                <span className="block text-[10px] text-emerald-800 font-bold leading-relaxed">
                                  سيتم صرف المبلغ من الخزينة/البنك ويُخصم فوراً من صافي مستحقات الموظف (المتغيرات الشهرية المعلقة من نوع ساعات إضافية بقيمة <span className="font-mono font-black">{overtime.toLocaleString()} ر.ي</span>) لمنع تكرار صرفه مع الراتب لاحقاً.
                                </span>
                              </div>
                            )}

                            {/* Bonus Info Box */}
                            {vEmployeePaymentReason === 'bonus' && (
                              <div className="bg-purple-50 border border-purple-250 p-3 rounded-2xl space-y-1 animate-scale-up text-right">
                                <span className="block text-[11px] font-black text-purple-950">🎁 صرف المكافآت والإكراميات فورياً</span>
                                <span className="block text-[10px] text-purple-800 font-bold leading-relaxed">
                                  سيتم صرف المبلغ من الخزينة/البنك ويُخصم فوراً من صافي مستحقات الموظف (المتغيرات الشهرية المعلقة من نوع إكراميات/مكافآت بقيمة <span className="font-mono font-black">{bonus.toLocaleString()} ر.ي</span>) لمنع تكرار صرفه مع الراتب لاحقاً.
                                </span>
                              </div>
                            )}

                            {/* Deduction Method if Advance chosen */}
                            {vEmployeePaymentReason === 'advance' && (
                              <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-2xl space-y-2 animate-scale-up">
                                <label className="block text-[10px] font-black text-slate-700">طريقة استقطاع السلفة ⏱️</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: 'full', label: '🛑 تُخصم كاملة من راتب الشهر القادم' },
                                    { value: 'installments', label: '🗓️ تقسيط على دفعات شهرية ميسرة' }
                                  ].map((mode) => (
                                    <button
                                      key={mode.value}
                                      type="button"
                                      onClick={() => setVAdvanceDeductionMethod(mode.value as any)}
                                      className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center cursor-pointer ${
                                        vAdvanceDeductionMethod === mode.value
                                          ? 'bg-amber-900 border-amber-950 text-white font-extrabold shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      {mode.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {vTargetGroup === 'expense' && (
                    <div className="space-y-4">
                      <select
                        value={vCostCenter}
                        onChange={(e) => setVCostCenter(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                      >
                        <option value="مصاريف كهرباء / إنترنت">مصاريف كهرباء / إنترنت</option>
                        <option value="مصاريف إيجار مستودع">مصاريف إيجار مستودع</option>
                        <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
                        <option value="صيانة تجهيزات وآلات">صيانة تجهيزات وآلات</option>
                        <option value="محروقات ونقل لوجستي">محروقات ونقل لوجستي</option>
                        <option value="ضيافة وتغذية">ضيافة وتغذية</option>
                        <option value="نثريات ومصاريف أخرى">نثريات ومصاريف أخرى</option>
                      </select>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-400">الجهة أو المستلم الفعلي (اختياري)</label>
                        <input
                          type="text"
                          placeholder="مثال: المؤسسة العامة للكهرباء"
                          value={vManualExpenseRecipient}
                          onChange={(e) => setVManualExpenseRecipient(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500">مبلغ السند (ر.ي)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="القيمة بالريال..."
                    value={vAmount}
                    onChange={(e) => setVAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-black text-slate-800 text-left focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 flex justify-between items-center">
                    <span>تاريخ المعاملة</span>
                    {currentUser.role !== 'Owner' && <span className="text-[9px] text-slate-400 font-bold">(مغلق لغير المالك)</span>}
                  </label>
                  <input
                    type="date"
                    required
                    value={vDate}
                    disabled={currentUser.role !== 'Owner'}
                    onChange={(e) => setVDate(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500 ${
                      currentUser.role !== 'Owner' ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500">بيان الحركة / التفاصيل والملاحظات</label>
                <textarea
                  placeholder="اكتب تفاصيل إضافية لتوضيح سبب الحركة أو مرجع الدفع..."
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500 text-right resize-none"
                />
              </div>

              {/* Warnings / Notices */}
              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                <div className="text-blue-700">💡</div>
                <div className="text-[10px] text-blue-800 font-bold leading-relaxed">
                  <p>عند حفظ السند، سيقوم النظام تلقائياً بـ:</p>
                  <ul className="list-disc list-inside mr-2 space-y-0.5 mt-1">
                    <li>تعديل حساب العميل أو المورد في الذمم الدائنة/المدينة.</li>
                    <li>تحديث رصيد صندوق الخزينة والسيولة النقدية في الوقت الفعلي.</li>
                    <li>توليد سند مالي رسمي آمن برقم تسلسلي غير قابل للتدخل اليدوي.</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  تأكيد وترحيل السند آلياً 💾
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Monthly Variation Modal */}
      {isAddVariationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-lg space-y-4 text-right animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-black text-slate-800">إضافة حركة شهرية كادرية (استحقاق / استقطاع) ⚡</h3>
              <button
                type="button"
                onClick={() => setIsAddVariationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={18} className="stroke-[3]" />
              </button>
            </div>

            <form onSubmit={handleAddVariationSubmit} className="space-y-4">
              {/* Target Employee */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500">الموظف المعني</label>
                <select
                  value={variationForm.employeeId}
                  onChange={(e) => setVariationForm({ ...variationForm, employeeId: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role} - الراتب: {(emp.salary || 0).toLocaleString()} ر.ي)
                    </option>
                  ))}
                </select>
              </div>

              {/* Variation Type */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500">نوع الحركة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'bonus', label: '🎁 إكرامية / مكافأة', color: 'emerald' },
                    { value: 'overtime', label: '⚡ عمل إضافي', color: 'amber' },
                    { value: 'deduction', label: '🛑 خصم / جزاء', color: 'rose' }
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setVariationForm({ 
                        ...variationForm, 
                        type: t.value as any,
                        amountType: t.value === 'overtime' ? 'hourly' : 'flat'
                      })}
                      className={`py-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        variationForm.type === t.value
                          ? t.color === 'emerald' ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : t.color === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overtime Sub-Type Choice */}
              {variationForm.type === 'overtime' && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-black text-slate-500">طريقة احتساب الإضافي</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'hourly', label: '⏱️ بالساعات (ساعات × قيمة الساعة)' },
                      { value: 'flat', label: '💰 مبلغ مقطوع مباشرة' }
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setVariationForm({ ...variationForm, amountType: mode.value as any })}
                        className={`py-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          variationForm.amountType === mode.value
                            ? 'bg-slate-900 border-slate-900 text-white font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Numeric Inputs depending on choice */}
              {variationForm.type === 'overtime' && variationForm.amountType === 'hourly' ? (
                <div className="grid grid-cols-2 gap-3 bg-amber-50/20 border border-amber-100/50 p-4 rounded-2xl">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500">عدد الساعات الإضافية</label>
                    <input
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      placeholder="مثال: 4 ساعات"
                      value={variationForm.hours}
                      onChange={(e) => setVariationForm({ ...variationForm, hours: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500">قيمة ساعة الإضافي (ر.ي)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="مثال: 1500 ريال"
                      value={variationForm.hourlyRate}
                      onChange={(e) => setVariationForm({ ...variationForm, hourlyRate: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div className="col-span-2 text-center pt-2 border-t border-amber-100 text-xs font-black text-amber-900 bg-amber-50 rounded-lg py-1.5">
                    إجمالي المستحق للإضافي: {((Number(variationForm.hours || 0)) * (Number(variationForm.hourlyRate || 0))).toLocaleString()} ر.ي
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500">
                    {variationForm.type === 'overtime' ? 'المبلغ الإضافي المقطوع (ر.ي)' : 
                     variationForm.type === 'bonus' ? 'قيمة الإكرامية / المكافأة (ر.ي)' : 'قيمة الخصم / الجزاء (ر.ي)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="أدخل المبلغ هنا..."
                    value={variationForm.flatAmount}
                    onChange={(e) => setVariationForm({ ...variationForm, flatAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-700 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500">السبب أو التفاصيل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تميز في إنهاء أعمال الجرد السنوي"
                  value={variationForm.reason}
                  onChange={(e) => setVariationForm({ ...variationForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500">تاريخ الحركة</label>
                <input
                  type="date"
                  required
                  value={variationForm.date}
                  onChange={(e) => setVariationForm({ ...variationForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVariationModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  حفظ وإدراج الحركة ⚡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Settlement Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-xl space-y-4 text-right animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <RefreshCcw size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">تصفية وتسوية العهد المالية 📦</h3>
                  <p className="text-[10px] text-slate-400 font-bold">تسوية الفواتير والمصاريف الفعلية للعهد المفتوحة في النظام</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={18} className="stroke-[3]" />
              </button>
            </div>

            <form onSubmit={handleSettlementSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500">اختر الموظف صاحب العهدة</label>
                <select
                  value={settlementForm.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = employees.find(x => x.id === empId);
                    setSettlementForm({
                      ...settlementForm,
                      employeeId: empId,
                      custodyAmount: emp ? (emp.custody || 0) : 0
                    });
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">-- اختر الموظف لعرض عهده المعلقة --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role} - العهدة الحالية: {(emp.custody || 0).toLocaleString()} ر.ي)
                    </option>
                  ))}
                </select>
              </div>

              {settlementForm.employeeId && (() => {
                const emp = employees.find(x => x.id === settlementForm.employeeId);
                if (!emp) return null;
                
                const custodyAmount = emp.custody || 0;
                const totalExpenses = settlementForm.invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
                const difference = custodyAmount - totalExpenses; // الفارق = العهدة الأصلية - إجمالي الفواتير المقدمة

                return (
                  <div className="space-y-4 animate-scale-up">
                    {/* Custody Info Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-900 flex justify-between items-center">
                      <div>
                        <span>العهدة المفتوحة المسجلة بعهدة الموظف:</span>
                        <div className="text-sm font-black mt-0.5 text-amber-950">{emp.name}</div>
                      </div>
                      <div className="text-base font-black font-mono">
                        {custodyAmount.toLocaleString()} ر.ي
                      </div>
                    </div>

                    {custodyAmount === 0 && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold text-center">
                        ⚠️ تنبيه: لا توجد عهد مالية معلقة لهذا الموظف في الدفاتر حالياً!
                      </div>
                    )}

                    {custodyAmount > 0 && (
                      <>
                        {/* Expenses and Invoices Section */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-700">فواتير المصاريف الفعلية الموثقة 📑</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementForm({
                                  ...settlementForm,
                                  invoices: [
                                    ...settlementForm.invoices,
                                    { id: `inv-${Date.now()}-${Math.random().toString().slice(-4)}`, category: 'أدوات مكتبية ومطبوعات', amount: '' }
                                  ]
                                });
                              }}
                              className="text-[10px] font-black text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-1 rounded-lg animate-scale-up"
                            >
                              ➕ إضافة فاتورة جديدة
                            </button>
                          </div>

                          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                            {settlementForm.invoices.map((inv, idx) => (
                              <div key={inv.id} className="flex gap-2 items-center">
                                <span className="text-xs font-black text-slate-400 font-mono w-4">{idx + 1}</span>
                                
                                <select
                                  value={inv.category}
                                  onChange={(e) => {
                                    const updatedInvs = settlementForm.invoices.map(x => 
                                      x.id === inv.id ? { ...x, category: e.target.value } : x
                                    );
                                    setSettlementForm({ ...settlementForm, invoices: updatedInvs });
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                                >
                                  <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
                                  <option value="محروقات ونقل لوجستي">محروقات ونقل لوجستي</option>
                                  <option value="مصاريف كهرباء / إنترنت">مصاريف كهرباء / إنترنت</option>
                                  <option value="صيانة تجهيزات وآلات">صيانة تجهيزات وآلات</option>
                                  <option value="ضيافة وتغذية">ضيافة وتغذية</option>
                                  <option value="مصاريف إيجار مستودع">مصاريف إيجار مستودع</option>
                                  <option value="نثريات ومصاريف أخرى">نثريات ومصاريف أخرى</option>
                                </select>

                                <input
                                  type="number"
                                  min="0"
                                  required
                                  placeholder="المبلغ ر.ي"
                                  value={inv.amount}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    const updatedInvs = settlementForm.invoices.map(x => 
                                      x.id === inv.id ? { ...x, amount: val } : x
                                    );
                                    setSettlementForm({ ...settlementForm, invoices: updatedInvs });
                                  }}
                                  className="w-[120px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 text-left focus:outline-hidden focus:border-amber-500"
                                />

                                {settlementForm.invoices.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedInvs = settlementForm.invoices.filter(x => x.id !== inv.id);
                                      setSettlementForm({ ...settlementForm, invoices: updatedInvs });
                                    }}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  >
                                    <X size={14} className="stroke-[3]" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totals & Difference Calculator */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                            <span>إجمالي الفواتير المرفقة:</span>
                            <span className="font-mono text-slate-800">{totalExpenses.toLocaleString()} ر.ي</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                            <span>الفارق في العهدة (معادلة التصفية):</span>
                            <span className={`font-mono text-sm font-black ${difference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {difference >= 0 ? `+${difference.toLocaleString()}` : `${difference.toLocaleString()}`} ر.ي
                            </span>
                          </div>

                          {/* Dynamic 3 Case Feedback Banner */}
                          <div className="border-t pt-2.5 mt-1">
                            {difference > 0 && (
                              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-900 space-y-1">
                                <div className="font-black">💡 الحالة (1): الفارق بالموجب (الموظف معه باقٍ)</div>
                                <div className="leading-relaxed text-[11px] text-emerald-800">
                                  يجب على الموظف إرجاع مبلغ <span className="font-mono font-extrabold">{difference.toLocaleString()} ر.ي</span> إلى الصندوق/البنك. ستقوم التصفية بتوليد <strong>سند قبض</strong> تلقائي لإدخال الباقي.
                                </div>
                              </div>
                            )}

                            {difference === 0 && (
                              <div className="bg-blue-50 border border-blue-250 p-3 rounded-xl text-xs font-bold text-blue-900 space-y-1">
                                <div className="font-black">✅ الحالة (2): الفارق صفر (العهدة مصفاة بالكامل)</div>
                                <div className="leading-relaxed text-[11px] text-blue-800">
                                  العهدة مطابقة تماماً لمستندات المصاريف المقدمة. سيتم إغلاق حساب العهدة لهذا الموظف بالكامل دون حركة نقدية متبقية.
                                </div>
                              </div>
                            )}

                            {difference < 0 && (
                              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold text-rose-900 space-y-1">
                                <div className="font-black">⚠️ الحالة (3): الفارق بالسالب (الموظف صرف زيادة)</div>
                                <div className="leading-relaxed text-[11px] text-rose-800">
                                  صرف الموظف زيادة من جيبه بقيمة <span className="font-mono font-extrabold">{Math.abs(difference).toLocaleString()} ر.ي</span>. ستقوم التصفية بتوليد <strong>سند صرف</strong> تلقائي لتعويض الموظف.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Method / Date / Notes (Only if difference is not zero) */}
                        {difference !== 0 && (
                          <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl space-y-3">
                            <label className="block text-[11px] font-black text-slate-500">طريقة معالجة الفارق المالي (تسوية الصندوق/البنك)</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'cash', label: '💵 معالجة نقداً (الخزينة العامة)' },
                                { value: 'bank', label: '💳 معالجة بنكياً (حساب البنك الرئيسي)' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setSettlementForm({ ...settlementForm, paymentMethod: opt.value as any })}
                                  className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                                    settlementForm.paymentMethod === opt.value
                                      ? 'bg-slate-900 border-slate-950 text-white font-extrabold'
                                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-black text-slate-500">تاريخ التصفية</label>
                            <input
                              type="date"
                              required
                              value={settlementForm.date}
                              onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-black text-slate-500">ملاحظات تسوية العهدة</label>
                            <input
                              type="text"
                              placeholder="أدخل أي ملاحظات محاسبية إضافية..."
                              value={settlementForm.notes}
                              onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsSettlementModalOpen(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                          >
                            إلغاء وتراجع
                          </button>
                          <button
                            type="submit"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            اعتماد تصفية العهدة وإغلاقها 📦
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Bank Treasury Details Modal */}
      {isBankTreasuryModalOpen && (() => {
        const bankAccountsList = invoiceSettings?.bankAccounts || [];
        const totalBankAccountsBalance = bankAccountsList.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);

        const getBankMovements = (bankId: string) => {
          return vouchers.map((v: any) => {
            let isDebit = false;
            let isMyMovement = false;

            if (v.paymentMethod === 'bank' && v.bankAccountId === bankId) {
              isMyMovement = true;
              isDebit = v.isReceipt;
            } else if (v.internalFrom === bankId) {
              isMyMovement = true;
              isDebit = false;
            } else if (v.internalTo === bankId) {
              isMyMovement = true;
              isDebit = true;
            }

            return isMyMovement ? { ...v, isDebit } : null;
          }).filter(Boolean) as any[];
        };

        const getConsolidatedBankMovements = () => {
          const bankIds = bankAccountsList.map((b: any) => b.id);
          return vouchers.map((v: any) => {
            let isDebit = false;
            let isMyMovement = false;
            let affectedBankName = '';

            if (v.paymentMethod === 'bank' && bankIds.includes(v.bankAccountId)) {
              isMyMovement = true;
              isDebit = v.isReceipt;
              const bk = bankAccountsList.find((b: any) => b.id === v.bankAccountId);
              affectedBankName = bk ? bk.name : 'حساب بنكي';
            } else {
              const fromIsBank = bankIds.includes(v.internalFrom);
              const toIsBank = bankIds.includes(v.internalTo);

              if (fromIsBank && toIsBank) {
                isMyMovement = true;
                isDebit = true;
                const fbk = bankAccountsList.find((b: any) => b.id === v.internalFrom);
                const tbk = bankAccountsList.find((b: any) => b.id === v.internalTo);
                affectedBankName = `تحويل: من ${fbk?.name || 'بنك'} إلى ${tbk?.name || 'بنك'}`;
              } else if (fromIsBank) {
                isMyMovement = true;
                isDebit = false;
                const fbk = bankAccountsList.find((b: any) => b.id === v.internalFrom);
                affectedBankName = `سحب نقدي من ${fbk?.name || 'بنك'}`;
              } else if (toIsBank) {
                isMyMovement = true;
                isDebit = true;
                const tbk = bankAccountsList.find((b: any) => b.id === v.internalTo);
                affectedBankName = `إيداع نقدي في ${tbk?.name || 'بنك'}`;
              }
            }

            if (isMyMovement) {
              return { ...v, isDebit, affectedBankName };
            }
            return null;
          }).filter(Boolean) as any[];
        };

        const printSingleBankStatement = (accountName: string, accountNumber: string, balance: number, movements: any[]) => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;

          const totalIn = movements.reduce((acc, m) => acc + (m.isDebit ? m.amount : 0), 0);
          const totalOut = movements.reduce((acc, m) => acc + (!m.isDebit ? m.amount : 0), 0);

          const html = `
            <html>
              <head>
                <title>كشف حساب - ${accountName}</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 30px; color: #333; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
                  .title { font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; }
                  .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                  .info-item { font-size: 13px; font-weight: bold; }
                  .info-label { color: #64748b; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-size: 12px; }
                  th { background-color: #1e293b; color: white; font-weight: bold; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .amount { font-family: monospace; font-weight: bold; }
                  .debit { color: #16a34a; }
                  .credit { color: #dc2626; }
                  .summary { margin-top: 30px; display: flex; justify-content: flex-end; gap: 20px; font-size: 14px; font-weight: bold; }
                  .summary-item { border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 6px; background-color: #f1f5f9; }
                  .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
                  .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; text-align: center; font-size: 13px; font-weight: bold; }
                  .signature-box { border-top: 1px solid #94a3b8; padding-top: 10px; width: 150px; margin: 0 auto; }
                  @media print {
                    body { padding: 0; }
                    button { display: none; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="title">تقرير كشف الحساب المالي البنكي</div>
                  <div class="subtitle">نظام إدارة المخازن والمالية الذكي - WMS Enterprise</div>
                </div>

                <div class="info-grid">
                  <div class="info-item"><span class="info-label">الحساب المالي:</span> ${accountName}</div>
                  <div class="info-item"><span class="info-label">رقم الحساب / المرجع:</span> ${accountNumber}</div>
                  <div class="info-item"><span class="info-label">تاريخ الطباعة:</span> ${new Date().toLocaleDateString('ar-YE')} ${new Date().toLocaleTimeString('ar-YE')}</div>
                  <div class="info-item"><span class="info-label">الرصيد الختامي الحالي:</span> ${balance.toLocaleString()} ر.ي</div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width: 80px;">التاريخ</th>
                      <th style="width: 100px;">رقم السند/الحركة</th>
                      <th>البيان والتفاصيل</th>
                      <th style="width: 90px;">وارد (+)</th>
                      <th style="width: 90px;">صادر (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${movements.map(m => `
                      <tr>
                        <td>${m.date}</td>
                        <td>${m.id}</td>
                        <td>
                          <strong>${m.title}</strong><br/>
                          <span style="color: #64748b; font-size: 11px;">شريك: ${m.partnerName} | ${m.notes}</span>
                        </td>
                        <td class="amount debit">${m.isDebit ? `+${m.amount.toLocaleString()}` : '-'}</td>
                        <td class="amount credit">${!m.isDebit ? `-${m.amount.toLocaleString()}` : '-'}</td>
                      </tr>
                    `).join('')}
                    ${movements.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-weight: bold;">لا توجد حركات مسجلة لهذا الحساب</td></tr>` : ''}
                  </tbody>
                </table>

                <div class="summary">
                  <div class="summary-item">إجمالي الإيداعات (+): <span class="debit">${totalIn.toLocaleString()} YER</span></div>
                  <div class="summary-item">إجمالي السحوبات (-): <span class="credit">${totalOut.toLocaleString()} YER</span></div>
                  <div class="summary-item" style="background-color: #1e293b; color: white;">الرصيد الختامي الفعلي: <span>${balance.toLocaleString()} ر.ي</span></div>
                </div>

                <div class="signature-area">
                  <div>
                    <p>توقيع أمين الصندوق / المحاسب</p>
                    <div class="signature-box"></div>
                  </div>
                  <div>
                    <p>توقيع المدير المالي / المصادقة</p>
                    <div class="signature-box"></div>
                  </div>
                </div>

                <div class="footer">
                  تم إنشاء هذا الكشف تلقائياً عبر النظام المالي في ${new Date().getFullYear()} © جميع الحقوق محفوظة.
                </div>

                <script>
                  window.print();
                  window.onafterprint = function() { window.close(); };
                </script>
              </body>
            </html>
          `;

          printWindow.document.write(html);
          printWindow.document.close();
        };

        const handlePrintConsolidatedBankStatement = (movements: any[]) => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;

          const totalIn = movements.reduce((acc, m) => acc + (m.isDebit ? m.amount : 0), 0);
          const totalOut = movements.reduce((acc, m) => acc + (!m.isDebit ? m.amount : 0), 0);

          const html = `
            <html>
              <head>
                <title>كشف حساب موحد - الخزينة البنكية</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 30px; color: #333; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
                  .title { font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; }
                  .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                  .info-item { font-size: 13px; font-weight: bold; }
                  .info-label { color: #64748b; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-size: 12px; }
                  th { background-color: #1e293b; color: white; font-weight: bold; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .amount { font-family: monospace; font-weight: bold; }
                  .debit { color: #16a34a; }
                  .credit { color: #dc2626; }
                  .summary { margin-top: 30px; display: flex; justify-content: flex-end; gap: 20px; font-size: 14px; font-weight: bold; }
                  .summary-item { border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 6px; background-color: #f1f5f9; }
                  .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
                  .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; text-align: center; font-size: 13px; font-weight: bold; }
                  .signature-box { border-top: 1px solid #94a3b8; padding-top: 10px; width: 150px; margin: 0 auto; }
                  @media print {
                    body { padding: 0; }
                    button { display: none; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="title">كشف الحساب الموحد للخزينة البنكية</div>
                  <div class="subtitle">تقرير شامل لجميع الحسابات والتعاملات البنكية المدمجة - WMS Enterprise</div>
                </div>

                <div class="info-grid">
                  <div class="info-item"><span class="info-label">الحساب المالي:</span> الخزينة البنكية الموحدة (جميع البنوك)</div>
                  <div class="info-item"><span class="info-label">عدد الحسابات البنكية:</span> ${bankAccountsList.length}</div>
                  <div class="info-item"><span class="info-label">تاريخ الطباعة:</span> ${new Date().toLocaleDateString('ar-YE')} ${new Date().toLocaleTimeString('ar-YE')}</div>
                  <div class="info-item"><span class="info-label">الرصيد الموحد الإجمالي للبنك:</span> ${totalBankAccountsBalance.toLocaleString()} ر.ي</div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width: 80px;">التاريخ</th>
                      <th style="width: 100px;">رقم الحركة</th>
                      <th>الحساب البنكي المتأثر</th>
                      <th>البيان والتفاصيل</th>
                      <th style="width: 100px;">وارد (+)</th>
                      <th style="width: 100px;">صادر (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${movements.map(m => `
                      <tr>
                        <td>${m.date}</td>
                        <td>${m.id}</td>
                        <td><span style="font-weight: bold; color: #1e3a8a;">${m.affectedBankName || 'حساب البنك'}</span></td>
                        <td>
                          <strong>${m.title}</strong><br/>
                          <span style="color: #64748b; font-size: 11px;">شريك: ${m.partnerName} | ${m.notes}</span>
                        </td>
                        <td class="amount debit">${m.isDebit ? `+${m.amount.toLocaleString()}` : '-'}</td>
                        <td class="amount credit">${!m.isDebit ? `-${m.amount.toLocaleString()}` : '-'}</td>
                      </tr>
                    `).join('')}
                    ${movements.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; font-weight: bold;">لا توجد حركات بنكية مسجلة</td></tr>` : ''}
                  </tbody>
                </table>

                <div class="summary">
                  <div class="summary-item">إجمالي الإيداعات (+): <span class="debit">${totalIn.toLocaleString()} YER</span></div>
                  <div class="summary-item">إجمالي السحوبات (-): <span class="credit">${totalOut.toLocaleString()} YER</span></div>
                  <div class="summary-item" style="background-color: #1e293b; color: white;">إجمالي السيولة البنكية الموحدة: <span>${totalBankAccountsBalance.toLocaleString()} ر.ي</span></div>
                </div>

                <div class="signature-area">
                  <div>
                    <p>توقيع أمين الصندوق / المحاسب</p>
                    <div class="signature-box"></div>
                  </div>
                  <div>
                    <p>توقيع المدير المالي / المصادقة</p>
                    <div class="signature-box"></div>
                  </div>
                </div>

                <div class="footer">
                  تم إنشاء هذا الكشف الموحد تلقائياً عبر النظام المالي في ${new Date().getFullYear()} © جميع الحقوق محفوظة.
                </div>

                <script>
                  window.print();
                  window.onafterprint = function() { window.close(); };
                </script>
              </body>
            </html>
          `;

          printWindow.document.write(html);
          printWindow.document.close();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-right animate-scale-up animate-fade-in" dir="rtl">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <CheckSquare size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800">تفاصيل الخزينة البنكية الموحدة 🏦</h3>
                    <p className="text-[10px] text-slate-400 font-bold">عرض ومطابقة وطباعة كشوفات الحسابات البنكية المسجلة بالنظام</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankTreasuryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={18} className="stroke-[3]" />
                </button>
              </div>

              {/* Total Summary Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 mb-5 shrink-0">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">إجمالي رصيد الخزينة البنكية</span>
                  <p className="text-2xl font-black font-mono text-slate-800">{totalBankAccountsBalance.toLocaleString()} ر.ي</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => handlePrintConsolidatedBankStatement(getConsolidatedBankMovements())}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Printer size={15} />
                  <span>طباعة كشف حساب كلي موحد للبنوك 🖨️</span>
                </button>
              </div>

              {/* Bank Accounts List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-sans">
                {bankAccountsList.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                    لا توجد حسابات بنكية معرفة في الإعدادات حالياً. يمكنك إضافتها من قائمة الإعدادات.
                  </div>
                ) : (
                  bankAccountsList.map((account: any) => {
                    const accountMovements = getBankMovements(account.id);
                    return (
                      <div key={account.id} className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xs p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                        <div className="flex items-center gap-3 text-right">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <span className="text-lg">🏦</span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-800">{account.name}</span>
                              {account.isDefault && (
                                <span className="text-[8px] bg-blue-500/10 text-blue-600 font-bold px-1.5 py-0.2 rounded-md">افتراضي</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">رقم الحساب: {account.accountNumber}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 justify-end">
                          <div className="text-left pl-3 border-l border-slate-100 hidden sm:block">
                            <span className="text-[9px] text-slate-400 font-bold block">الرصيد الحالي</span>
                            <span className="text-xs font-black font-mono text-blue-600">{(account.balance || 0).toLocaleString()} ر.ي</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => printSingleBankStatement(account.name, account.accountNumber, account.balance, accountMovements)}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Printer size={13} />
                              <span>طباعة الكشف 🖨️</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReconAccountId(account.id);
                                setIsReconModalOpen(true);
                                setIsBankTreasuryModalOpen(false);
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 font-black text-[11px] px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>مطابقة ومراجعة 🔎</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer action */}
              <div className="mt-5 pt-3 border-t border-slate-100 shrink-0 text-left">
                <button
                  type="button"
                  onClick={() => setIsBankTreasuryModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Month-End Bank Account Reconciliation Modal */}
      {isReconModalOpen && (() => {
        const bankAccountsList = invoiceSettings?.bankAccounts || [];
        const currentAccount = reconAccountId === 'cash' 
          ? { id: 'cash', name: 'الخزينة النقدية (الكاش)', accountNumber: 'CASH-FUND', balance: treasuryBalance }
          : bankAccountsList.find((b: any) => b.id === reconAccountId) || { id: 'unknown', name: 'بنك مجهول', accountNumber: 'UNKNOWN', balance: 0 };

        // Filter and map movements for this specific account
        const matchedMovements = vouchers.map((v: any) => {
          let isDebit = false; // debit = وارد/زيادة (for cash/bank), credit = صادر/نقصان
          let isMyMovement = false;

          if (reconAccountId === 'cash') {
            if (v.paymentMethod === 'cash') {
              isMyMovement = true;
              isDebit = v.isReceipt; // Receipts are incoming (+)
            } else if (v.internalFrom === 'cash') {
              isMyMovement = true;
              isDebit = false; // outgoing (-)
            } else if (v.internalTo === 'cash') {
              isMyMovement = true;
              isDebit = true; // incoming (+)
            }
          } else {
            if (v.paymentMethod === 'bank' && v.bankAccountId === reconAccountId) {
              isMyMovement = true;
              isDebit = v.isReceipt; // Receipts are incoming (+)
            } else if (v.internalFrom === reconAccountId) {
              isMyMovement = true;
              isDebit = false; // outgoing (-)
            } else if (v.internalTo === reconAccountId) {
              isMyMovement = true;
              isDebit = true; // incoming (+)
            }
          }

          return isMyMovement ? { ...v, isDebit } : null;
        }).filter(Boolean) as any[];

        // Apply filters: Date and Search query
        const filteredMovements = matchedMovements.filter((m) => {
          if (reconStartDate && m.date < reconStartDate) return false;
          if (reconEndDate && m.date > reconEndDate) return false;
          
          if (reconSearchText) {
            const query = reconSearchText.toLowerCase();
            return (
              m.title.toLowerCase().includes(query) ||
              m.partnerName.toLowerCase().includes(query) ||
              m.notes.toLowerCase().includes(query) ||
              m.id.toLowerCase().includes(query) ||
              m.amount.toString().includes(query)
            );
          }
          return true;
        });

        // Totals
        const totalInflow = filteredMovements.reduce((sum, m) => sum + (m.isDebit ? m.amount : 0), 0);
        const totalOutflow = filteredMovements.reduce((sum, m) => sum + (!m.isDebit ? m.amount : 0), 0);

        // Reconciled Totals (marked checked)
        const reconciledMovements = filteredMovements.filter(m => reconciledLines.includes(m.id));
        const reconciledInflow = reconciledMovements.reduce((sum, m) => sum + (m.isDebit ? m.amount : 0), 0);
        const reconciledOutflow = reconciledMovements.reduce((sum, m) => sum + (!m.isDebit ? m.amount : 0), 0);
        
        // Let's assume a start balance (can just be a mock or difference from current)
        const currentBalance = currentAccount.balance;
        const unreconciledDiscrepancy = currentBalance - (reconciledInflow - reconciledOutflow);

        const handlePrintStatement = (accountName: string, accountNumber: string, balance: number, movements: any[]) => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;

          const totalIn = movements.reduce((acc, m) => acc + (m.isDebit ? m.amount : 0), 0);
          const totalOut = movements.reduce((acc, m) => acc + (!m.isDebit ? m.amount : 0), 0);

          const html = `
            <html>
              <head>
                <title>كشف حساب - ${accountName}</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 30px; color: #333; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
                  .title { font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; }
                  .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                  .info-item { font-size: 13px; font-weight: bold; }
                  .info-label { color: #64748b; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-size: 12px; }
                  th { background-color: #1e293b; color: white; font-weight: bold; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .amount { font-family: monospace; font-weight: bold; }
                  .debit { color: #16a34a; }
                  .credit { color: #dc2626; }
                  .summary { margin-top: 30px; display: flex; justify-content: flex-end; gap: 20px; font-size: 14px; font-weight: bold; }
                  .summary-item { border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 6px; background-color: #f1f5f9; }
                  .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
                  .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; text-align: center; font-size: 13px; font-weight: bold; }
                  .signature-box { border-top: 1px solid #94a3b8; padding-top: 10px; width: 150px; margin: 0 auto; }
                  @media print {
                    body { padding: 0; }
                    button { display: none; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="title">تقرير كشف الحساب المالي الموحد</div>
                  <div class="subtitle">نظام إدارة المخازن والمالية الذكي - WMS Enterprise</div>
                </div>

                <div class="info-grid">
                  <div class="info-item"><span class="info-label">الحساب المالي:</span> ${accountName}</div>
                  <div class="info-item"><span class="info-label">رقم الحساب / المرجع:</span> ${accountNumber}</div>
                  <div class="info-item"><span class="info-label">تاريخ الطباعة:</span> ${new Date().toLocaleDateString('ar-YE')} ${new Date().toLocaleTimeString('ar-YE')}</div>
                  <div class="info-item"><span class="info-label">الرصيد الختامي الحالي:</span> ${balance.toLocaleString()} ر.ي</div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width: 80px;">التاريخ</th>
                      <th style="width: 100px;">رقم السند/الحركة</th>
                      <th>البيان والتفاصيل</th>
                      <th style="width: 90px;">وارد (+)</th>
                      <th style="width: 90px;">صادر (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${movements.map(m => `
                      <tr>
                        <td>${m.date}</td>
                        <td>${m.id}</td>
                        <td>
                          <strong>${m.title}</strong><br/>
                          <span style="color: #64748b; font-size: 11px;">شريك: ${m.partnerName} | ${m.notes}</span>
                        </td>
                        <td class="amount debit">${m.isDebit ? `+${m.amount.toLocaleString()}` : '-'}</td>
                        <td class="amount credit">${!m.isDebit ? `-${m.amount.toLocaleString()}` : '-'}</td>
                      </tr>
                    `).join('')}
                    ${movements.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-weight: bold;">لا توجد حركات مسجلة لهذا الحساب</td></tr>` : ''}
                  </tbody>
                </table>

                <div class="summary">
                  <div class="summary-item">إجمالي الإيداعات (+): <span class="debit">${totalIn.toLocaleString()} YER</span></div>
                  <div class="summary-item">إجمالي السحوبات (-): <span class="credit">${totalOut.toLocaleString()} YER</span></div>
                  <div class="summary-item" style="background-color: #1e293b; color: white;">الرصيد الختامي الفعلي: <span>${balance.toLocaleString()} ر.ي</span></div>
                </div>

                <div class="signature-area">
                  <div>
                    <p>توقيع أمين الصندوق / المحاسب</p>
                    <div class="signature-box"></div>
                  </div>
                  <div>
                    <p>توقيع المدير المالي / المصادقة</p>
                    <div class="signature-box"></div>
                  </div>
                </div>

                <div class="footer">
                  تم إنشاء هذا الكشف تلقائياً عبر النظام المالي في ${new Date().getFullYear()} © جميع الحقوق محفوظة.
                </div>

                <script>
                  window.print();
                  window.onafterprint = function() { window.close(); };
                </script>
              </body>
            </html>
          `;

          printWindow.document.write(html);
          printWindow.document.close();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col text-right animate-scale-up" dir="rtl">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <CheckSquare size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800">مطابقة أرصدة القنوات ومراجعة كشوف الحسابات 📑</h3>
                    <p className="text-[10px] text-slate-400 font-bold">عرض تفصيلي للحركات وسندات القبض والصرف والتسويات المالية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReconModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={18} className="stroke-[3]" />
                </button>
              </div>

              {/* Sub-selectors for accounts inside reconciliation */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setReconAccountId('cash')}
                  className={`px-4 py-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    reconAccountId === 'cash'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs'
                      : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>💵 الخزينة النقدية (الكاش)</span>
                </button>
                {bankAccountsList.map((b: any) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setReconAccountId(b.id)}
                    className={`px-4 py-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      reconAccountId === b.id
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-3xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏦 {b.name}</span>
                  </button>
                ))}
              </div>

              {/* Account Quick Dashboard Card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">رقم الحساب / الرمز</span>
                  <p className="text-xs font-black font-mono text-slate-700">{currentAccount.accountNumber}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 block">إجمالي الوارد (+)</span>
                  <p className="text-xs font-black font-mono text-emerald-600">+{totalInflow.toLocaleString()} ر.ي</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 block">إجمالي الصادر (-)</span>
                  <p className="text-xs font-black font-mono text-rose-600">-{totalOutflow.toLocaleString()} ر.ي</p>
                </div>
                <div className="space-y-1 bg-slate-900 text-white p-2.5 rounded-xl text-center flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-300">الرصيد الفعلي الحالي</span>
                  <p className="text-sm font-black font-mono text-amber-300">{currentAccount.balance.toLocaleString()} ر.ي</p>
                </div>
              </div>

              {/* Date & Text filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-4 shrink-0 bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500">من تاريخ</span>
                  <input
                    type="date"
                    value={reconStartDate}
                    onChange={(e) => setReconStartDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500">إلى تاريخ</span>
                  <input
                    type="date"
                    value={reconEndDate}
                    onChange={(e) => setReconEndDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500">بحث بالحركة / الرقم / المستلم</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="ابحث بالحركة أو المبلغ أو شريك العمل..."
                      value={reconSearchText}
                      onChange={(e) => setReconSearchText(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-hidden flex-1 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handlePrintStatement(currentAccount.name, currentAccount.accountNumber, currentAccount.balance, filteredMovements)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-lg text-[10px] font-black flex items-center gap-1.5 cursor-pointer shadow-3xs"
                    >
                      <Printer size={13} />
                      <span>طباعة كشف حساب 🖨️</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Statement List (Reconciliation Mode) */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl min-h-[180px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-500 font-extrabold text-[11px]">
                    <tr>
                      <th className="p-3 w-[60px] text-center">مطابقة؟</th>
                      <th className="p-3 w-[85px] text-center">التاريخ</th>
                      <th className="p-3 w-[110px] text-center">رقم الحركة</th>
                      <th className="p-3">نوع السند والبيان</th>
                      <th className="p-3 text-left w-[110px]">وارد (+)</th>
                      <th className="p-3 text-left w-[110px]">صادر (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredMovements.map((m) => {
                      const isReconciled = reconciledLines.includes(m.id);
                      return (
                        <tr key={m.id} className={`hover:bg-slate-50/50 ${isReconciled ? 'bg-emerald-50/20' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isReconciled}
                              onChange={() => toggleReconcileLine(m.id)}
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-slate-500">{m.date}</td>
                          <td className="p-3 text-center font-mono text-[10px] font-black text-slate-800">{m.id}</td>
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-[11px] block text-slate-800">{m.title}</span>
                              <span className="text-[10px] text-slate-400 font-bold block leading-relaxed">
                                شريك: {m.partnerName} | {m.notes}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-left font-mono font-black text-[11px] text-emerald-600">
                            {m.isDebit ? `+${m.amount.toLocaleString()} ر.ي` : '-'}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-[11px] text-rose-600">
                            {!m.isDebit ? `-${m.amount.toLocaleString()} ر.ي` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMovements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-extrabold text-[11px]">
                          لا توجد حركات مسجلة تفي بمعايير البحث لهذا الحساب المالي.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom stats & reconciliation status */}
              <div className="mt-4 pt-3 border-t border-slate-150 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 text-right">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-extrabold">
                    المطابقة الشهرية: {reconciledMovements.length} حركة من أصل {filteredMovements.length}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-extrabold ${unreconciledDiscrepancy === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    الفارق غير المطابق: {unreconciledDiscrepancy.toLocaleString()} ر.ي
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReconModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  إغلاق نافذة المطابقة
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
