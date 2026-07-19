import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  UserPlus,
  X, 
  Check, 
  Search, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  Calendar, 
  Award, 
  MapPin, 
  Fingerprint, 
  File, 
  Upload, 
  Shield, 
  Activity, 
  AlertCircle, 
  Clock,
  FileText
} from 'lucide-react';

interface HRViewProps {
  employees: any[];
  onUpdateEmployees: (employees: any[]) => void;
  journalEntries: any[];
  onUpdateJournalEntries: (entries: any[]) => void;
  treasuryBalance: number;
  onUpdateTreasuryBalance: (balance: number) => void;
  invoiceSettings: any;
  onUpdateInvoiceSettings: (settings: any) => void;
  onLogAction?: (
    action: 'add' | 'edit' | 'delete' | 'sync' | 'import' | 'other',
    entityType: 'items' | 'movements' | 'suppliers' | 'warehouses' | 'transfers' | 'system',
    details: string
  ) => void;
  currentUser: any;
  search: string;
  isDataLocked: boolean;
  setVType: (v: string) => void;
  setVTargetGroup: (v: string) => void;
  setVSelectedTargetId: (v: string) => void;
  setIsVoucherModalOpen: (v: boolean) => void;
  setStatementPartner: (v: any) => void;
  setStatementPartnerType: (v: string) => void;
  setIsStatementModalOpen: (v: boolean) => void;
}

