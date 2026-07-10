import React, { useState } from 'react';
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
  RefreshCcw
} from 'lucide-react';
import { Supplier, User as UserType } from '../types';

interface SuppliersViewProps {
  suppliers: Supplier[];
  customers: any[];
  treasuryBalance: number;
  onUpdateCustomers: (customers: any[]) => void;
  onUpdateTreasuryBalance: (balance: number) => void;
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
}

export default function SuppliersView({
  suppliers,
  customers,
  treasuryBalance,
  onUpdateCustomers,
  onUpdateTreasuryBalance,
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
}: SuppliersViewProps) {
  // Navigation between suppliers, customers, vouchers, employees, journal_entries
  const [localSubTab, setLocalSubTab] = useState<'suppliers' | 'customers' | 'vouchers' | 'employees' | 'journal_entries'>('suppliers');
  const subTab = financialSubTab || localSubTab;
  const setSubTab = setFinancialSubTab || setLocalSubTab;

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
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

  // New Smart Voucher Form State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vType, setVType] = useState<'pay' | 'receive' | 'transfer'>('pay'); // pay = صرف, receive = قبض, transfer = تحويل
  const [vTargetGroup, setVTargetGroup] = useState<'supplier' | 'customer' | 'employee' | 'expense'>('supplier');
  const [vSelectedTargetId, setVSelectedTargetId] = useState<string>('');
  const [vCostCenter, setVCostCenter] = useState<string>('مصاريف كهرباء / إنترنت');
  const [vAmount, setVAmount] = useState<number | ''>('');
  const [vNotes, setVNotes] = useState('');
  const [vDate, setVDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [vManualExpenseRecipient, setVManualExpenseRecipient] = useState('');

  // Transfer Fields
  const [vTransferFlow, setVTransferFlow] = useState<'cust_to_supp' | 'supp_to_emp' | 'emp_cust_to_supp'>('cust_to_supp');
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
    salary: 5000,
    advances: 0,
    custody: 0
  });

  // Journal Entries Sub-tab State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({
    notes: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    lines: [
      { account: '', debit: 0, credit: 0 },
      { account: '', debit: 0, credit: 0 }
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
    let tempCustomers = [...customers];
    let tempSuppliers = [...suppliers];
    let tempEmployees = [...employees];

    original.lines.forEach((line: any) => {
      const isDebit = line.debit > 0;
      const amount = isDebit ? line.debit : line.credit;

      if (line.account === 'الخزينة العامة') {
        if (isDebit) {
          tempTreasury -= amount;
        } else {
          tempTreasury += amount;
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

  const [vEmployeePaymentReason, setVEmployeePaymentReason] = useState<'salary' | 'advance' | 'custody'>('salary');

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
      newTreasuryBalance = treasuryBalance + amount;
      voucherTitle = 'سند قبض نقدي (عميل)';
      journalNotes = `تحصيل دفعة حساب - سند قبض رقم ${voucherId}`;

      // Update customer balance
      const updatedCustomers = customers.map(c => 
        c.id === customer.id ? { ...c, balance: newBalance } : c
      );
      onUpdateCustomers(updatedCustomers);
      onUpdateTreasuryBalance(newTreasuryBalance);

      // Ledger: Debit Cash (الخزينة العامة), Credit Customer (حساب العميل)
      journalLines = [
        { account: 'الخزينة العامة', debit: amount, credit: 0 },
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
        newTreasuryBalance = treasuryBalance - amount;
        voucherTitle = 'سند صرف نقدي (مورد)';
        journalNotes = `تسديد دفعة للمورد - سند صرف رقم ${voucherId}`;

        onEditSupplier({
          ...supplier,
          balance: newBalance
        });
        onUpdateTreasuryBalance(newTreasuryBalance);

        // Ledger: Debit Supplier, Credit Cash
        journalLines = [
          { account: `حساب المورد: ${supplier.name}`, debit: amount, credit: 0 },
          { account: 'الخزينة العامة', debit: 0, credit: amount }
        ];

      } else if (vTargetGroup === 'employee') {
        const emp = employees.find(e => e.id === vSelectedTargetId);
        if (!emp) return;
        partnerName = emp.name;
        partnerId = emp.id;
        partnerType = 'موظف';
        previousBalance = 0;
        newBalance = 0;
        newTreasuryBalance = treasuryBalance - amount;

        // Clone current employees to modify
        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            const currentAdvances = e.advances || 0;
            const currentCustody = e.custody || 0;
            const transactionId = `TX-${Date.now().toString().slice(-5)}`;

            let addedAdvance = 0;
            let addedCustody = 0;
            let txType: 'salary' | 'advance' | 'custody_grant' = 'salary';
            let txNotes = '';

            if (vEmployeePaymentReason === 'advance') {
              addedAdvance = amount;
              txType = 'advance';
              txNotes = `سلفة مالية مستردة - سند صرف رقم ${voucherId}`;
            } else if (vEmployeePaymentReason === 'custody') {
              addedCustody = amount;
              txType = 'custody_grant';
              txNotes = `صرف عهدة مالية للعمل - سند صرف رقم ${voucherId}`;
            } else {
              txType = 'salary';
              txNotes = `تسليم الراتب الشهري - سند صرف رقم ${voucherId}`;
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
              advances: currentAdvances + addedAdvance,
              custody: currentCustody + addedCustody,
              history: [newTx, ...(e.history || [])]
            };
          }
          return e;
        });

        if (vEmployeePaymentReason === 'advance') {
          voucherTitle = 'سند صرف سلفة موظف';
          journalNotes = `صرف سلفة موظف ${emp.name} - سند رقم ${voucherId}`;
          journalLines = [
            { account: `رواتب وأجور / سلف موظفين: ${emp.name}`, debit: amount, credit: 0 },
            { account: 'الخزينة العامة', debit: 0, credit: amount }
          ];
        } else if (vEmployeePaymentReason === 'custody') {
          voucherTitle = 'سند صرف عهدة مالية';
          journalNotes = `صرف عهدة مالية للموظف ${emp.name} - سند رقم ${voucherId}`;
          journalLines = [
            { account: `عهد موظفين: ${emp.name}`, debit: amount, credit: 0 },
            { account: 'الخزينة العامة', debit: 0, credit: amount }
          ];
        } else {
          voucherTitle = 'سند صرف راتب موظف';
          journalNotes = `تسليم راتب الموظف ${emp.name} - سند رقم ${voucherId}`;
          journalLines = [
            { account: `رواتب وأجور / سلف موظفين: ${emp.name}`, debit: amount, credit: 0 },
            { account: 'الخزينة العامة', debit: 0, credit: amount }
          ];
        }

        onUpdateEmployees(updatedEmployees);
        onUpdateTreasuryBalance(newTreasuryBalance);

      } else {
        partnerName = vManualExpenseRecipient || vCostCenter;
        partnerId = 'EXPENSE';
        partnerType = 'مصروف تشغيلي';
        previousBalance = 0;
        newBalance = 0;
        newTreasuryBalance = treasuryBalance - amount;
        voucherTitle = `سند صرف مصروفات - ${vCostCenter}`;
        journalNotes = `صرف مصروف تشغيلي - ${vCostCenter} - سند رقم ${voucherId}`;

        onUpdateTreasuryBalance(newTreasuryBalance);

        // Ledger: Debit Operational Expense, Credit Cash
        journalLines = [
          { account: `المصروفات التشغيلية: ${vCostCenter}`, debit: amount, credit: 0 },
          { account: 'الخزينة العامة', debit: 0, credit: amount }
        ];
      }

    } else if (vType === 'transfer') {
      // Internal accounting transfers (no cash effect on treasury)
      if (vTransferFlow === 'cust_to_supp') {
        const customer = customers.find(c => c.id === vTransferFromId);
        const supplier = suppliers.find(s => s.id === vTransferToId);
        if (!customer || !supplier) return;

        partnerName = `${customer.name} ➔ ${supplier.name}`;
        partnerId = `${customer.id}::${supplier.id}`;
        partnerType = 'تحويل مالي بين الحسابات';
        voucherTitle = 'سند تحويل مالي (عميل إلى مورد)';
        journalNotes = `تسوية حساب: تحويل مالي من العميل ${customer.name} للمورد ${supplier.name}`;

        // Customer debt decreases (receivables drop)
        const updatedCustomers = customers.map(c => 
          c.id === customer.id ? { ...c, balance: (c.balance || 0) - amount } : c
        );
        onUpdateCustomers(updatedCustomers);

        // We owe the supplier less (liabilities drop)
        onEditSupplier({
          ...supplier,
          balance: (supplier.balance || 0) - amount
        });

        // Ledger: Debit Supplier (Liability Decr), Credit Customer (Receivable Decr)
        journalLines = [
          { account: `حساب المورد: ${supplier.name}`, debit: amount, credit: 0 },
          { account: `حساب العميل: ${customer.name}`, debit: 0, credit: amount }
        ];

      } else if (vTransferFlow === 'supp_to_emp') {
        const supplier = suppliers.find(s => s.id === vTransferFromId);
        const emp = employees.find(e => e.id === vTransferToId);
        if (!supplier || !emp) return;

        partnerName = `${supplier.name} ➔ ${emp.name}`;
        partnerId = `${supplier.id}::${emp.id}`;
        partnerType = 'تحويل مالي بين الحسابات';
        voucherTitle = 'سند تحويل مالي (مورد إلى موظف)';
        journalNotes = `تحويل من المورد ${supplier.name} إلى حساب الموظف ${emp.name}`;

        // We owe supplier MORE because they paid employee on our behalf (liability rises)
        onEditSupplier({
          ...supplier,
          balance: (supplier.balance || 0) + amount
        });

        // Add history log to employee
        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            return {
              ...e,
              history: [{
                id: `TX-${Date.now().toString().slice(-5)}`,
                date: vDate,
                type: 'salary',
                amount: amount,
                notes: `تحويل مالي وارد من المورد: ${supplier.name}`
              }, ...(e.history || [])]
            };
          }
          return e;
        });
        onUpdateEmployees(updatedEmployees);

        // Ledger: Debit Salary Expense, Credit Supplier Liability
        journalLines = [
          { account: `رواتب وأجور / سلف موظفين: ${emp.name}`, debit: amount, credit: 0 },
          { account: `حساب المورد: ${supplier.name}`, debit: 0, credit: amount }
        ];

      } else if (vTransferFlow === 'emp_cust_to_supp') {
        const emp = employees.find(e => e.id === vTransferFromId);
        const supplier = suppliers.find(s => s.id === vTransferToId);
        if (!emp || !supplier) return;

        partnerName = `${emp.name} ➔ ${supplier.name}`;
        partnerId = `${emp.id}::${supplier.id}`;
        partnerType = 'تسوية عهدة موظف لغرض توريد';
        voucherTitle = 'سند تسوية عهدة وتحويل لمورد';
        journalNotes = `تسوية عهدة الموظف ${emp.name} لصالح المورد ${supplier.name}`;

        // Employee custody drops
        const updatedEmployees = employees.map(e => {
          if (e.id === emp.id) {
            return {
              ...e,
              custody: Math.max(0, (e.custody || 0) - amount),
              history: [{
                id: `TX-${Date.now().toString().slice(-5)}`,
                date: vDate,
                type: 'custody_return',
                amount: amount,
                notes: `تسوية عهدة مستندية للمورد: ${supplier.name}`
              }, ...(e.history || [])]
            };
          }
          return e;
        });
        onUpdateEmployees(updatedEmployees);

        // We owe the supplier less (liabilities drop)
        onEditSupplier({
          ...supplier,
          balance: (supplier.balance || 0) - amount
        });

        // Ledger: Debit Supplier, Credit Custody Account
        journalLines = [
          { account: `حساب المورد: ${supplier.name}`, debit: amount, credit: 0 },
          { account: `عهد موظفين: ${emp.name}`, debit: 0, credit: amount }
        ];
      }
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
      costCenter: vType === 'pay' && vTargetGroup === 'expense' ? vCostCenter : undefined
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

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    if (editingEmployee) {
      const updated = employees.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, name: empForm.name, role: empForm.role, phone: empForm.phone, email: empForm.email, salary: Number(empForm.salary) }
          : emp
      );
      onUpdateEmployees(updated);
      if (onLogAction) {
        onLogAction('edit', 'suppliers', `تم تحديث بيانات الموظف: ${empForm.name}`);
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
        history: [
          {
            id: `TX-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'salary' as const,
            amount: 0,
            notes: 'تم تسجيل الموظف في النظام بنجاح'
          }
        ]
      };
      onUpdateEmployees([...employees, newEmp]);
      if (onLogAction) {
        onLogAction('add', 'suppliers', `تم تسجيل موظف جديد: ${newEmp.name} براتب ${newEmp.salary.toLocaleString()} ر.ي`);
      }
    }

    setEmpForm({ name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0 });
    setEditingEmployee(null);
    setIsEmployeeModalOpen(false);
  };

  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm.notes.trim()) return;

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
        credit: Number(line.credit || 0)
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
        { account: '', debit: 0, credit: 0 },
        { account: '', debit: 0, credit: 0 }
      ]
    });
    setIsJournalModalOpen(false);
  };

  const handleAddJournalLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [...journalForm.lines, { account: '', debit: 0, credit: 0 }]
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

    if (subTab === 'suppliers') {
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
    if (subTab === 'suppliers') {
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

    if (subTab === 'suppliers') {
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
      partnerType: subTab === 'suppliers' ? 'مورد' : 'عميل',
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

    if (subTab === 'suppliers') {
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
    if (subTab === 'suppliers') {
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
      if (subTab === 'suppliers') {
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
          <div className="shrink-0">
            {subTab === 'suppliers' && !isFormOpen && (
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
                <span>إضافة مورد جديد 🏢</span>
              </button>
            )}
            {subTab === 'customers' && !isFormOpen && (
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
                <span>إضافة عميل جديد 👥</span>
              </button>
            )}
            {subTab === 'employees' && !isEmployeeModalOpen && (
              <button
                onClick={() => {
                  setIsEmployeeModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              >
                <Plus size={18} className="stroke-[3]" />
                <span>إضافة موظف جديد 👤</span>
              </button>
            )}
            {subTab === 'journal_entries' && !isJournalModalOpen && (
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
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-x-10 -translate-y-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1.5 text-center md:text-right">
            <span className="text-[10px] bg-blue-500/30 text-blue-100 font-black px-3 py-1 rounded-full border border-blue-400/20">
              صندوق الخزينة والسيولة المالية المعتمد
            </span>
            <h3 className="text-3xl sm:text-4xl font-black font-mono pt-1 text-white">
              {treasuryBalance.toLocaleString()} <span className="text-xs font-sans text-blue-200">ر.ي</span>
            </h3>
            <p className="text-[11px] text-blue-200 font-medium">
              تتأثر الخزينة فورياً بسندات الصرف للموردين (نقداً) وسندات القبض من العملاء (نقداً).
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/5 text-right space-y-1">
              <span className="text-[10px] text-blue-200 font-bold">مستحقات الموردين</span>
              <p className="text-sm font-black font-mono text-amber-300">{totalSuppliersBalance.toLocaleString()} ر.ي</p>
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/5 text-right space-y-1">
              <span className="text-[10px] text-blue-200 font-bold">مديونيات العملاء</span>
              <p className="text-sm font-black font-mono text-emerald-300">{totalCustomersBalance.toLocaleString()} ر.ي</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs between Suppliers, Customers, Employees, Vouchers, and Journal Entries */}
      <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 rounded-2xl w-full sm:w-fit gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => {
            setSubTab('suppliers');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'suppliers'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏢 الموردين
        </button>
        <button
          onClick={() => {
            setSubTab('customers');
            setSearch('');
            setIsFormOpen(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'customers'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 العملاء
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
          👤 الموظفين
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
          🧾 السندات
        </button>
        {(currentUser.role === 'Owner' || (currentUser.role as string) === 'Accountant' || currentUser.role === 'Admin') && (
          <button
            onClick={() => {
              setSubTab('journal_entries');
              setSearch('');
              setIsFormOpen(false);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'journal_entries'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 القيود المحاسبية
          </button>
        )}
      </div>

      {/* Stats Cards based on selected subTab */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subTab === 'suppliers' ? (
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
        ) : subTab === 'customers' ? (
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
        ) : subTab === 'journal_entries' ? (
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
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all"
              >
                تطبيق وحفظ السند
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Voucher Print Preview Dialog */}
      {showVoucherReceipt && lastCreatedVoucher && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-right">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                <span className="font-extrabold text-sm sm:text-base">معاينة وإصدار السند المالي المعتمد</span>
              </div>
              <button 
                onClick={() => setShowVoucherReceipt(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Print Section */}
            <div className="p-8 space-y-6 bg-slate-50/50" id="voucher-print-area">
              <div className="border-4 border-dashed border-slate-200 bg-white p-6 rounded-2xl relative">
                
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg text-slate-800">شركة المدى للخدمات اللوجستية</h3>
                    <p className="text-[10px] text-black font-extrabold">نظام المستودعات وسندات الحساب الذكي</p>
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-mono font-black">
                      {lastCreatedVoucher.id}
                    </span>
                    <p className="text-[10px] text-black font-black font-mono">{lastCreatedVoucher.date}</p>
                    <p className="text-[10px] text-black font-black font-mono">{lastCreatedVoucher.time}</p>
                  </div>
                </div>

                {/* Title badge */}
                <div className="text-center my-6">
                  <span className={`text-sm font-black px-6 py-2 rounded-full border ${
                    lastCreatedVoucher.isReceipt 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {lastCreatedVoucher.title}
                  </span>
                </div>

                {/* Voucher details ledger */}
                <div className="space-y-4 text-xs text-black font-black">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>صرف/قبض لـ:</span>
                    <strong className="text-slate-800 font-black">{lastCreatedVoucher.partnerName} ({lastCreatedVoucher.partnerType})</strong>
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

      {/* Search & Action bar */}
      <div className="bg-white p-4.5 rounded-3xl border border-slate-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-2xl w-full">
            <Search className="text-slate-400 stroke-[2.5]" size={16} />
            <input
              type="text"
              placeholder={
                subTab === 'suppliers'
                  ? 'البحث السريع بـ اسم المورد، رقم الهاتف، أو البريد الإلكتروني...'
                  : subTab === 'customers'
                  ? 'البحث السريع بـ اسم العميل، رقم الهاتف، أو البريد الإلكتروني...'
                  : 'البحث في السندات بـ رقم السند، اسم المستلم/الجهة، أو مركز التكلفة والبيان...'
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

      {/* Partners Grid Layout */}
      {subTab === 'suppliers' ? (
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
      ) : subTab === 'customers' ? (
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
      ) : subTab === 'journal_entries' ? (
        <div className="space-y-6">
          {/* Manual Journal Entry Composer Modal */}
          {isJournalModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-2xl space-y-4 text-right animate-scale-up" dir="rtl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    تسجيل قيد محاسبي يدوي مزدوج (Double-Entry Posting) 📊
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setIsJournalModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleJournalSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">البيان والشرح العام للقيد (مطلوب)</label>
                      <input
                        type="text"
                        required
                        value={journalForm.notes}
                        onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })}
                        placeholder="مثال: تسوية فروقات حساب الإيرادات السنوية"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الرقم المرجعي (اختياري)</label>
                      <input
                        type="text"
                        value={journalForm.reference}
                        onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                        placeholder="مثال: تسوية-2026"
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الاستحقاق المحاسبي</label>
                      <input
                        type="date"
                        required
                        value={journalForm.date}
                        onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Lines container */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-600">سطور القيد المزدوج المحاسبي</span>
                      <button
                        type="button"
                        onClick={handleAddJournalLine}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg"
                      >
                        + إضافة سطر حساب
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                      {journalForm.lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <input
                              type="text"
                              required
                              placeholder="اسم الحساب الفرعي (مثال: الخزينة العامة)"
                              value={line.account}
                              onChange={(e) => {
                                const newLines = [...journalForm.lines];
                                newLines[idx].account = e.target.value;
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                            />
                          </div>
                          <div className="col-span-2.5">
                            <input
                              type="number"
                              placeholder="مدين (Debit)"
                              value={line.debit || ''}
                              onChange={(e) => {
                                const newLines = [...journalForm.lines];
                                newLines[idx].debit = Number(e.target.value);
                                newLines[idx].credit = 0; // standard double-entry
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-2 rounded-xl text-xs font-black text-center"
                            />
                          </div>
                          <div className="col-span-2.5">
                            <input
                              type="number"
                              placeholder="دائن (Credit)"
                              value={line.credit || ''}
                              onChange={(e) => {
                                const newLines = [...journalForm.lines];
                                newLines[idx].credit = Number(e.target.value);
                                newLines[idx].debit = 0; // standard double-entry
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-full bg-rose-50 text-rose-700 border border-rose-100 px-2 py-2 rounded-xl text-xs font-black text-center"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              disabled={journalForm.lines.length <= 2}
                              onClick={() => handleRemoveJournalLine(idx)}
                              className="text-red-500 hover:text-red-700 p-1.5 disabled:opacity-30"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Balance validator footer */}
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl text-xs font-bold">
                      <span className="text-slate-500">حالة الموازنة الحسابية:</span>
                      <div className="flex gap-4 font-mono">
                        <span className="text-emerald-600">مدين: {journalForm.lines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}</span>
                        <span className="text-rose-600">دائن: {journalForm.lines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}</span>
                        <span className={journalForm.lines.reduce((sum, l) => sum + l.debit, 0) === journalForm.lines.reduce((sum, l) => sum + l.credit, 0) && journalForm.lines.reduce((sum, l) => sum + l.debit, 0) > 0 ? "text-emerald-700" : "text-red-500"}>
                          {journalForm.lines.reduce((sum, l) => sum + l.debit, 0) === journalForm.lines.reduce((sum, l) => sum + l.credit, 0) && journalForm.lines.reduce((sum, l) => sum + l.debit, 0) > 0 ? "✅ متزن" : "❌ غير متزن"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsJournalModalOpen(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      إلغاء التراجع
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      ترحيل القيد للمحاسبة 📊
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Journal Entries List Grid */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">دفتر اليومية العامة والقيود المعتمدة 📊</h3>
              <p className="text-[11px] text-black font-black mt-0.5">القيود المحاسبية المولدة آلياً أو المدخلة يدوياً بقيد مزدوج متوازن للمالية</p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredJournalEntries.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm font-bold">لا توجد قيود محاسبية تطابق البحث حالياً!</p>
                  <p className="text-xs mt-1">المعاملات المالية تولد قيوداً آلياً، أو يمكنك إضافة قيد يدوي.</p>
                </div>
              ) : (
                filteredJournalEntries.map((entry) => {
                  return (
                    <div key={entry.id} className="p-5 space-y-3">
                      {/* Entry Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg font-mono">
                            {entry.id}
                          </span>
                          <span className="text-[11px] text-slate-900 font-black font-mono">
                            التاريخ: {entry.date}
                          </span>
                          <span className="text-[11px] text-slate-900 font-black">
                            المرجع: {entry.reference}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {entry.isReversed ? (
                            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 animate-pulse">
                              <RefreshCcw size={12} />
                              <span>قيد معكوس ملغي (Storno)</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من عكس وإلغاء القيد المحاسبي "${entry.id}" بالكامل لتصحيحه (Storno Reversal)؟ سيقوم النظام بتسوية الحسابات المقابلة وتوليد قيد تسوية عكسي آلياً.`)) {
                                  handleReverseJournalEntry(entry.id);
                                }
                              }}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <RefreshCcw size={12} />
                              <span>عكس وإلغاء القيد (Storno) 🔄</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Entry Statement */}
                      <p className="text-xs font-bold text-black bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-black font-black ml-1 font-sans">البيان:</span> {entry.notes}
                      </p>

                      {/* Double-Entry Lines Table */}
                      <div className="overflow-hidden border border-slate-100 rounded-2xl">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-black font-black">
                              <th className="p-2.5 text-right font-black">الحساب الدفتري</th>
                              <th className="p-2.5 text-center font-black w-28">مدين (Debit)</th>
                              <th className="p-2.5 text-center font-black w-28">دائن (Credit)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {entry.lines.map((line: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2.5 text-slate-700 font-bold">{line.account}</td>
                                <td className="p-2.5 text-center font-mono font-black text-emerald-600">
                                  {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                                </td>
                                <td className="p-2.5 text-center font-mono font-black text-rose-600">
                                  {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-100/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">دفتر السندات المالية العام 📑</h3>
              <p className="text-[11px] text-black font-black mt-0.5">سجل كامل بجميع المقبوضات والمدفوعات والمصروفات التشغيلية المؤتمتة</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg">
                📥 قبض: {receiptVouchers.length}
              </span>
              <span className="text-[10px] bg-rose-50 text-rose-700 font-extrabold px-2.5 py-1 rounded-lg">
                💸 صرف: {paymentVouchers.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredVouchers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <FileText size={40} className="mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-bold">لا يوجد أي سندات مالية مطابقة حالياً!</p>
                <p className="text-xs text-slate-400">انقر على زر "إصدار سند مالي جديد" أعلاه لبدء أتمتة حساباتك</p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-black font-black border-b border-slate-100">
                    <th className="p-4">رقم السند</th>
                    <th className="p-4">التاريخ والوقت</th>
                    <th className="p-4">نوع الحركة</th>
                    <th className="p-4">الجهة / المستفيد</th>
                    <th className="p-4 text-left">المبلغ</th>
                    <th className="p-4">البيان والملاحظات</th>
                    <th className="p-4 text-center">المسؤول</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">
                          {voucher.id}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-mono text-[11px] font-bold text-slate-600">{voucher.date}</p>
                          <p className="font-mono text-[10px] text-slate-400">{voucher.time}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          voucher.title && (voucher.title.includes('تحويل') || voucher.title.includes('تسوية عهدة'))
                            ? 'bg-blue-50 border-blue-100 text-blue-700'
                            : voucher.isReceipt
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            voucher.title && (voucher.title.includes('تحويل') || voucher.title.includes('تسوية عهدة'))
                              ? 'bg-blue-500'
                              : voucher.isReceipt 
                              ? 'bg-emerald-500' 
                              : 'bg-rose-500'
                          }`}></span>
                          {voucher.title && (voucher.title.includes('تحويل') || voucher.title.includes('تسوية عهدة'))
                            ? 'سند تحويل 🔄'
                            : voucher.isReceipt 
                            ? 'سند قبض 📥' 
                            : 'سند صرف 💸'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-800">{voucher.partnerName}</p>
                          <span className="text-[10px] text-black font-bold bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100/50">
                            {voucher.partnerType}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-left">
                        <span className={`font-mono font-black text-xs ${
                          voucher.title && (voucher.title.includes('تحويل') || voucher.title.includes('تسوية عهدة'))
                            ? 'text-blue-600'
                            : voucher.isReceipt 
                            ? 'text-emerald-600' 
                            : 'text-rose-600'
                        }`}>
                          {voucher.title && (voucher.title.includes('تحويل') || voucher.title.includes('تسوية عهدة'))
                            ? '🔄 '
                            : voucher.isReceipt 
                            ? '+' 
                            : '-'}{voucher.amount.toLocaleString()} ر.ي
                        </span>
                      </td>
                      <td className="p-4 max-w-[200px] truncate" title={voucher.notes}>
                        <div className="space-y-0.5">
                          <p className="text-slate-600 truncate font-bold">{voucher.notes}</p>
                          {voucher.costCenter && (
                            <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md font-black">
                              مركز تكلفة: {voucher.costCenter}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                        👤 {voucher.createdBy}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setLastCreatedVoucher(voucher);
                            setShowVoucherReceipt(true);
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Printer size={12} />
                          <span>معاينة وطباعة 🖨️</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

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
              
              {/* Type: Pay vs Receive vs Transfer */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500">نوع السند المالي</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setVType('pay');
                      setVTargetGroup('supplier');
                      setVSelectedTargetId('');
                    }}
                    className={`p-3.5 rounded-2xl border text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'pay'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>💸 سند صرف نقدي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVType('receive');
                      setVTargetGroup('customer');
                      setVSelectedTargetId('');
                    }}
                    className={`p-3.5 rounded-2xl border text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'receive'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>📥 سند قبض نقدي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVType('transfer');
                      setVTransferFlow('cust_to_supp');
                      setVTransferFromId('');
                      setVTransferToId('');
                    }}
                    className={`p-3.5 rounded-2xl border text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vType === 'transfer'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🔄 سند تحويل مالي</span>
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
                      👤 موظف / عهدة
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

              {/* Transfer Flow Selection (Only if Transfer) */}
              {vType === 'transfer' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-slate-500">مسار التحويل المالي</label>
                    <select
                      value={vTransferFlow}
                      onChange={(e) => {
                        setVTransferFlow(e.target.value as any);
                        setVTransferFromId('');
                        setVTransferToId('');
                      }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500 text-right"
                    >
                      <option value="cust_to_supp">🔄 من حساب عميل ➔ إلى حساب مورد</option>
                      <option value="supp_to_emp">🔄 من حساب مورد ➔ إلى حساب موظف (راتب/سلفة)</option>
                      <option value="emp_cust_to_supp">🔄 من عهدة موظف ➔ تسوية إلى حساب مورد</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Source selection */}
                    <div className="space-y-1 text-right">
                      <label className="block text-xs font-black text-slate-500">
                        {vTransferFlow === 'cust_to_supp' && 'العميل (المحول منه)'}
                        {vTransferFlow === 'supp_to_emp' && 'المورد (المحول منه)'}
                        {vTransferFlow === 'emp_cust_to_supp' && 'الموظف (المحول من عهدته)'}
                      </label>
                      
                      {vTransferFlow === 'cust_to_supp' && (
                        <select
                          value={vTransferFromId}
                          onChange={(e) => setVTransferFromId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر العميل --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} (المديونية: {(c.balance || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      )}

                      {vTransferFlow === 'supp_to_emp' && (
                        <select
                          value={vTransferFromId}
                          onChange={(e) => setVTransferFromId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر المورد --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (المستحق له: {(s.balance || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      )}

                      {vTransferFlow === 'emp_cust_to_supp' && (
                        <select
                          value={vTransferFromId}
                          onChange={(e) => setVTransferFromId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر الموظف --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} (العهدة الحالية: {(emp.custody || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Destination selection */}
                    <div className="space-y-1 text-right">
                      <label className="block text-xs font-black text-slate-500">
                        {vTransferFlow === 'cust_to_supp' && 'المورد (المحول إليه)'}
                        {vTransferFlow === 'supp_to_emp' && 'الموظف (المحول إليه)'}
                        {vTransferFlow === 'emp_cust_to_supp' && 'المورد (المحول إليه)'}
                      </label>

                      {vTransferFlow === 'cust_to_supp' && (
                        <select
                          value={vTransferToId}
                          onChange={(e) => setVTransferToId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر المورد --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (المستحق له: {(s.balance || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      )}

                      {vTransferFlow === 'supp_to_emp' && (
                        <select
                          value={vTransferToId}
                          onChange={(e) => setVTransferToId(e.target.value)}
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
                      )}

                      {vTransferFlow === 'emp_cust_to_supp' && (
                        <select
                          value={vTransferToId}
                          onChange={(e) => setVTransferToId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="">-- اختر المورد --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (المستحق له: {(s.balance || 0).toLocaleString()} ر.ي)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dropdown/Selection based on selection */}
              {vType !== 'transfer' && (
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
                    <select
                      value={vSelectedTargetId}
                      onChange={(e) => setVSelectedTargetId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- اختر الموظف من الكادر المسجل --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role} - الراتب: {(emp.salary || 0).toLocaleString()} ر.ي)
                        </option>
                      ))}
                    </select>
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

    </div>
  );
}
