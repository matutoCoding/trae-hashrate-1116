import { create } from 'zustand';
import type { Member, BillingRecord, TimeSlot, BillingCalculationResult } from '../types';
import { mockMember, mockBillingRecords, defaultTimeSlots } from '../data/mockData';
import { transactionService } from '../services/transaction.service';
import { quotaService } from '../services/quota.service';

interface AppState {
  member: Member;
  billingRecords: BillingRecord[];
  timeSlots: TimeSlot[];
  currentWash: {
    isWashing: boolean;
    startTime: Date | null;
    currentCost: BillingCalculationResult | null;
  };
  selectedMonth: { year: number; month: number };
  actions: {
    startWash: () => void;
    endWash: () => BillingRecord | null;
    updateCurrentCost: () => void;
    addBillingRecord: (record: BillingRecord) => void;
    updateTimeSlots: (slots: TimeSlot[]) => void;
    setSelectedMonth: (year: number, month: number) => void;
    checkAndResetQuota: () => void;
    loadFromStorage: () => void;
  };
}

const now = new Date();

export const useStore = create<AppState>((set, get) => ({
  member: mockMember,
  billingRecords: mockBillingRecords,
  timeSlots: defaultTimeSlots,
  currentWash: {
    isWashing: false,
    startTime: null,
    currentCost: null
  },
  selectedMonth: {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  },
  actions: {
    startWash: () => {
      set({
        currentWash: {
          isWashing: true,
          startTime: new Date(),
          currentCost: null
        }
      });
    },
    endWash: () => {
      const { currentWash } = get();
      if (!currentWash.isWashing || !currentWash.startTime) return null;
      
      const endTime = new Date();
      
      set({
        currentWash: {
          isWashing: false,
          startTime: null,
          currentCost: null
        }
      });
      
      return null;
    },
    updateCurrentCost: () => {
      const { currentWash } = get();
      if (!currentWash.isWashing || !currentWash.startTime) return;
      
      const { pricingService } = require('../services/pricing.service');
      const result = pricingService.calculateRealTimeCost(
        currentWash.startTime,
        new Date()
      );
      
      set(state => ({
        currentWash: {
          ...state.currentWash,
          currentCost: result
        }
      }));
    },
    addBillingRecord: (record: BillingRecord) => {
      set(state => ({
        billingRecords: [record, ...state.billingRecords]
      }));
      transactionService.addBill(record);
    },
    updateTimeSlots: (slots: TimeSlot[]) => {
      set({ timeSlots: slots });
    },
    setSelectedMonth: (year: number, month: number) => {
      set({ selectedMonth: { year, month } });
    },
    checkAndResetQuota: () => {
      const { member } = get();
      quotaService.checkAndResetQuota(member);
      set({ member: { ...member } });
    },
    loadFromStorage: () => {
      transactionService.loadFromStorage();
      const records = transactionService.getBillList(mockMember.id);
      if (records.length > 0) {
        set({ billingRecords: records });
      }
    }
  }
}));
