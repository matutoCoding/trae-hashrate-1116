import { BillingService } from '../src/services/billing.service';
import type { Member, BillingSegment, TimeSlot } from '../src/types';
import { getDefaultQuotaMinutes } from '../src/data/mockData';

function createMockMember(level: Member['level'] = 'gold', usedMinutes = 0): Member {
  const now = new Date();
  const monthlyFree = getDefaultQuotaMinutes(level);
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const quota = {
    memberId: 'M001',
    monthlyFreeMinutes: monthlyFree,
    usedMinutes: usedMinutes,
    remainingMinutes: monthlyFree - usedMinutes,
    resetDate: nextReset,
    lastResetDate: new Date(now.getFullYear(), now.getMonth(), 1),
  };

  const timeCards = [
    {
      id: 'TC001',
      name: '10次洗车卡',
      totalMinutes: 600,
      remainingMinutes: 600,
      expireDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      isActive: true,
    },
  ];

  return {
    id: 'M001',
    name: '张三',
    phone: '138****8888',
    level,
    registerDate: new Date('2024-01-15'),
    quota,
    timeCards,
  };
}

describe('BillingService', () => {
  let service: BillingService;
  let testMember: Member;

  beforeEach(() => {
    service = new BillingService();
    testMember = createMockMember('gold', 30);
  });

  describe('createBill', () => {
    it('should create a valid bill record', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const result = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      expect(result.bill.memberId).toBe('M001');
      expect(result.bill.totalDurationMinutes).toBe(30);
      expect(result.bill.status).toBe('pending');
      expect(result.bill.paymentMethod).toBe('balance');
      expect(result.bill.totalAmount).toBeGreaterThan(0);
      expect(result.selfPaidAmount).toBe(result.bill.totalAmount);
    });

    it('should throw for zero or negative duration', () => {
      const startTime = new Date();
      const endTimeSame = new Date(startTime);
      expect(() =>
        service.createBill(startTime, endTimeSame, testMember)
      ).toThrow();

      const endTimeBefore = new Date(startTime.getTime() - 1000);
      expect(() =>
        service.createBill(startTime, endTimeBefore, testMember)
      ).toThrow();
    });

    it('should prefer quota deduction by default when available', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const result = service.createBill(startTime, endTime, testMember);

      expect(result.quotaUsed).toBe(30);
      expect(result.bill.quotaDeductedMinutes).toBe(30);
      expect(result.bill.quotaDeductedAmount).toBeGreaterThan(0);
      expect(result.selfPaidAmount).toBe(0);
      expect(result.bill.paymentMethod).toBe('quota');
    });

    it('should skip quota when preferQuotaFirst is false', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const result = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      expect(result.quotaUsed).toBe(0);
      expect(result.bill.quotaDeductedMinutes).toBe(0);
      expect(result.bill.quotaDeductedAmount).toBe(0);
      expect(result.selfPaidAmount).toBe(result.bill.totalAmount);
    });

    it('should apply time card when useTimeCardId provided', () => {
      const memberNoQuota = createMockMember('gold', getDefaultQuotaMinutes('gold'));
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const result = service.createBill(startTime, endTime, memberNoQuota, {
        useTimeCardId: 'TC001',
        preferQuotaFirst: false,
      });

      expect(result.timeCardUsed).toBeDefined();
      expect(result.timeCardUsed?.cardId).toBe('TC001');
      expect(result.timeCardUsed?.minutesUsed).toBe(30);
      expect(result.bill.timeCardUsed?.minutesUsed).toBe(30);
      expect(result.selfPaidAmount).toBe(0);
      expect(result.bill.paymentMethod).toBe('timecard');
    });

    it('should apply quota first, then time card, then self-pay', () => {
      const member = createMockMember('gold', 90);
      member.timeCards[0].remainingMinutes = 20;
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const result = service.createBill(startTime, endTime, member, {
        useTimeCardId: 'TC001',
      });

      expect(result.quotaUsed).toBe(30);
      expect(result.timeCardUsed?.minutesUsed).toBe(20);
      expect(result.bill.quotaDeductedMinutes + result.bill.timeCardUsed!.minutesUsed).toBeLessThan(60);
      expect(result.selfPaidAmount).toBeGreaterThan(0);
      expect(result.bill.paymentMethod).toBe('mixed');
    });
  });

  describe('applyQuotaDeduction', () => {
    it('should apply full quota deduction when sufficient', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyQuotaDeduction(bill, testMember, 30);

      expect(result.quotaDeducted).toBe(30);
      expect(result.amountDeducted).toBeGreaterThan(0);
      expect(bill.quotaDeductedMinutes).toBe(30);
      expect(bill.quotaDeductedAmount).toBe(result.amountDeducted);
    });

    it('should apply partial quota deduction when insufficient', () => {
      const memberLimited = createMockMember('gold', 110);
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, memberLimited, {
        preferQuotaFirst: false,
      });

      const result = service.applyQuotaDeduction(bill, memberLimited, 30);

      expect(result.quotaDeducted).toBe(10);
      expect(bill.quotaDeductedMinutes).toBe(10);
    });

    it('should return zero for zero maxMinutes', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyQuotaDeduction(bill, testMember, 0);

      expect(result.quotaDeducted).toBe(0);
      expect(result.amountDeducted).toBe(0);
    });
  });

  describe('applyTimeCard', () => {
    it('should apply full time card deduction when sufficient', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyTimeCard(bill, testMember, 'TC001', 30);

      expect(result.success).toBe(true);
      expect(result.minutesDeducted).toBe(30);
      expect(result.amountDeducted).toBeGreaterThan(0);
      expect(bill.timeCardUsed?.cardId).toBe('TC001');
      expect(bill.timeCardUsed?.minutesUsed).toBe(30);
    });

    it('should apply partial time card deduction when insufficient', () => {
      testMember.timeCards[0].remainingMinutes = 10;
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyTimeCard(bill, testMember, 'TC001', 30);

      expect(result.success).toBe(true);
      expect(result.minutesDeducted).toBe(10);
    });

    it('should fail for non-existent card id', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyTimeCard(bill, testMember, 'NON-EXISTENT', 30);

      expect(result.success).toBe(false);
      expect(result.minutesDeducted).toBe(0);
    });

    it('should return failure for zero maxMinutes', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const result = service.applyTimeCard(bill, testMember, 'TC001', 0);

      expect(result.success).toBe(false);
    });
  });

  describe('calculateFinalAmount', () => {
    it('should return the self paid amount', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        preferQuotaFirst: false,
      });

      const finalAmount = service.calculateFinalAmount(bill);
      expect(finalAmount).toBe(bill.selfPaidAmount);
      expect(finalAmount).toBeGreaterThan(0);
    });

    it('should never return negative', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember);
      bill.selfPaidAmount = -10;

      expect(service.calculateFinalAmount(bill)).toBe(0);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember);

      const confirmed = service.confirmPayment(bill, 'wechat');

      expect(confirmed.status).toBe('paid');
      expect(confirmed.paymentMethod).toBe('wechat');
    });
  });

  describe('cancelBill', () => {
    it('should cancel a pending bill', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember);

      const cancelled = service.cancelBill(bill);

      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('generateBillSummary', () => {
    it('should generate a summary with all sections', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const { bill } = service.createBill(startTime, endTime, testMember, {
        useTimeCardId: 'TC001',
      });

      const summary = service.generateBillSummary(bill);

      expect(summary).toContain('账单编号');
      expect(summary).toContain('开始时间');
      expect(summary).toContain('结束时间');
      expect(summary).toContain('总时长');
      expect(summary).toContain('分段明细');
      expect(summary).toContain('总金额');
      expect(summary).toContain('应付金额');
      expect(summary).toContain('状态');
    });
  });

  describe('full billing flow tests', () => {
    it('should complete full flow with quota only', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const { bill, quotaUsed, selfPaidAmount } = service.createBill(
        startTime,
        endTime,
        testMember
      );

      expect(quotaUsed).toBe(60);
      expect(bill.quotaDeductedMinutes).toBe(60);
      expect(selfPaidAmount).toBe(0);

      const confirmed = service.confirmPayment(bill, 'alipay');
      expect(confirmed.status).toBe('paid');
    });

    it('should complete full flow with quota + time card + self-pay', () => {
      const member = createMockMember('gold', 100);
      member.timeCards[0].remainingMinutes = 10;

      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const { bill, quotaUsed, timeCardUsed, selfPaidAmount } = service.createBill(
        startTime,
        endTime,
        member,
        { useTimeCardId: 'TC001' }
      );

      expect(quotaUsed).toBe(20);
      expect(timeCardUsed?.minutesUsed).toBe(10);
      expect(bill.quotaDeductedMinutes).toBe(20);
      expect(bill.timeCardUsed?.minutesUsed).toBe(10);
      expect(selfPaidAmount).toBeGreaterThan(0);
      expect(bill.totalAmount).toBeCloseTo(
        bill.quotaDeductedAmount +
          (bill.timeCardUsed
            ? (bill.totalAmount * bill.timeCardUsed.minutesUsed) / bill.totalDurationMinutes
            : 0) +
          selfPaidAmount,
        0
      );

      const confirmed = service.confirmPayment(bill, 'wechat');
      expect(confirmed.status).toBe('paid');
    });

    it('should handle cross-hour billing correctly', () => {
      const startTime = new Date();
      startTime.setHours(16, 40, 0, 0);
      const endTime = new Date(startTime.getTime() + 40 * 60 * 1000);

      const memberFullQuota = createMockMember('gold', 0);
      const result = service.createBill(startTime, endTime, memberFullQuota, {
        preferQuotaFirst: false,
      });

      expect(result.bill.totalDurationMinutes).toBe(40);
      expect(result.bill.segments.length).toBeGreaterThanOrEqual(1);
      const totalSegmentMinutes = result.bill.segments.reduce(
        (sum: number, s: BillingSegment) => sum + s.durationMinutes,
        0
      );
      expect(totalSegmentMinutes).toBe(40);
    });
  });
});
