export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  pricePerMinute: number;
  color: string;
}

export interface BillingSegment {
  timeSlot: TimeSlot;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  amount: number;
}

export interface MemberQuota {
  memberId: string;
  monthlyFreeMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  resetDate: Date;
  lastResetDate: Date;
}

export interface TimeCard {
  id: string;
  name: string;
  totalMinutes: number;
  remainingMinutes: number;
  expireDate: Date;
  isActive: boolean;
}

export interface BillingRecord {
  id: string;
  memberId: string;
  startTime: Date;
  endTime: Date;
  totalDurationMinutes: number;
  segments: BillingSegment[];
  totalAmount: number;
  quotaDeductedMinutes: number;
  quotaDeductedAmount: number;
  selfPaidAmount: number;
  timeCardUsed?: {
    cardId: string;
    minutesUsed: number;
    amountDeducted: number;
  };
  paymentMethod: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  level: 'normal' | 'silver' | 'gold' | 'platinum';
  avatar?: string;
  registerDate: Date;
  quota: MemberQuota;
  timeCards: TimeCard[];
}

export interface BillingCalculationResult {
  segments: BillingSegment[];
  totalDurationMinutes: number;
  totalAmount: number;
}

export interface QuotaResetLog {
  id: string;
  memberId: string;
  resetDate: Date;
  previousUsedMinutes: number;
  newMonthlyMinutes: number;
}

export interface TransactionFilter {
  startDate?: Date;
  endDate?: Date;
  status?: BillingRecord['status'];
  paymentMethod?: string;
  usedQuota?: boolean;
  usedTimeCard?: boolean;
}
