import { create } from 'zustand';
import { ContractDebtGroup, ContractDebtMilestone } from '@/services/financeService';
import { formatDateToDDMMYYYY, formatNumberInput, parseNumberInput } from '@/utils/formatters';

export interface EditableMilestone {
  id?: string;
  name: string;
  percentage: number | string;
  amount: number | string;
  dueDate: string;
}

export interface DatePickerTarget {
  type: 'ROADMAP' | 'PAYMENT';
  milestoneIndex?: number;
  initialDate?: string;
  title?: string;
}

interface FinanceUIStoreState {
  viewType: 'list' | 'schedule';
  searchTerm: string;
  preset: 'this_month' | 'last_month' | 'this_quarter' | 'all';
  debtStatusFilter: 'ALL' | 'HAS_DEBT' | 'NO_DEBT';

  expandedContracts: Record<string, boolean>;

  // Payment Recording Modal State
  selectedMilestone: ContractDebtMilestone | null;
  showPaymentModal: boolean;
  paymentAmount: string;
  paymentDate: string;
  paymentNote: string;
  paymentProofFile: { name: string; size?: number; uri: string; mimeType?: string } | null;
  paymentProofLink: string;

  // Milestone Manage / Edit Roadmap Modal State
  selectedContractForRoadmap: ContractDebtGroup | null;
  showRoadmapModal: boolean;
  editableMilestones: EditableMilestone[];

  // Date Picker Modal state
  showDatePickerModal: boolean;
  datePickerTarget: DatePickerTarget | null;

  // Actions & Setters
  setViewType: (viewType: 'list' | 'schedule') => void;
  setSearchTerm: (term: string) => void;
  setPreset: (preset: 'this_month' | 'last_month' | 'this_quarter' | 'all') => void;
  setDebtStatusFilter: (filter: 'ALL' | 'HAS_DEBT' | 'NO_DEBT') => void;
  resetFilters: () => void;
  toggleContractExpand: (contractId: string) => void;
  setExpandedContracts: (expanded: Record<string, boolean>) => void;

  openPaymentModal: (milestone: ContractDebtMilestone) => void;
  closePaymentModal: () => void;
  setPaymentAmount: (amount: string) => void;
  setPaymentDate: (date: string) => void;
  setPaymentNote: (note: string) => void;
  setPaymentProofFile: (file: { name: string; size?: number; uri: string; mimeType?: string } | null) => void;
  setPaymentProofLink: (link: string) => void;

  openRoadmapModal: (contract: ContractDebtGroup) => void;
  closeRoadmapModal: () => void;
  addRoadmapRow: () => void;
  removeRoadmapRow: (index: number) => void;
  updateRoadmapRow: (index: number, field: keyof EditableMilestone, value: string) => void;

  openDatePickerForMilestone: (index: number, currentDate: string, milestoneName?: string) => void;
  openDatePickerForPayment: (currentDate: string) => void;
  closeDatePicker: () => void;
  confirmDateSelection: (selectedDateStr: string) => void;
}

