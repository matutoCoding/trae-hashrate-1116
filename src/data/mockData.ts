import type { TimeSlot, Member, BillingRecord } from '../types';

export const defaultTimeSlots: TimeSlot[] = [
  { id: '1', name: '低谷时段', startTime: '00:00', endTime: '07:00', pricePerMinute: 0.30, color: '#60A5FA' },
  { id: '2', name: '平峰时段', startTime: '07:00', endTime: '17:00', pricePerMinute: 0.50, color: '#34D399' },
  { id: '3', name: '高峰时段', startTime: '17:00', endTime: '20:00', pricePerMinute: 0.80, color: '#F97316' },
  { id: '4', name: '夜间平峰', startTime: '20:00', endTime: '24:00', pricePerMinute: 0.40, color: '#A78BFA' },
];

export const getDefaultQuotaMinutes = (level: Member['level']): number => {
  switch (level) {
    case 'normal': return 60;
    case 'silver': return 90;
    case 'gold': return 120;
    case 'platinum': return 180;
    default: return 60;
  }
};

const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

export const mockMember: Member = {
  id: 'M001',
  name: '张三',
  phone: '138****8888',
  level: 'gold',
  registerDate: new Date('2024-01-15'),
  quota: {
    memberId: 'M001',
    monthlyFreeMinutes: 120,
    usedMinutes: 45,
    remainingMinutes: 75,
    resetDate: firstDayOfNextMonth,
    lastResetDate: firstDayOfMonth,
  },
  timeCards: [
    {
      id: 'TC001',
      name: '黄金会员专享次卡',
      totalMinutes: 300,
      remainingMinutes: 180,
      expireDate: new Date('2026-12-31'),
      isActive: true,
    },
    {
      id: 'TC002',
      name: '节日特惠次卡',
      totalMinutes: 100,
      remainingMinutes: 100,
      expireDate: new Date('2026-08-31'),
      isActive: true,
    }
  ]
};

const generateMockBills = (): BillingRecord[] => {
  const bills: BillingRecord[] = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 15; i++) {
    const dayOffset = Math.floor(Math.random() * 30);
    const startHour = 8 + Math.floor(Math.random() * 12);
    const duration = 10 + Math.floor(Math.random() * 30);
    
    const startTime = new Date(baseDate);
    startTime.setDate(startTime.getDate() - dayOffset);
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);
    
    const isPeak = startHour >= 17 && startHour < 20;
    const pricePerMinute = isPeak ? 0.80 : 0.50;
    const totalAmount = duration * pricePerMinute;
    
    const useQuota = Math.min(duration, 30);
    const quotaAmount = useQuota * pricePerMinute;
    
    bills.push({
      id: `BILL${String(i + 1).padStart(4, '0')}`,
      memberId: 'M001',
      startTime,
      endTime,
      totalDurationMinutes: duration,
      segments: [{
        timeSlot: defaultTimeSlots[isPeak ? 2 : 1],
        startTime,
        endTime,
        durationMinutes: duration,
        amount: totalAmount
      }],
      totalAmount,
      quotaDeductedMinutes: useQuota,
      quotaDeductedAmount: quotaAmount,
      selfPaidAmount: totalAmount - quotaAmount,
      paymentMethod: useQuota >= duration ? 'quota' : 'balance',
      status: 'paid',
      createdAt: startTime
    });
  }
  
  return bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const mockBillingRecords: BillingRecord[] = generateMockBills();
