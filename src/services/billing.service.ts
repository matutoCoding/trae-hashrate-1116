import type { BillingRecord, Member, BillingSegment } from '../types';
import { pricingService } from './pricing.service';
import { quotaService } from './quota.service';

export type PaymentMethod = 'quota' | 'timecard' | 'balance' | 'mixed';

export interface BillingOptions {
  useTimeCardId?: string;
  preferQuotaFirst?: boolean;
}

export interface BillingResult {
  bill: BillingRecord;
  quotaUsed: number;
  timeCardUsed?: {
    cardId: string;
    minutesUsed: number;
  };
  selfPaidAmount: number;
}

export class BillingService {
  createBill(
    startTime: Date,
    endTime: Date,
    member: Member,
    options: BillingOptions = {}
  ): BillingResult {
    const { segments, totalDurationMinutes, totalAmount } = pricingService.calculateSegments(
      startTime,
      endTime
    );

    if (totalDurationMinutes <= 0) {
      throw new Error('无效的洗车时长');
    }

    const bill: BillingRecord = {
      id: `BILL${Date.now()}`,
      memberId: member.id,
      startTime,
      endTime,
      totalDurationMinutes,
      segments,
      totalAmount,
      quotaDeductedMinutes: 0,
      quotaDeductedAmount: 0,
      selfPaidAmount: totalAmount,
      paymentMethod: 'balance',
      status: 'pending',
      createdAt: new Date()
    };

    return this.applyPaymentOptions(bill, member, options);
  }

  private applyPaymentOptions(
    bill: BillingRecord,
    member: Member,
    options: BillingOptions
  ): BillingResult {
    let remainingMinutes = bill.totalDurationMinutes;
    let quotaUsed = 0;
    let timeCardUsed: BillingResult['timeCardUsed'] | undefined;
    let timeCardDeductedAmount = 0;

    if (options.preferQuotaFirst !== false) {
      const quotaResult = this.applyQuotaDeduction(bill, member, remainingMinutes);
      quotaUsed = quotaResult.quotaDeducted;
      remainingMinutes -= quotaUsed;
    }

    if (options.useTimeCardId && remainingMinutes > 0) {
      const timeCardResult = this.applyTimeCard(
        bill,
        member,
        options.useTimeCardId,
        remainingMinutes
      );
      if (timeCardResult.success) {
        timeCardUsed = {
          cardId: options.useTimeCardId,
          minutesUsed: timeCardResult.minutesDeducted
        };
        timeCardDeductedAmount = timeCardResult.amountDeducted;
        remainingMinutes -= timeCardResult.minutesDeducted;
      }
    }

    const selfPayAmount = this.calculateAmountFromMinutes(
      bill.segments,
      remainingMinutes,
      bill.totalDurationMinutes
    );
    bill.selfPaidAmount = Math.max(0, Math.round(selfPayAmount * 100) / 100);

    if (timeCardUsed) {
      bill.timeCardUsed = timeCardUsed;
    }

    bill.paymentMethod = this.determinePaymentMethod(
      quotaUsed > 0,
      !!timeCardUsed,
      bill.selfPaidAmount > 0
    );

    return {
      bill,
      quotaUsed,
      timeCardUsed,
      selfPaidAmount: bill.selfPaidAmount
    };
  }

  applyQuotaDeduction(
    bill: BillingRecord,
    member: Member,
    maxMinutes?: number
  ): { quotaDeducted: number; amountDeducted: number } {
    const minutesToDeduct = maxMinutes ?? bill.totalDurationMinutes;
    
    if (minutesToDeduct <= 0) {
      return { quotaDeducted: 0, amountDeducted: 0 };
    }

    const result = quotaService.deductQuota(member, minutesToDeduct);
    
    if (!result.success) {
      return { quotaDeducted: 0, amountDeducted: 0 };
    }

    const deductedAmount = this.calculateAmountFromMinutes(
      bill.segments,
      result.deductedMinutes,
      bill.totalDurationMinutes
    );

    bill.quotaDeductedMinutes = result.deductedMinutes;
    bill.quotaDeductedAmount = deductedAmount;

    return {
      quotaDeducted: result.deductedMinutes,
      amountDeducted: deductedAmount
    };
  }