export default function HRView({
  employees = [],
  onUpdateEmployees,
  journalEntries = [],
  onUpdateJournalEntries,
  treasuryBalance,
  onUpdateTreasuryBalance,
  invoiceSettings,
  onUpdateInvoiceSettings,
  onLogAction,
  currentUser,
  search,
  isDataLocked,
  setVType,
  setVTargetGroup,
  setVSelectedTargetId,
  setIsVoucherModalOpen,
  setStatementPartner,
  setStatementPartnerType,
  setIsStatementModalOpen
}: HRViewProps) {
  // Subtab State
  const [hrActiveTab, setHrActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'requests' | 'attendance'>('dashboard');

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Form State for Employee registration
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

  // Digital Archive Attachment input
  const [attachmentForm, setAttachmentForm] = useState({
    name: '',
    fileType: 'عقد عمل موقع PDF'
  });

  // Monthly variations (Overtime, Bonus, Deductions) states
  const [isAddVariationModalOpen, setIsAddVariationModalOpen] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [variationForm, setVariationForm] = useState({
    employeeId: '',
    type: 'bonus' as 'bonus' | 'overtime' | 'deduction',
    amountType: 'flat' as 'flat' | 'hourly',
    hours: '' as string | number,
    hourlyRate: '' as string | number,
    flatAmount: '' as string | number,
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Payroll state variables
  const [payrollMonth, setPayrollMonth] = useState<string>('2026-07');
  const [generatedPayroll, setGeneratedPayroll] = useState<any[] | null>(null);
  const [payrollFundingSource, setPayrollFundingSource] = useState<string>('cash'); // 'cash' or bank account id
  const [isPayrollApproved, setIsPayrollApproved] = useState<boolean>(false);
  const [approvedPayrollMonth, setApprovedPayrollMonth] = useState<string>('');

  // Normalize helper
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
      monthlyVariations: emp.monthlyVariations || []
    };
  };

  // Detailed salary calculation for selected month
  const getDetailedSalaryForMonth = (rawEmp: any, monthStr: string) => {
    const emp = getNormalizedEmployee(rawEmp);
    const basic = emp.salary || 0;
    const allowances = (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.appearanceAllowance || 0);
    
    // 1. Overtime and bonuses from monthlyVariations
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
    const lateDeduction = Math.round(lateMinutesTotal * (basic / 30 / 8 / 60)); // basic salary / 30 days / 8 hours / 60 mins
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

  // Filtered employees list based on search bar
  const filteredEmployees = employees.map(getNormalizedEmployee).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role && e.role.toLowerCase().includes(search.toLowerCase())) ||
    (e.phone && e.phone.includes(search))
  );

  // Auto create manual journal entries helper
  const createAutoJournalEntry = (args: {
    notes: string;
    reference: string;
    lines: { account: string; debit: number; credit: number }[];
    date?: string;
  }) => {
    const nextId = `JV-${1001 + journalEntries.length}`;
    const newEntry = {
      id: nextId,
      date: args.date || new Date().toISOString().split('T')[0],
      notes: args.notes,
      reference: args.reference,
      createdBy: currentUser.username || 'System',
      isReversed: false,
      lines: args.lines
    };
    onUpdateJournalEntries([newEntry, ...journalEntries]);
    return newEntry;
  };

  // Submit employee form
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

  // Submit loan request
  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { employeeId, amount, months, startMonth, reason } = loanForm;
    if (!employeeId || amount <= 0) {
      alert('يرجى اختيار الموظف والمبلغ المطلوب');
      return;
    }

    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const installmentAmount = Math.round(amount / months);
    const schedule: any[] = [];
    const dateObj = new Date(startMonth + '-20'); // arbitrary day in that month
    for (let i = 0; i < months; i++) {
      const monthStr = dateObj.toISOString().slice(0, 7);
      schedule.push({
        month: monthStr,
        amount: installmentAmount,
        isDeducted: false
      });
      dateObj.setMonth(dateObj.getMonth() + 1);
    }

    const newLoan = {
      id: `LOAN-${Date.now().toString().slice(-6)}`,
      amount,
      remainingAmount: amount,
      monthlyInstallment: installmentAmount,
      months,
      status: 'pending' as const,
      date: new Date().toISOString().split('T')[0],
      reason: reason || 'سلفة معيشة عامة',
      schedule
    };

    const updated = employees.map(e => {
      if (e.id === employeeId) {
        const loansList = e.loans || [];
        return {
          ...e,
          loans: [...loansList, newLoan]
        };
      }
      return e;
    });

    onUpdateEmployees(updated);
    alert('تم تقديم طلب السلفة بنجاح وهو بانتظار اعتماد الإدارة المالية 📝');
    setLoanForm({
      employeeId: '',
      amount: 50000,
      months: 5,
      startMonth: '2026-07',
      reason: ''
    });
  };

  // Approve loan request workflow
  const handleApproveLoan = (empId: string, loanId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const loanObj = (emp.loans || []).find((l: any) => l.id === loanId);
    if (!loanObj) return;

    const fundingSource = 'cash'; // Default treasury
    if (treasuryBalance < loanObj.amount) {
      alert('خطأ في الاعتماد: الرصيد المتوفر بالخزينة لا يكفي لصرف هذه السلفة!');
      return;
    }

    // 1. Deduct from Treasury
    onUpdateTreasuryBalance(treasuryBalance - loanObj.amount);

    // 2. Post automatic Journal Entry: Debit Advances (Asset), Credit Treasury (Asset)
    const journalRef = `LOAN-VCH-${loanId}`;
    createAutoJournalEntry({
      notes: `صرف سلفة شخصية للموظف ${emp.name} بقيمة ${loanObj.amount.toLocaleString()} ر.ي`,
      reference: journalRef,
      lines: [
        { account: 'حـ/ سلف وعهد موظفين', debit: loanObj.amount, credit: 0 },
        { account: 'الخزينة العامة', debit: 0, credit: loanObj.amount }
      ],
      date: new Date().toISOString().split('T')[0]
    });

    // 3. Update employee state
    const updated = employees.map(e => {
      if (e.id === empId) {
        const updatedLoans = (e.loans || []).map((l: any) => 
          l.id === loanId ? { ...l, status: 'approved' as const } : l
        );
        const currentAdvances = Number(e.advances) || 0;
        const updatedHistory = [
          {
            id: `TX-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'advance' as const,
            amount: loanObj.amount,
            notes: `صرف سلفة مالية رقم ${loanId} بجدولة استقطاع ${loanObj.monthlyInstallment.toLocaleString()} ر.ي/شهر`
          },
          ...(e.history || [])
        ];

        return {
          ...e,
          loans: updatedLoans,
          advances: currentAdvances + loanObj.amount,
          history: updatedHistory
        };
      }
      return e;
    });

    onUpdateEmployees(updated);
    if (onLogAction) {
      onLogAction('add', 'suppliers', `تم اعتماد وصرف سلفة الموظف ${emp.name} بقيمة ${loanObj.amount.toLocaleString()} ر.ي بنجاح`);
    }
    alert('✅ تم اعتماد وصرف السلفة للموظف وتوليد قيد التسوية والدفع التلقائي بنجاح!');
  };

  // Reject loan request
  const handleRejectLoan = (empId: string, loanId: string) => {
    const updated = employees.map(e => {
      if (e.id === empId) {
        const updatedLoans = (e.loans || []).map((l: any) => 
          l.id === loanId ? { ...l, status: 'rejected' as const } : l
        );
        return { ...e, loans: updatedLoans };
      }
      return e;
    });
    onUpdateEmployees(updated);
    alert('تم رفض طلب السلفة بنجاح.');
  };

  // Submit leave request
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { employeeId, type, startDate, endDate, notes } = leaveForm;
    if (!employeeId) {
      alert('الرجاء اختيار الموظف');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 0) {
      alert('تاريخ انتهاء الإجازة يجب أن يكون لاحقاً لتاريخ بدئها');
      return;
    }

    const newLeave = {
      id: `LV-${Date.now().toString().slice(-5)}`,
      type,
      startDate,
      endDate,
      days: diffDays,
      status: 'pending' as const,
      notes: notes || 'طلب إجازة كادر'
    };

    const updated = employees.map(e => {
      if (e.id === employeeId) {
        const leavesList = e.leaves || [];
        return {
          ...e,
          leaves: [...leavesList, newLeave]
        };
      }
      return e;
    });

    onUpdateEmployees(updated);
    alert(`تم تسجيل طلب الإجازة بنجاح (المدة: ${diffDays} يوم) وهي معلقة بانتظار الاعتماد الإداري 📝`);
    setLeaveForm({
      employeeId: '',
      type: 'annual',
      startDate: '2026-07-15',
      endDate: '2026-07-20',
      notes: ''
    });
  };

  // Approve leave request
  const handleApproveLeave = (empId: string, leaveId: string) => {
    const updated = employees.map(e => {
      if (e.id === empId) {
        const updatedLeaves = (e.leaves || []).map((lv: any) => 
          lv.id === leaveId ? { ...lv, status: 'approved' as const } : lv
        );
        return { ...e, leaves: updatedLeaves };
      }
      return e;
    });
    onUpdateEmployees(updated);
    alert('✅ تم اعتماد الإجازة للموظف بنجاح وسيباشر احتساب المتغيرات الشهرية وفق نوع الإجازة.');
  };

  // Reject leave request
  const handleRejectLeave = (empId: string, leaveId: string) => {
    const updated = employees.map(e => {
      if (e.id === empId) {
        const updatedLeaves = (e.leaves || []).map((lv: any) => 
          lv.id === leaveId ? { ...lv, status: 'rejected' as const } : lv
        );
        return { ...e, leaves: updatedLeaves };
      }
      return e;
    });
    onUpdateEmployees(updated);
    alert('تم رفض طلب الإجازة.');
  };

  // Handle biometric simulated check-in/out
  const handleBiometricAction = (isCheckIn: boolean) => {
    if (!selectedHrEmployeeForAttendance) {
      alert('الرجاء اختيار الموظف أولاً');
      return;
    }

    const emp = employees.find(e => e.id === selectedHrEmployeeForAttendance);
    if (!emp) return;

    setIsScanningBiometric(true);
    setBiometricScanResult(null);

    setTimeout(() => {
      setIsScanningBiometric(false);
      
      if (!gpsSimulatedInside) {
        // Outside geofencing limit
        setBiometricScanResult({
          success: false,
          message: `❌ فشل التبصيم الحيوي: الموظف خارج النطاق الجغرافي لموقع العمل المسموح به! المسافة الحالية المقدرة: 3.4 كم، المسموح به: ${emp.geofencingRadius || 100} متر.`
        });
        return;
      }

      // Inside geofence
      const todayStr = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const checkTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM

      let status: 'present' | 'late' = 'present';
      let lateMinutes = 0;

      // Check if late (official start is 09:00 AM)
      if (isCheckIn) {
        const startHour = 9;
        const currentHour = currentTime.getHours();
        const currentMin = currentTime.getMinutes();
        if (currentHour > startHour || (currentHour === startHour && currentMin > 0)) {
          status = 'late';
          lateMinutes = (currentHour - startHour) * 60 + currentMin;
        }
      }

      const attendanceLog = {
        date: todayStr,
        checkIn: isCheckIn ? checkTimeStr : '09:00',
        checkOut: !isCheckIn ? checkTimeStr : '',
        status,
        lateMinutes,
        notes: isCheckIn ? 'تبصيم حضور ذكي بالبصمة الحيوية ومطابقة النطاق' : 'تبصيم انصراف ذكي ومطابقة النطاق'
      };

      const updated = employees.map(e => {
        if (e.id === selectedHrEmployeeForAttendance) {
          const logs = e.attendance || [];
          // Replace or append log for today
          const existingIdx = logs.findIndex((l: any) => l.date === todayStr);
          let newLogs = [...logs];
          if (existingIdx >= 0) {
            newLogs[existingIdx] = {
              ...newLogs[existingIdx],
              ...(isCheckIn ? { checkIn: checkTimeStr, status, lateMinutes } : { checkOut: checkTimeStr })
            };
          } else {
            newLogs.push(attendanceLog);
          }

          return { ...e, attendance: newLogs };
        }
        return e;
      });

      onUpdateEmployees(updated);
      setBiometricScanResult({
        success: true,
        message: `✅ تم التحقق ومطابقة البصمة الحيوية للموظف: ${emp.name} بنجاح!\nالنوع: ${isCheckIn ? 'حضور' : 'انصراف'} | الوقت: ${checkTimeStr} ${lateMinutes > 0 ? `| تأخير: ${lateMinutes} دقيقة` : ''}`
      });

    }, 1500); // scan animation duration
  };

  // Generate payroll lists
  const handleGeneratePayroll = () => {
    const list = employees.map(emp => {
      const calc = getDetailedSalaryForMonth(emp, payrollMonth);
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        ...calc
      };
    });
    setGeneratedPayroll(list);
    setIsPayrollApproved(false);
  };

  // Approve and disburse payroll
  const handleApproveAndDisbursePayroll = () => {
    if (!generatedPayroll || generatedPayroll.length === 0) return;

    const totalNetToPay = generatedPayroll.reduce((sum, e) => sum + e.net, 0);
    const totalGross = generatedPayroll.reduce((sum, e) => sum + e.gross, 0);
    const totalLoanDeductions = generatedPayroll.reduce((sum, e) => sum + e.loanDeduction, 0);

    // Balance check
    if (payrollFundingSource === 'cash') {
      if (treasuryBalance < totalNetToPay) {
        alert('خطأ في الصرف: الرصيد المتوفر بالخزينة العامة غير كافٍ لتغطية رواتب الكادر!');
        return;
      }
      onUpdateTreasuryBalance(treasuryBalance - totalNetToPay);
    } else {
      // Find bank account balance
      const bankAccounts = invoiceSettings?.bankAccounts || [];
      const bankAcc = bankAccounts.find((b: any) => b.id === payrollFundingSource);
      if (!bankAcc) {
        alert('خطأ في الحساب البنكي المحدد!');
        return;
      }
      if (bankAcc.balance < totalNetToPay) {
        alert(`خطأ في الصرف: الرصيد المتوفر في حساب ${bankAcc.name} غير كافٍ لتغطية رواتب الكادر!`);
        return;
      }
      // Deduct from bank account
      const updatedBanks = bankAccounts.map((b: any) => 
        b.id === payrollFundingSource ? { ...b, balance: b.balance - totalNetToPay } : b
      );
      onUpdateInvoiceSettings({ ...invoiceSettings, bankAccounts: updatedBanks });
    }

    // 1. Post automatically generated manual compound journal entry
    const journalRef = `PAYROLL-${payrollMonth}-${Date.now().toString().slice(-4)}`;
    const journalLines: any[] = [
      { account: 'حـ/ مصروفات الرواتب والأجور', debit: totalGross, credit: 0 },
      { account: payrollFundingSource === 'cash' ? 'الخزينة العامة' : `حساب البنك: ${(invoiceSettings?.bankAccounts || []).find((b: any) => b.id === payrollFundingSource)?.name || 'الرئيسي'}`, debit: 0, credit: totalNetToPay }
    ];
    if (totalLoanDeductions > 0) {
      journalLines.push({ account: 'حـ/ سلف وعهد موظفين', debit: 0, credit: totalLoanDeductions });
    }

    createAutoJournalEntry({
      notes: `صرف مسيّر رواتب الموظفين لشهر ${payrollMonth} - القيد الإجمالي المعتمد`,
      reference: journalRef,
      lines: journalLines,
      date: new Date().toISOString().split('T')[0]
    });

    // 2. Update employees states (Advances deduction, history, clear monthly variations)
    const updatedEmployees = employees.map(emp => {
      const payrollItem = generatedPayroll.find(p => p.id === emp.id);
      if (!payrollItem) return emp;

      // Deduct advances
      const advancesOutstanding = Number(emp.advances) || 0;
      const finalAdvances = Math.max(0, advancesOutstanding - payrollItem.loanDeduction);

      // Repayments schedule update
      const updatedLoans = (emp.loans || []).map((loan: any) => {
        if (loan.status === 'approved') {
          const updatedSchedule = (loan.schedule || []).map((s: any) => 
            s.month === payrollMonth ? { ...s, isDeducted: true } : s
          );
          const unpaidLeft = updatedSchedule.filter((s: any) => !s.isDeducted).reduce((sum: number, s: any) => sum + s.amount, 0);
          return {
            ...loan,
            remainingAmount: unpaidLeft,
            status: unpaidLeft === 0 ? 'completed' : 'approved',
            schedule: updatedSchedule
          };
        }
        return loan;
      });

      // Clear applied variations
      const updatedVariations = (emp.monthlyVariations || []).map((v: any) => ({ ...v, isApplied: true }));

      // Append History
      const updatedHistory = [
        {
          id: `TX-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString().split('T')[0],
          type: 'salary_payout' as const,
          amount: payrollItem.net,
          notes: `استلام راتب شهر ${payrollMonth} (أساسي: ${payrollItem.basic.toLocaleString()} | بدلات: ${payrollItem.allowances.toLocaleString()} | خصومات: ${payrollItem.totalDeductions.toLocaleString()})`
        },
        ...(emp.history || [])
      ];

      return {
        ...emp,
        advances: finalAdvances,
        loans: updatedLoans,
        monthlyVariations: updatedVariations,
        history: updatedHistory
      };
    });

    onUpdateEmployees(updatedEmployees);
    setIsPayrollApproved(true);
    setApprovedPayrollMonth(payrollMonth);

    if (onLogAction) {
      onLogAction('other', 'suppliers', `تم صرف واعتماد مسيّر رواتب شهر ${payrollMonth} لعدد ${generatedPayroll.length} موظف بإجمالي صافي مدفوع ${totalNetToPay.toLocaleString()} ر.ي`);
    }

    alert('🎉 تم صرف رواتب كادر الشركة بنجاح! وتم ترحيل القيد المحاسبي المزدوج وتعديل أرصدة الخزينة والعهود وتحديث سجلات الموظفين تلقائياً.');
  };

  // Upload attachment simulator
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !attachmentForm.name.trim()) return;

    const newAttachment = {
      id: `DOC-${Date.now().toString().slice(-5)}`,
      name: attachmentForm.name,
      fileType: attachmentForm.fileType,
      size: `${(1.2 + Math.random() * 4).toFixed(1)} MB`,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = employees.map(emp => {
      if (emp.id === selectedEmployee.id) {
        const list = emp.attachments || [];
        return {
          ...emp,
          attachments: [...list, newAttachment]
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setSelectedEmployee({
      ...selectedEmployee,
      attachments: [...(selectedEmployee.attachments || []), newAttachment]
    });
    setAttachmentForm({ name: '', fileType: 'عقد عمل موقع PDF' });
    alert('تم تحميل الوثيقة وأرشفتها إلكترونياً بملف الموظف بنجاح ✓');
  };

  // Delete attachment
  const handleDeleteAttachment = (attId: string) => {
    if (!selectedEmployee) return;

    const updated = employees.map(emp => {
      if (emp.id === selectedEmployee.id) {
        const list = (emp.attachments || []).filter((a: any) => a.id !== attId);
        return { ...emp, attachments: list };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setSelectedEmployee({
      ...selectedEmployee,
      attachments: (selectedEmployee.attachments || []).filter((a: any) => a.id !== attId)
    });
    alert('تم حذف الوثيقة المؤرشفة.');
  };

  // Add monthly variation handler
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

  // Delete monthly variation handler
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

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner and Horizontal Navigation Tabs */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <span>👥</span>
            <span>بوابة شؤون الموظفين الذكية ومسيّر الرواتب المتكامل (HR Suite)</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">أرشفة رقمية للعقود، مسيّر الرواتب المتصل بالدفتر العام، إدارة السلف والعهد، وبصمة الحضور الجغرافية ومطابقة النطاقات.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingEmployee(null);
            setEmpForm({ 
              name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0,
              housingAllowance: 0, transportAllowance: 0, appearanceAllowance: 0,
              workLocationLat: 15.3694, workLocationLng: 44.1910, geofencingRadius: 100,
              bankName: 'بنك التضامن الإسلامي', bankAccountNumber: '', bankAccountIban: '',
              hireDate: new Date().toISOString().split('T')[0],
              contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            setIsEmployeeModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus size={14} className="stroke-[2.5]" />
          <span>تسجيل عقد موظف جديد 👥</span>
        </button>
      </div>

      {/* Horizontal Nav Tabs */}
      <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setHrActiveTab('dashboard')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            hrActiveTab === 'dashboard' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Activity size={14} className={hrActiveTab === 'dashboard' ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
          <span>لوحة التحكم والمؤشرات</span>
        </button>
        <button
          type="button"
          onClick={() => setHrActiveTab('employees')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            hrActiveTab === 'employees' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <User size={14} className={hrActiveTab === 'employees' ? 'text-indigo-400' : 'text-slate-500'} />
          <span>ملفات الموظفين والعقود</span>
        </button>
        <button
          type="button"
          onClick={() => setHrActiveTab('payroll')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            hrActiveTab === 'payroll' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <FileText size={14} className={hrActiveTab === 'payroll' ? 'text-indigo-400' : 'text-slate-500'} />
          <span>مسيّر الرواتب والعمليات</span>
        </button>
        <button
          type="button"
          onClick={() => setHrActiveTab('requests')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            hrActiveTab === 'requests' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Calendar size={14} className={hrActiveTab === 'requests' ? 'text-indigo-400' : 'text-slate-500'} />
          <span>إدارة السلف والإجازات</span>
        </button>
        <button
          type="button"
          onClick={() => setHrActiveTab('attendance')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            hrActiveTab === 'attendance' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Clock size={14} className={hrActiveTab === 'attendance' ? 'text-indigo-400 animate-spin-slow' : 'text-slate-500'} />
          <span>البصمة الجغرافية والخدمة</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: DASHBOARD */}
      {hrActiveTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1 */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">إجمالي كادر الشركة</span>
                <span className="text-xl font-black text-slate-800">{employees.length} موظفين</span>
                <span className="text-[10px] text-indigo-600 font-bold block">عقود رسمية نشطة</span>
              </div>
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <User size={24} />
              </span>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">التزام الرواتب (الأساسي + البدلات)</span>
                <span className="text-xl font-black text-slate-800">
                  {employees.reduce((sum, e) => sum + (e.salary || 0) + (e.housingAllowance || 0) + (e.transportAllowance || 0) + (e.appearanceAllowance || 0), 0).toLocaleString()} <span className="text-xs">ر.ي</span>
                </span>
                <span className="text-[10px] text-amber-600 font-bold block">ميزانية دورية ثابتة شهرياً</span>
              </div>
              <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Award size={24} />
              </span>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">إجمالي السلف والذمم المعلقة</span>
                <span className="text-xl font-black text-rose-700">
                  {(employees.reduce((sum, e) => sum + (e.advances || 0), 0)).toLocaleString()} <span className="text-xs">ر.ي</span>
                </span>
                <span className="text-[10px] text-rose-500 font-bold block">ذمم مدينة (أصول متداولة)</span>
              </div>
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Shield size={24} />
              </span>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">إجازات الموظفين الجارية</span>
                <span className="text-xl font-black text-emerald-700">
                  {employees.filter(e => (e.leaves || []).some((l: any) => l.status === 'approved' && new Date() >= new Date(l.startDate) && new Date() <= new Date(l.endDate))).length} موظف
                </span>
                <span className="text-[10px] text-emerald-500 font-bold block">بموجب إجازة مصدق عليها</span>
              </div>
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Calendar size={24} />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Expiration Alerts */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="text-rose-500">⚠️</span>
                <span>تنبيهات العقود الإلكترونية وقرب الانتهاء (أقل من 30 يوماً)</span>
              </h3>

              {(() => {
                const alerts = employees.filter(e => {
                  if (!e.contractEndDate) return false;
                  const end = new Date(e.contractEndDate);
                  const diffTime = end.getTime() - Date.now();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays >= -10 && diffDays <= 30; // expired or expiring
                });

                if (alerts.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200/60">
                      <p className="text-xs font-bold text-emerald-700">✓ جميع العقود الإلكترونية سارية وصالحة تماماً ولا يوجد أي عقود توشك على الانتهاء حالياً.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {alerts.map(e => {
                      const end = new Date(e.contractEndDate);
                      const diffTime = end.getTime() - Date.now();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isExpired = diffDays < 0;

                      return (
                        <div key={e.id} className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                          isExpired ? 'bg-red-50 border-red-100 text-red-950' : 'bg-amber-50 border-amber-100 text-amber-950'
                        }`}>
                          <div className="space-y-0.5">
                            <span className="text-slate-800 font-extrabold">{e.name} ({e.role})</span>
                            <p className="text-[10px] text-slate-500">تاريخ الانتهاء: <span className="font-mono">{e.contractEndDate}</span></p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black ${
                            isExpired ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                            {isExpired ? `منتهي منذ ${Math.abs(diffDays)} يوم` : `ينتهي خلال ${diffDays} يوم`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Column 2: Action Center - Pending Requests */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="text-indigo-500">📝</span>
                <span>مركز طلبات الموظفين المعلقة بانتظار الاعتماد المالي والإداري</span>
              </h3>

              {(() => {
                const pendingLoans: any[] = [];
                const pendingLeaves: any[] = [];

                employees.forEach(e => {
                  (e.loans || []).forEach((l: any) => {
                    if (l.status === 'pending') pendingLoans.push({ emp: e, loan: l });
                  });
                  (e.leaves || []).forEach((lv: any) => {
                    if (lv.status === 'pending') pendingLeaves.push({ emp: e, leave: lv });
                  });
                });

                if (pendingLoans.length === 0 && pendingLeaves.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200/60">
                      <p className="text-xs font-bold">✓ لا توجد أي طلبات سلف أو إجازات معلقة بانتظار اتخاذ إجراء حالياً.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {/* Pending Loans */}
                    {pendingLoans.map(({ emp, loan }) => (
                      <div key={loan.id} className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-indigo-950">طلب سلفة شخصية: {emp.name}</span>
                          <span className="font-mono font-black text-indigo-700">{(loan.amount || 0).toLocaleString()} ر.ي</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                          <span>الجدولة: استقطاع {loan.monthlyInstallment.toLocaleString()} ر.ي/شهر × {loan.months} أشهر</span>
                          <span>السبب: {loan.reason}</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-1 border-t border-indigo-100/30">
                          <button
                            onClick={() => handleRejectLoan(emp.id, loan.id)}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            رفض الطلب ❌
                          </button>
                          <button
                            onClick={() => handleApproveLoan(emp.id, loan.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            اعتماد وصرف 💸
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Pending Leaves */}
                    {pendingLeaves.map(({ emp, leave }) => (
                      <div key={leave.id} className="p-3.5 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-emerald-950">طلب إجازة {leave.type === 'unpaid' ? 'غير مدفوعة' : 'مدفوعة الأجر'}: {emp.name}</span>
                          <span className="font-black text-emerald-700">{leave.days} أيام</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                          <span>الفترة: من {leave.startDate} إلى {leave.endDate}</span>
                          <span>ملاحظة: {leave.notes}</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-1 border-t border-emerald-100/30">
                          <button
                            onClick={() => handleRejectLeave(emp.id, leave.id)}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            رفض ❌
                          </button>
                          <button
                            onClick={() => handleApproveLeave(emp.id, leave.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            موافقة واعتماد 🟢
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEES & CONTRACTS */}
      {hrActiveTab === 'employees' && (
        <div className="space-y-6">
          {/* Top Controls and Actions Bar */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-3xs">
            <div>
              <h3 className="text-sm font-black text-slate-800">إدارة العقود والحركات الكادرية للشهر</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">تسجيل الإضافيات، الإكراميات والمكافآت، والجزاءات والخصومات المعلقة قبل اعتماد الرواتب.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsAddVariationModalOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm border border-indigo-100/40"
              >
                <span>⚡ تسجيل حركة استحقاق / خصم شهري</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                <p className="text-sm font-bold">لم يُعثر على أي موظف مطابق!</p>
                <p className="text-xs mt-1">تأكد من شروط البحث أو قم بتسجيل موظف جديد.</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const totalDue = (emp.advances || 0) + (emp.custody || 0);
                const isContractExpiringSoon = (() => {
                  const end = new Date(emp.contractEndDate);
                  const diffTime = end.getTime() - Date.now();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays >= 0 && diffDays <= 30;
                })();

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
                        <div className="flex gap-1">
                          {isContractExpiringSoon && (
                            <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                              ⚠️ قرب انتهاء العقد
                            </span>
                          )}
                          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-2.5 py-1 rounded-lg">
                            {emp.role || 'موظف بالكادر'}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-extrabold text-slate-800 text-sm sm:text-base pt-1">
                        {emp.name}
                      </h3>
                    </div>

                    {/* Salary details & allowance */}
                    <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-500">الراتب الأساسي:</span>
                        <span className="font-extrabold text-slate-800 font-mono">{(emp.salary || 0).toLocaleString()} ر.ي</span>
                      </div>
                      
                      <div className="flex justify-between items-center font-bold text-slate-500">
                        <span>إجمالي البدلات الثابتة:</span>
                        <span className="font-extrabold text-slate-700 font-mono">
                          {((emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.appearanceAllowance || 0)).toLocaleString()} ر.ي
                        </span>
                      </div>

                      {/* Advances & custody */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <div className="text-right">
                          <span className="text-slate-400 block font-bold">السلف الشخصية:</span>
                          <span className="font-black text-rose-700 font-mono">{(emp.advances || 0).toLocaleString()} ر.ي</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block font-bold">العهدة المالية:</span>
                          <span className="font-black text-amber-700 font-mono">{(emp.custody || 0).toLocaleString()} ر.ي</span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Accordion for Monthly Variations */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedEmpId(expandedEmpId === emp.id ? null : emp.id)}
                        className="w-full flex justify-between items-center text-[10px] text-slate-700 hover:text-slate-950 font-extrabold cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3 py-2.5 transition-all"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-600">⚡</span>
                          <span>الحركات الشهرية المعلقة ({emp.monthlyVariations?.length || 0})</span>
                        </div>
                        <span className="font-extrabold text-slate-400 text-[9px]">{expandedEmpId === emp.id ? 'إخفاء ▲' : 'عرض التفاصيل ▼'}</span>
                      </button>

                      {/* Expanded variations list */}
                      {expandedEmpId === emp.id && (
                        <div className="bg-white border-t border-slate-100 p-3 text-[10px] animate-scale-up text-right space-y-2">
                          {!emp.monthlyVariations || emp.monthlyVariations.length === 0 ? (
                            <p className="text-slate-400 italic text-center py-2 font-bold">لا توجد حركات معلقة مسجلة لهذا الشهر.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {emp.monthlyVariations.map((v: any) => (
                                <div key={v.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-start gap-1">
                                  <div className="text-right font-bold space-y-0.5">
                                    <span className="block text-slate-800 text-[10px]">
                                      {v.type === 'bonus' ? '🎁 إكرامية / مكافأة' : v.type === 'overtime' ? '⏱️ ساعات إضافية' : '🛑 خصم جزاء'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-bold">{v.reason}</span>
                                    <span className="text-[8px] text-slate-400 font-mono font-bold block">{v.date}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`font-mono font-black text-[10px] ${v.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {v.type === 'deduction' ? '-' : '+'}{Number(v.amount).toLocaleString()} ر.ي
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVariation(emp.id, v.id)}
                                      className="text-[8px] text-red-500 hover:text-red-700 font-black cursor-pointer bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded-md transition-all"
                                    >
                                      حذف 🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions and details footer */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <FileText size={12} />
                          <span>الملف الرقمي والعقد 📁</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setVType('pay');
                            setVTargetGroup('employee');
                            setVSelectedTargetId(emp.id);
                            setIsVoucherModalOpen(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer"
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
                              custody: emp.custody || 0,
                              housingAllowance: emp.housingAllowance || 0,
                              transportAllowance: emp.transportAllowance || 0,
                              appearanceAllowance: emp.appearanceAllowance || 0,
                              workLocationLat: emp.workLocationLat || 15.3694,
                              workLocationLng: emp.workLocationLng || 44.1910,
                              geofencingRadius: emp.geofencingRadius || 100,
                              bankName: emp.bankName || 'بنك التضامن الإسلامي',
                              bankAccountNumber: emp.bankAccountNumber || '',
                              bankAccountIban: emp.bankAccountIban || '',
                              hireDate: emp.hireDate || '2026-01-01',
                              contractEndDate: emp.contractEndDate || '2027-01-01'
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
                            if (confirm(`هل أنت متأكد من حذف وإقالة الموظف "${emp.name}" من الكادر؟`)) {
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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYROLL ENGINE */}
      {hrActiveTab === 'payroll' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800">توليد وصرف مسيّر الرواتب والاستحقاقات الشهرية</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">محرك حوسبة ذكي يربط الرواتب الأساسية والبدلات الثابتة بالاستقطاعات وسلف الموظفين والحضور.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">شهر الاستحقاق</label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black"
                />
              </div>

              <button
                type="button"
                onClick={handleGeneratePayroll}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer mt-3.5"
              >
                ⚡ توليد مسيّر الشهر
              </button>
            </div>
          </div>

          {generatedPayroll ? (
            <div className="space-y-6">
              {/* Spreadsheet Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                      <th className="p-3">الموظف</th>
                      <th className="p-3">الراتب الأساسي</th>
                      <th className="p-3">البدلات الثابتة (+)</th>
                      <th className="p-3">مكافآت وإضافي (+)</th>
                      <th className="p-3">خصومات وغياب (-)</th>
                      <th className="p-3">أقساط السلف (-)</th>
                      <th className="p-3 text-emerald-800">صافي المستحق للدفعة</th>
                      <th className="p-3">حساب الاستلام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPayroll.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 font-bold">
                        <td className="p-3">
                          <span className="block font-extrabold text-slate-800">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{p.id} | {p.role}</span>
                        </td>
                        <td className="p-3 font-mono">{(p.basic || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono text-emerald-600">+{p.allowances.toLocaleString()}</td>
                        <td className="p-3 font-mono text-emerald-600">+{p.overtime + p.bonus}</td>
                        <td className="p-3 font-mono text-rose-600">-{p.manualDeductions + p.unpaidLeaveDeduction + p.lateDeduction + p.absenceDeduction}</td>
                        <td className="p-3 font-mono text-rose-600">-{p.loanDeduction.toLocaleString()}</td>
                        <td className="p-3 font-mono font-black text-emerald-700 bg-emerald-50/30">{(p.net || 0).toLocaleString()} ر.ي</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-md block text-center">البنك المعتمد</span>
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="p-4">إجمالي مسيّر الرواتب:</td>
                      <td className="p-4 font-mono">
                        {generatedPayroll.reduce((sum, e) => sum + e.basic, 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono">
                        +{generatedPayroll.reduce((sum, e) => sum + e.allowances, 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono">
                        +{generatedPayroll.reduce((sum, e) => sum + (e.overtime + e.bonus), 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono">
                        -{generatedPayroll.reduce((sum, e) => sum + (e.manualDeductions + e.unpaidLeaveDeduction + e.lateDeduction + e.absenceDeduction), 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono">
                        -{generatedPayroll.reduce((sum, e) => sum + e.loanDeduction, 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-emerald-300 font-black" colSpan={2}>
                        {generatedPayroll.reduce((sum, e) => sum + e.net, 0).toLocaleString()} ر.ي
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Disbursement and Funding Settings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-800 block">إجمالي القيمة المطلوب دفعها نقداً أو تحويلاً:</span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {generatedPayroll.reduce((sum, e) => sum + e.net, 0).toLocaleString()} ر.ي
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">مصدر تمويل دفع الرواتب</label>
                    <select
                      value={payrollFundingSource}
                      onChange={(e) => setPayrollFundingSource(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="cash">الصندوق الرئيسي / الخزينة العامة ({treasuryBalance.toLocaleString()} ر.ي)</option>
                      {(invoiceSettings?.bankAccounts || []).map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name} - رقم: {b.accountNumber} ({b.balance.toLocaleString()} ر.ي)</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleApproveAndDisbursePayroll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer mt-3.5"
                  >
                    اعتماد وصرف رواتب مسيّر الشهر 💳
                  </button>
                </div>
              </div>

              {isPayrollApproved && approvedPayrollMonth === payrollMonth && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-2xl text-xs font-bold space-y-2">
                  <p className="flex items-center gap-2 text-emerald-800 font-black">
                    <span>✓</span>
                    <span>تم اعتماد وصرف مسيّر رواتب شهر {payrollMonth} بنجاح!</span>
                  </p>
                  <p className="text-slate-600">
                    تم إصدار القيد المحاسبي تلقائياً وتحويل المستحقات وخصم أقساط السلف الجدولة لشهر {payrollMonth}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/50">
              <p className="text-xs font-bold">يرجى تحديد الشهر المراد توليده والضغط على زر "توليد مسيّر الشهر" لحساب الاستحقاقات تلقائياً.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LOANS & LEAVES */}
      {hrActiveTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LOANS MANAGEMENT */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span>📝</span>
                <span>بوابة تقديم طلبات السلف المالية (جدولة الاستقطاعات)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">صرف سلف شخصية بآلية تقسيط وجدولة استقطاع شهري تلقائي عبر مسيّر الرواتب.</p>
            </div>

            <form onSubmit={handleLoanSubmit} className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">الموظف المستلف (مطلوب)</label>
                <select
                  required
                  value={loanForm.employeeId}
                  onChange={(e) => setLoanForm({ ...loanForm, employeeId: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-hidden"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} (الأساسي: {e.salary?.toLocaleString()} ر.ي)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">مبلغ السلفة (ر.ي)</label>
                  <input
                    type="number"
                    required
                    value={loanForm.amount}
                    onChange={(e) => setLoanForm({ ...loanForm, amount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">مدة السداد بالأشهر</label>
                  <select
                    value={loanForm.months}
                    onChange={(e) => setLoanForm({ ...loanForm, months: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(m => (
                      <option key={m} value={m}>{m} أشهر</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">بداية شهر الاستقطاع</label>
                  <input
                    type="month"
                    required
                    value={loanForm.startMonth}
                    onChange={(e) => setLoanForm({ ...loanForm, startMonth: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">سبب السلفة</label>
                  <input
                    type="text"
                    value={loanForm.reason}
                    onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                    placeholder="مثال: سلفة زواج، سلفة طارئة"
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              {loanForm.amount > 0 && (
                <div className="p-3 bg-indigo-50/50 rounded-xl text-[10px] text-indigo-900 font-bold flex justify-between">
                  <span>القسط الشهري التقديري:</span>
                  <span className="font-mono text-xs">{Math.round(loanForm.amount / loanForm.months).toLocaleString()} ر.ي / شهر</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                تقديم طلب السلفة للإدارة ⚡
              </button>
            </form>
          </div>

          {/* LEAVES MANAGEMENT */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span>🕒</span>
                <span>بوابة تقديم طلبات الإجازات (المدفوعة والغير مدفوعة)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">تقديم طلبات إجازة كادر، واحتساب الخصومات التلقائية للأيام غير المدفوعة الأجر.</p>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">الموظف طالب الإجازة (مطلوب)</label>
                <select
                  required
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-hidden"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع الإجازة</label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    <option value="annual">إجازة سنوية اعتيادية</option>
                    <option value="sick">إجازة مرضية بتقرير</option>
                    <option value="casual">إجازة طارئة / عارضة</option>
                    <option value="unpaid">إجازة غير مدفوعة الأجر (خصم من الراتب)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">مذكرة الإجازة</label>
                  <input
                    type="text"
                    value={leaveForm.notes}
                    onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                    placeholder="ملاحظات تفصيلية"
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              {leaveForm.startDate && leaveForm.endDate && (() => {
                const start = new Date(leaveForm.startDate);
                const end = new Date(leaveForm.endDate);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                if (diffDays > 0) {
                  return (
                    <div className="p-3 bg-emerald-50/50 text-emerald-900 rounded-xl text-[10px] font-bold flex justify-between">
                      <span>إجمالي عدد أيام الإجازة:</span>
                      <span className="font-mono text-xs">{diffDays} يوم</span>
                    </div>
                  );
                }
                return null;
              })()}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                تقديم طلب الإجازة للاعتماد ⚡
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE & GEOFENCING BIOMETRICS */}
      {hrActiveTab === 'attendance' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-base font-black text-slate-800">محاكي الخدمة الذاتية للموظفين (تبصيم GPS والحيوية)</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              محاكاة متكاملة لنظام الحضور الذاتي على الهواتف الذكية لمطابقة المدى الجغرافي (Geofencing) والبصمة الحيوية ومزامنتها تلقائياً مع كشف رواتب الموظف.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left: Mobile simulator frame */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-[40px] border-[10px] border-slate-800 shadow-xl flex flex-col justify-between space-y-5 min-h-[450px]">
              {/* Screen Top Header */}
              <div className="flex justify-between items-center text-[10px] font-bold font-mono border-b border-slate-800 pb-2">
                <span>09:12 AM</span>
                <span className="text-emerald-500">● GPS CONNECTED</span>
              </div>

              {/* Simulated Screen Body */}
              <div className="flex-1 flex flex-col justify-center space-y-4 text-center">
                <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold py-1 px-3 rounded-full inline-block mx-auto">
                  WMS Self-Service App
                </span>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-400">من فضلك اختر الموظف المستبصم</label>
                  <select
                    value={selectedHrEmployeeForAttendance}
                    onChange={(e) => {
                      setSelectedHrEmployeeForAttendance(e.target.value);
                      setBiometricScanResult(null);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-hidden"
                  >
                    <option value="">-- اختر الموظف لفتح تبصيمه --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>

                {selectedHrEmployeeForAttendance && (() => {
                  const emp = employees.map(getNormalizedEmployee).find(e => e.id === selectedHrEmployeeForAttendance);
                  if (!emp) return null;

                  return (
                    <div className="space-y-3">
                      {/* GPS geofence radius check widget */}
                      <div className="bg-slate-800/60 p-3 rounded-2xl text-right text-[10px] space-y-1.5">
                        <div className="flex justify-between font-bold">
                          <span>المقر الجغرافي:</span>
                          <span className="text-slate-300 font-mono">({emp.workLocationLat}, {emp.workLocationLng})</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>نطاق الأمان الجغرافي:</span>
                          <span className="text-indigo-400 font-mono">{emp.geofencingRadius} متر</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>المسافة التقديرية الحالية:</span>
                          <span className={gpsSimulatedInside ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                            {gpsSimulatedInside ? "15 متراً (داخل النطاق) ✓" : "3.4 كيلومتر (خارج النطاق) ❌"}
                          </span>
                        </div>
                      </div>

                      {/* Scanning visual */}
                      {isScanningBiometric ? (
                        <div className="relative w-24 h-24 bg-indigo-900/30 border border-indigo-500 rounded-full mx-auto flex items-center justify-center overflow-hidden">
                          <Fingerprint size={48} className="text-indigo-400 animate-pulse" />
                          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 animate-bounce shadow-md"></div>
                          <span className="absolute bottom-1.5 text-[8px] font-black tracking-wide text-indigo-300">جارٍ فحص البصمة...</span>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleBiometricAction(true)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Fingerprint size={14} />
                            <span>تبصيم حضور 🟢</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBiometricAction(false)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Clock size={14} />
                            <span>تبصيم انصراف 🔴</span>
                          </button>
                        </div>
                      )}

                      {/* Scan result display */}
                      {biometricScanResult && (
                        <div className={`p-3 rounded-xl text-right text-[10px] leading-relaxed ${
                          biometricScanResult.success ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900" : "bg-rose-950/50 text-rose-300 border border-rose-900"
                        }`}>
                          {biometricScanResult.message}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Home Indicator */}
              <div className="w-24 h-1 bg-slate-800 rounded-full mx-auto"></div>
            </div>

            {/* Right: Simulated Current Position control & explanation */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-3xl space-y-4 flex flex-col justify-between text-xs">
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span className="p-1 bg-indigo-100 text-indigo-700 rounded-lg"><MapPin size={14} /></span>
                  <span>لوحة محاكاة إحداثيات الـ GPS للموظف</span>
                </h4>
                
                <p className="text-slate-500 font-bold leading-relaxed">
                  بما أن التطبيق يعمل في متصفح آمن داخل حاوية Cloud Run، يمكنك استخدام الأزرار أدناه لمحاكاة وتعديل موقع الموظف الجغرافي بالنسبة لمقر العمل لرؤية تفاعل جدار الحماية الجغرافي (Geofencing GPS):
                </p>

                <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200/80">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">تحديد الإحداثي والموقع الافتراضي للمستبصم</span>
                  
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGpsSimulatedInside(true);
                        setBiometricScanResult(null);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-right font-bold transition-all text-xs cursor-pointer flex items-center justify-between ${
                        gpsSimulatedInside 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🟢 متواجد داخل مقر الشركة (صنعاء - الستين)</span>
                      <span className="font-mono text-[9px]">المسافة: 15م</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGpsSimulatedInside(false);
                        setBiometricScanResult(null);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-right font-bold transition-all text-xs cursor-pointer flex items-center justify-between ${
                        !gpsSimulatedInside 
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🔴 متواجد في المنزل / خارج نطاق العمل</span>
                      <span className="font-mono text-[9px]">المسافة: 3.4 كم</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40 font-bold space-y-1">
                <span className="text-slate-800 font-extrabold block">قواعد التأخير والاستقطاع:</span>
                <p className="text-[10px] text-slate-500">
                  1. يبدأ الدوام الرسمي في تمام الساعة 09:00 صباحاً.
                </p>
                <p className="text-[10px] text-slate-500">
                  2. أي تبصيم بعد 09:00 ص يتم احتسابه كتأخير دقائق تلقائي ويُخصم من مسيّر الراتب النهائي.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECTED EMPLOYEE DIGITAL PROFILE DRAWER / DIALOG */}
      {selectedEmployee && (() => {
        const emp = getNormalizedEmployee(selectedEmployee);
        const calc = getDetailedSalaryForMonth(emp, new Date().toISOString().slice(0, 7));
        const isContractExpiringSoon = (() => {
          const end = new Date(emp.contractEndDate);
          const diffTime = end.getTime() - Date.now();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        })();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white border border-slate-100 rounded-l-3xl p-6 shadow-2xl w-full max-w-2xl h-full overflow-y-auto text-right space-y-6 animate-slide-in" dir="rtl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  📁 الملف الإلكتروني والعقد المؤرشف للموظف: {emp.name}
                </h4>
                <button 
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold text-slate-600">
                {/* Contract details & core values */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-slate-800 font-extrabold border-b border-slate-200 pb-1 flex items-center gap-1">
                    <span className="p-1 bg-indigo-50 text-indigo-700 rounded-md"><File size={12} /></span>
                    <span>بيانات العقد الإلكتروني والراتب والبدلات</span>
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">الراتب الأساسي:</span>
                      <span className="font-mono text-slate-800">{emp.salary?.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">بدل السكن شهرياً:</span>
                      <span className="font-mono text-slate-800">{emp.housingAllowance?.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">بدل الانتقال والسيارة:</span>
                      <span className="font-mono text-slate-800">{emp.transportAllowance?.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">بدل المظهر والتمثيل:</span>
                      <span className="font-mono text-slate-800">{emp.appearanceAllowance?.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 font-extrabold text-slate-900">
                      <span>إجمالي الاستحقاق الثابت:</span>
                      <span className="font-mono">{(emp.salary + emp.housingAllowance + emp.transportAllowance + emp.appearanceAllowance).toLocaleString()} ر.ي</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[10px] text-slate-500 font-bold">
                    <div className="flex justify-between">
                      <span>تاريخ مباشرة التعيين:</span>
                      <span className="font-mono text-slate-800">{emp.hireDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تاريخ انتهاء التعاقد:</span>
                      <span className={`font-mono ${isContractExpiringSoon ? 'text-rose-600 font-black' : 'text-slate-800'}`}>{emp.contractEndDate}</span>
                    </div>
                  </div>
                </div>

                {/* Bank linking details */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-slate-800 font-extrabold border-b border-slate-200 pb-1 flex items-center gap-1">
                    <span className="p-1 bg-indigo-50 text-indigo-700 rounded-md"><Award size={12} /></span>
                    <span>بيانات الحساب البنكي الرسمي وتوطين الراتب</span>
                  </h4>

                  <div className="space-y-3 text-right">
                    <div>
                      <span className="text-slate-400 block text-[10px]">البنك المعين لصرف الراتب والمستحقات</span>
                      <span className="text-slate-800 block text-xs">{emp.bankName || 'بنك التضامن الإسلامي'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">رقم الحساب البنكي (Account Number)</span>
                      <span className="text-slate-800 block font-mono text-xs">{emp.bankAccountNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">رقم الآيبان الدولي (IBAN)</span>
                      <span className="text-slate-800 block font-mono text-[10px]">{emp.bankAccountIban || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ELECTRONIC ARCHIVE / ATTACHMENT MANAGER */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <h4 className="text-slate-800 font-extrabold border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <span className="p-1 bg-indigo-100 text-indigo-700 rounded-lg"><Upload size={14} /></span>
                  <span>الأرشفة الإلكترونية للمستندات والوثائق الثبوتية للموظف</span>
                </h4>

                <form onSubmit={handleAddAttachment} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">اسم المستند المرفوع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الهوية الوطنية للموظف، صورة المؤهل، العقد الموقع"
                      value={attachmentForm.name}
                      onChange={(e) => setAttachmentForm({ ...attachmentForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">نوع الوثيقة</label>
                    <select
                      value={attachmentForm.fileType}
                      onChange={(e) => setAttachmentForm({ ...attachmentForm, fileType: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-xs"
                    >
                      <option value="عقد عمل موقع PDF">عقد عمل موقع PDF</option>
                      <option value="البطاقة الشخصية / جواز السفر">البطاقة الشخصية / جواز السفر</option>
                      <option value="شهادة المؤهل الجامعي">شهادة المؤهل الجامعي</option>
                      <option value="شهادة الفحص الطبي">شهادة الفحص الطبي</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer mt-3.5"
                  >
                    + أرشفة وثيقة 📁
                  </button>
                </form>

                {/* List of attachments */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400">الوثائق المؤرشفة الحالية بملف الموظف</span>
                  
                  {emp.attachments?.length === 0 ? (
                    <p className="text-slate-400 italic text-[10px] py-2 text-center bg-white rounded-xl border border-slate-100">لا توجد مستندات مؤرشفة للموظف بعد.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {emp.attachments?.map((a: any) => (
                        <div key={a.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 font-bold text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-slate-100 text-slate-500 rounded-lg"><File size={14} /></span>
                            <div className="text-right">
                              <span className="text-slate-800 block">{a.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{a.fileType} | حجم: {a.size} | المؤرشف: {a.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => alert(`محاكاة تحميل ومعاينة المستند: "${a.name}" من خادم الأرشفة الذكي.`)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                            >
                              تحميل 📥
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(a.id)}
                              className="text-slate-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                              title="حذف الوثيقة"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions log list */}
              <div className="space-y-2 text-xs">
                <span className="block font-black text-slate-800">سجل المدفوعات والمعاملات الـ 5 الأخيرة</span>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 max-h-36 overflow-y-auto pr-1">
                  {!emp.history || emp.history.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-4 font-bold">لا توجد معاملات مسجلة للموظف بعد.</p>
                  ) : (
                    emp.history.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-start gap-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="text-right font-bold">
                          <span className="text-slate-800 block text-xs">{tx.notes}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-black">{tx.date}</span>
                        </div>
                        <span className={`font-mono font-extrabold shrink-0 ${
                          tx.type === 'advance' ? 'text-rose-700' : tx.type === 'custody_grant' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString()} ر.ي` : 'مسجل'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  إغلاق الملف الرقمي
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* NEW/EDIT EMPLOYEE DIALOG MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-xl space-y-4 text-right overflow-y-auto max-h-[90vh]" dir="rtl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                {editingEmployee ? 'تعديل بيانات الموظف وعقده 👤' : 'تسجيل عقد موظف جديد بالكادر 👤'}
              </h4>
              <button 
                type="button"
                onClick={() => {
                  setIsEmployeeModalOpen(false);
                  setEditingEmployee(null);
                  setEmpForm({ 
                    name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0,
                    housingAllowance: 0, transportAllowance: 0, appearanceAllowance: 0,
                    workLocationLat: 15.3694, workLocationLng: 44.1910, geofencingRadius: 100,
                    bankName: 'بنك التضامن الإسلامي', bankAccountNumber: '', bankAccountIban: '',
                    hireDate: new Date().toISOString().split('T')[0],
                    contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  });
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="space-y-4 text-xs font-bold text-slate-600">
              {/* Basic Section */}
              <div className="space-y-3">
                <span className="block text-indigo-700 font-extrabold border-b border-indigo-50 pb-1">1. البيانات الشخصية والوظيفية الأساسية</span>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الموظف الثلاثي (مطلوب)</label>
                  <input
                    type="text"
                    required
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    placeholder="مثال: أحمد عبد الله اليماني"
                    className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">المسمى الوظيفي</label>
                    <input
                      type="text"
                      value={empForm.role}
                      onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                      placeholder="مثال: محاسب، أمين مخزن"
                      className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الراتب الشهري الأساسي (ر.ي)</label>
                    <input
                      type="number"
                      required
                      value={empForm.salary}
                      onChange={(e) => setEmpForm({ ...empForm, salary: Number(e.target.value) })}
                      placeholder="مثال: 150000"
                      className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم الهاتف</label>
                    <input
                      type="text"
                      value={empForm.phone}
                      onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                      placeholder="77xxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl focus:outline-hidden text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={empForm.email}
                      onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      placeholder="employee@wms.com"
                      className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl focus:outline-hidden text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Allowances and contract dates */}
              <div className="space-y-3 pt-2">
                <span className="block text-indigo-700 font-extrabold border-b border-indigo-50 pb-1">2. البدلات الثابتة وتواريخ العقد</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">بدل السكن شهرياً</label>
                    <input
                      type="number"
                      value={empForm.housingAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, housingAllowance: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">بدل الانتقال والسيارة</label>
                    <input
                      type="number"
                      value={empForm.transportAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, transportAllowance: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">بدل مظهر وتمثيل</label>
                    <input
                      type="number"
                      value={empForm.appearanceAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, appearanceAllowance: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ مباشرة التعيين</label>
                    <input
                      type="date"
                      required
                      value={empForm.hireDate}
                      onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ انتهاء التعاقد</label>
                    <input
                      type="date"
                      required
                      value={empForm.contractEndDate}
                      onChange={(e) => setEmpForm({ ...empForm, contractEndDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Bank accounts */}
              <div className="space-y-3 pt-2">
                <span className="block text-indigo-700 font-extrabold border-b border-indigo-50 pb-1">3. بيانات توطين الراتب والحساب البنكي للموظف</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم البنك المعتمد</label>
                    <select
                      value={empForm.bankName}
                      onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden text-xs"
                    >
                      <option value="بنك التضامن الإسلامي">بنك التضامن الإسلامي</option>
                      <option value="بنك الكريمي الإسلامي">بنك الكريمي الإسلامي</option>
                      <option value="بنك اليمن والكويت">بنك اليمن والكويت</option>
                      <option value="بنك سبأ الإسلامي">بنك سبأ الإسلامي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم الحساب</label>
                    <input
                      type="text"
                      placeholder="رقم حساب الموظف"
                      value={empForm.bankAccountNumber}
                      onChange={(e) => setEmpForm({ ...empForm, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم الآيبان (IBAN)</label>
                    <input
                      type="text"
                      placeholder="YE..."
                      value={empForm.bankAccountIban}
                      onChange={(e) => setEmpForm({ ...empForm, bankAccountIban: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* GPS Work Coordinates and Geofencing */}
              <div className="space-y-3 pt-2">
                <span className="block text-indigo-700 font-extrabold border-b border-indigo-50 pb-1">4. الإحداثيات الجغرافية ومطابقة الحضور والانصراف (GPS)</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">خط العرض (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={empForm.workLocationLat}
                      onChange={(e) => setEmpForm({ ...empForm, workLocationLat: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">خط الطول (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={empForm.workLocationLng}
                      onChange={(e) => setEmpForm({ ...empForm, workLocationLng: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">نصف قطر السماح (متر)</label>
                    <select
                      value={empForm.geofencingRadius}
                      onChange={(e) => setEmpForm({ ...empForm, geofencingRadius: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl focus:outline-hidden text-xs"
                    >
                      <option value="50">50 متراً (دقيق جداً)</option>
                      <option value="100">100 متراً (قياسي)</option>
                      <option value="200">200 متراً (مفتوح)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEmployeeModalOpen(false);
                    setEditingEmployee(null);
                    setEmpForm({ 
                      name: '', role: 'موظف', phone: '', email: '', salary: 150000, advances: 0, custody: 0,
                      housingAllowance: 0, transportAllowance: 0, appearanceAllowance: 0,
                      workLocationLat: 15.3694, workLocationLng: 44.1910, geofencingRadius: 100,
                      bankName: 'بنك التضامن الإسلامي', bankAccountNumber: '', bankAccountIban: '',
                      hireDate: new Date().toISOString().split('T')[0],
                      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    });
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingEmployee ? 'حفظ التعديلات' : 'تسجيل العقد وتوثيقه بالكادر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MONTHLY VARIATION MODAL */}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-700 focus:outline-hidden text-left"
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVariationModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  تسجيل الحركة وتعميدها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