export const useFinanceStore = create<FinanceUIStoreState>((set, get) => ({
  viewType: 'list',
  searchTerm: '',
  preset: 'this_month',
  debtStatusFilter: 'ALL',

  expandedContracts: {},

  // Payment Modal
  selectedMilestone: null,
  showPaymentModal: false,
  paymentAmount: '',
  paymentDate: formatDateToDDMMYYYY(new Date()),
  paymentNote: '',
  paymentProofFile: null,
  paymentProofLink: '',

  // Roadmap Modal
  selectedContractForRoadmap: null,
  showRoadmapModal: false,
  editableMilestones: [],

  // Date Picker Modal
  showDatePickerModal: false,
  datePickerTarget: null,

  setViewType: (viewType) => set({ viewType }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setPreset: (preset) => set({ preset }),
  setDebtStatusFilter: (debtStatusFilter) => set({ debtStatusFilter }),

  resetFilters: () =>
    set({
      searchTerm: '',
      preset: 'this_month',
      debtStatusFilter: 'ALL',
    }),

  toggleContractExpand: (contractId) =>
    set((state) => ({
      expandedContracts: {
        ...state.expandedContracts,
        [contractId]: !state.expandedContracts[contractId],
      },
    })),

  setExpandedContracts: (expandedContracts) => set({ expandedContracts }),

  // Payment Modal Actions
  openPaymentModal: (milestone) => {
    set({
      selectedMilestone: milestone,
      paymentAmount: formatNumberInput(milestone.remaining || milestone.amount || 0),
      paymentDate: formatDateToDDMMYYYY(new Date()),
      paymentNote: '',
      paymentProofFile: null,
      paymentProofLink: '',
      showPaymentModal: true,
    });
  },

  closePaymentModal: () => set({ showPaymentModal: false, selectedMilestone: null, paymentProofFile: null, paymentProofLink: '' }),

  setPaymentAmount: (paymentAmount) => set({ paymentAmount }),
  setPaymentDate: (paymentDate) => set({ paymentDate }),
  setPaymentNote: (paymentNote) => set({ paymentNote }),
  setPaymentProofFile: (paymentProofFile) => set({ paymentProofFile }),
  setPaymentProofLink: (paymentProofLink) => set({ paymentProofLink }),

  // Roadmap Modal Actions
  openRoadmapModal: (contract) => {
    const mapped: EditableMilestone[] = contract.milestones.map((m) => {
      const percentage =
        m.percentage !== undefined && m.percentage !== null
          ? Number(m.percentage)
          : contract.sellingPrice > 0
          ? Math.round((m.amount / contract.sellingPrice) * 10000) / 100
          : 0;
      return {
        id: m.id,
        name: m.name || 'Đợt thanh toán',
        percentage,
        amount: formatNumberInput(m.amount || 0),
        dueDate: m.dueDate ? formatDateToDDMMYYYY(m.dueDate) : '',
      };
    });

    set({
      selectedContractForRoadmap: contract,
      editableMilestones: mapped,
      showRoadmapModal: true,
    });
  },

  closeRoadmapModal: () => set({ showRoadmapModal: false, selectedContractForRoadmap: null }),

  addRoadmapRow: () => {
    const { selectedContractForRoadmap, editableMilestones } = get();
    if (!selectedContractForRoadmap) return;
    const price = selectedContractForRoadmap.sellingPrice;
    const currentPercent = editableMilestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
    const nextPercent = Math.max(0, Math.round((100 - currentPercent) * 100) / 100);
    const nextAmount = price > 0 ? Math.round((nextPercent / 100) * price) : 0;

    set({
      editableMilestones: [
        ...editableMilestones,
        {
          name: `Đợt ${editableMilestones.length + 1}`,
          percentage: nextPercent,
          amount: formatNumberInput(nextAmount),
          dueDate: '',
        },
      ],
    });
  },

  removeRoadmapRow: (index) => {
    set((state) => ({
      editableMilestones: state.editableMilestones.filter((_, i) => i !== index),
    }));
  },

  updateRoadmapRow: (index, field, value) => {
    const { selectedContractForRoadmap, editableMilestones } = get();
    if (!selectedContractForRoadmap) return;
    const price = selectedContractForRoadmap.sellingPrice;

    const next = [...editableMilestones];
    const row = { ...next[index] };

    if (field === 'percentage') {
      const cleanVal = String(value).replace(/^0+(?=\d)/, '');
      row.percentage = cleanVal;
      const numPercent = Number(cleanVal) || 0;
      const calcAmount = price > 0 ? Math.round((numPercent / 100) * price) : 0;
      row.amount = formatNumberInput(calcAmount);
    } else if (field === 'amount') {
      const formattedAmount = formatNumberInput(value);
      row.amount = formattedAmount;
      const numAmount = parseNumberInput(formattedAmount);
      const calcPercent = price > 0 ? Math.round((numAmount / price) * 10000) / 100 : 0;
      row.percentage = calcPercent;
    } else if (field === 'name' || field === 'dueDate') {
      row[field] = value;
    }

    next[index] = row;
    set({ editableMilestones: next });
  },

  // Date Picker Actions
  openDatePickerForMilestone: (index, currentDate, milestoneName) => {
    set({
      datePickerTarget: {
        type: 'ROADMAP',
        milestoneIndex: index,
        initialDate: currentDate,
        title: `Chọn Hạn thanh toán ${milestoneName ? `(${milestoneName})` : ''}`,
      },
      showDatePickerModal: true,
    });
  },

  openDatePickerForPayment: (currentDate) => {
    set({
      datePickerTarget: {
        type: 'PAYMENT',
        initialDate: currentDate,
        title: 'Chọn Ngày thanh toán',
      },
      showDatePickerModal: true,
    });
  },

  closeDatePicker: () => set({ showDatePickerModal: false, datePickerTarget: null }),

  confirmDateSelection: (selectedDateStr) => {
    const { datePickerTarget, updateRoadmapRow } = get();
    if (datePickerTarget?.type === 'ROADMAP' && datePickerTarget.milestoneIndex !== undefined) {
      updateRoadmapRow(datePickerTarget.milestoneIndex, 'dueDate', selectedDateStr);
    } else if (datePickerTarget?.type === 'PAYMENT') {
      set({ paymentDate: selectedDateStr });
    }
    set({ showDatePickerModal: false, datePickerTarget: null });
  },
}));