  applyTimeCard(
    bill: BillingRecord,
    member: Member,
    cardId: string,
    maxMinutes?: number
  ): { success: boolean; minutesDeducted: number; amountDeducted: number } {
    const minutesToDeduct = maxMinutes ?? bill.totalDurationMinutes - bill.quotaDeductedMinutes;
    
    if (minutesToDeduct <= 0) {
      return { success: false, minutesDeducted: 0, amountDeducted: 0 };
    }

    const result = quotaService.deductTimeCard(member, cardId, minutesToDeduct);
    
    if (!result.success) {
      return { success: false, minutesDeducted: 0, amountDeducted: 0 };
    }

    const deductedAmount = this.calculateAmountFromMinutes(
      bill.segments,
      result.deductedMinutes,
      bill.totalDurationMinutes
    );

    bill.timeCardUsed = {
      cardId,
      minutesUsed: result.deductedMinutes
    };

    return {
      success: true,
      minutesDeducted: result.deductedMinutes,
      amountDeducted: deductedAmount
    };
  }

  private calculateAmountFromMinutes(
    segments: BillingSegment[],
    minutes: number,
    totalMinutes: number
  ): number {
    if (totalMinutes === 0 || minutes === 0) return 0;
    if (minutes >= totalMinutes) {
      return segments.reduce((sum, seg) => sum + seg.amount, 0);
    }

    const ratio = minutes / totalMinutes;
    const totalAmount = segments.reduce((sum, seg) => sum + seg.amount, 0);
    
    return Math.round(totalAmount * ratio * 100) / 100;
  }

  calculateFinalAmount(bill: BillingRecord): number {
    return Math.max(0, bill.selfPaidAmount);
  }

  private determinePaymentMethod(
    usedQuota: boolean,
    usedTimeCard: boolean,
    paidSelf: boolean
  ): PaymentMethod {
    const methods: string[] = [];
    if (usedQuota) methods.push('quota');
    if (usedTimeCard) methods.push('timecard');
    if (paidSelf) methods.push('balance');

    if (methods.length > 1) return 'mixed';
    return (methods[0] as PaymentMethod) || 'balance';
  }

  confirmPayment(bill: BillingRecord, paymentMethod: string): BillingRecord {
    bill.status = 'paid';
    bill.paymentMethod = paymentMethod;
    return bill;
  }

  cancelBill(bill: BillingRecord): BillingRecord {
    bill.status = 'cancelled';
    return bill;
  }

  generateBillSummary(bill: BillingRecord): string {
    const lines: string[] = [];
    lines.push(`账单编号: ${bill.id}`);
    lines.push(`开始时间: ${bill.startTime.toLocaleString()}`);
    lines.push(`结束时间: ${bill.endTime.toLocaleString()}`);
    lines.push(`总时长: ${bill.totalDurationMinutes} 分钟`);
    lines.push('');
    lines.push('--- 分段明细 ---');
    bill.segments.forEach((seg, idx) => {
      lines.push(
        `${idx + 1}. ${seg.timeSlot.name}: ${seg.startTime.toLocaleTimeString()} - ${seg.endTime.toLocaleTimeString()}, ` +
        `${seg.durationMinutes}分钟 × ¥${seg.timeSlot.pricePerMinute.toFixed(2)}/分钟 = ¥${seg.amount.toFixed(2)}`
      );
    });
    lines.push('');
    lines.push(`总金额: ¥${bill.totalAmount.toFixed(2)}`);
    if (bill.quotaDeductedMinutes > 0) {
      lines.push(`额度抵扣: ${bill.quotaDeductedMinutes}分钟 (¥${bill.quotaDeductedAmount.toFixed(2)})`);
    }
    if (bill.timeCardUsed) {
      lines.push(`次卡抵扣: ${bill.timeCardUsed.minutesUsed}分钟`);
    }
    lines.push(`应付金额: ¥${bill.selfPaidAmount.toFixed(2)}`);
    lines.push(`状态: ${bill.status}`);

    return lines.join('\n');
  }
}

export const billingService = new BillingService();
