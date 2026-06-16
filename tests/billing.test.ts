import { BillingService } from '../src/services/billing.service';
import type { BillingRecord, MemberQuota, TimeCard, BillingSegment, TimeSlot } from '../src/types';

describe('BillingService', () => {
  let service: BillingService;
  let testQuota: MemberQuota;
  let testTimeCards: TimeCard[];
  let testSegments: BillingSegment[];

  beforeEach(() => {
    const now = new Date();
    const testSlot: TimeSlot = {
      id: 's1',
      name: '平峰时段',
      startTime: '07:00',
      endTime: '17:00',
      pricePerMinute: 0.50,
      color: '#34D399',
    };

    testSegments = [
      {
        id: 'seg1',
        timeSlot: testSlot,
        startTime: now,
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        amount: 15,
      },
    ];

    testQuota = {
      id: 'q1',
      memberId: 'm1',
      monthlyQuotaMinutes: 120,
      usedMinutes: 30,
      cycleStartDate: new Date(now.getFullYear(), now.getMonth(), 1),
      cycleEndDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      resetDay: 1,
      lastResetDate: new Date(now.getFullYear(), now.getMonth(), 1),
    };

    testTimeCards = [
      {
        id: 'tc1',
        memberId: 'm1',
        name: '10次洗车卡',
        totalMinutes: 600,
        remainingMinutes: 600,
        purchaseDate: now,
        expireDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        isActive: true,
      },
    ];

    service = new BillingService();
  });

  describe('createBill', () => {
    it('should create a valid bill record', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);

      expect(bill.memberId).toBe('m1');
      expect(bill.totalDurationMinutes).toBe(30);
      expect(bill.totalAmount).toBe(15);
      expect(bill.status).toBe('pending');
      expect(bill.paymentMethod).toBe('pending');
    });
  });

  describe('applyQuotaDeduction', () => {
    it('should apply full quota deduction when sufficient', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);

      const result = service.applyQuotaDeduction(bill, testQuota, true);

      expect(result.updatedBill.quotaDeductedMinutes).toBe(30);
      expect(result.updatedBill.quotaDeductedAmount).toBe(15);
      expect(result.updatedBill.selfPaidAmount).toBe(0);
      expect(result.updatedQuota.usedMinutes).toBe(60);
    });

    it('should apply partial quota deduction when insufficient', () => {
      testQuota.usedMinutes = 110;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);

      const result = service.applyQuotaDeduction(bill, testQuota, true);

      expect(result.updatedBill.quotaDeductedMinutes).toBe(10);
      expect(result.updatedBill.quotaDeductedAmount).toBe(5);
      expect(result.updatedBill.selfPaidAmount).toBe(10);
      expect(result.updatedQuota.usedMinutes).toBe(120);
    });

    it('should not apply quota when useQuota is false', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);

      const result = service.applyQuotaDeduction(bill, testQuota, false);

      expect(result.updatedBill.quotaDeductedMinutes).toBe(0);
      expect(result.updatedBill.quotaDeductedAmount).toBe(0);
      expect(result.updatedBill.selfPaidAmount).toBe(15);
      expect(result.updatedQuota.usedMinutes).toBe(30);
    });
  });

  describe('applyTimeCard', () => {
    it('should apply full time card deduction when sufficient', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);
      bill.quotaDeductedMinutes = 0;
      bill.quotaDeductedAmount = 0;
      bill.selfPaidAmount = 15;

      const result = service.applyTimeCard(bill, testTimeCards, 'tc1');

      expect(result.success).toBe(true);
      expect(result.updatedBill.timeCardUsed?.cardId).toBe('tc1');
      expect(result.updatedBill.timeCardUsed?.minutesUsed).toBe(30);
      expect(result.updatedBill.selfPaidAmount).toBe(0);
      expect(result.updatedCards[0].remainingMinutes).toBe(570);
    });

    it('should apply partial time card deduction when insufficient', () => {
      testTimeCards[0].remainingMinutes = 10;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);
      bill.quotaDeductedMinutes = 0;
      bill.quotaDeductedAmount = 0;
      bill.selfPaidAmount = 15;

      const result = service.applyTimeCard(bill, testTimeCards, 'tc1');

      expect(result.success).toBe(true);
      expect(result.updatedBill.timeCardUsed?.minutesUsed).toBe(10);
      expect(result.updatedBill.selfPaidAmount).toBe(10);
    });

    it('should not apply time card when no self-pay amount', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);
      bill.quotaDeductedMinutes = 30;
      bill.quotaDeductedAmount = 15;
      bill.selfPaidAmount = 0;

      const result = service.applyTimeCard(bill, testTimeCards, 'tc1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('无需使用次卡');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      let bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);

      bill = service.confirmPayment(bill, 'wechat');

      expect(bill.status).toBe('paid');
      expect(bill.paymentMethod).toBe('wechat');
      expect(bill.paidAt).not.toBeNull();
    });

    it('should fail to confirm already paid bill', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      let bill = service.createBill('m1', startTime, endTime, testSegments, 30, 15);
      bill = service.confirmPayment(bill, 'wechat');

      expect(() => service.confirmPayment(bill, 'wechat')).toThrow();
    });
  });

  describe('calculateSelfPayAmount', () => {
    it('should calculate correctly based on remaining minutes', () => {
      const amount = service.calculateSelfPayAmount(testSegments, 10);
      expect(amount).toBe(5);
    });

    it('should return 0 when no self-pay minutes', () => {
      const amount = service.calculateSelfPayAmount(testSegments, 0);
      expect(amount).toBe(0);
    });
  });

  describe('calculateQuotaDeductedAmount', () => {
    it('should calculate correctly based on quota minutes', () => {
      const amount = service.calculateQuotaDeductedAmount(testSegments, 20);
      expect(amount).toBe(10);
    });
  });

  describe('full billing flow test', () => {
    it('should complete full billing flow with quota and time card', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      
      const extendedSegments: BillingSegment[] = [
        ...testSegments,
        {
          id: 'seg2',
          timeSlot: testSegments[0].timeSlot,
          startTime: new Date(startTime.getTime() + 30 * 60 * 1000),
          endTime: endTime,
          durationMinutes: 30,
          amount: 15,
        },
      ];

      let bill = service.createBill('m1', startTime, endTime, extendedSegments, 60, 30);
      
      const quotaResult = service.applyQuotaDeduction(bill, testQuota, true);
      bill = quotaResult.updatedBill;
      const updatedQuota = quotaResult.updatedQuota;

      expect(bill.quotaDeductedMinutes).toBe(60);
      expect(bill.quotaDeductedAmount).toBe(30);
      expect(bill.selfPaidAmount).toBe(0);
      expect(updatedQuota.usedMinutes).toBe(90);

      bill = service.confirmPayment(bill, 'alipay');

      expect(bill.status).toBe('paid');
      expect(bill.paymentMethod).toBe('alipay');
    });

    it('should complete full billing flow with quota, time card, and self-pay', () => {
      testQuota.usedMinutes = 100;
      testTimeCards[0].remainingMinutes = 10;

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      
      const extendedSegments: BillingSegment[] = [
        ...testSegments,
        {
          id: 'seg2',
          timeSlot: testSegments[0].timeSlot,
          startTime: new Date(startTime.getTime() + 30 * 60 * 1000),
          endTime: endTime,
          durationMinutes: 30,
          amount: 15,
        },
      ];

      let bill = service.createBill('m1', startTime, endTime, extendedSegments, 60, 30);
      
      const quotaResult = service.applyQuotaDeduction(bill, testQuota, true);
      bill = quotaResult.updatedBill;

      expect(bill.quotaDeductedMinutes).toBe(20);
      expect(bill.quotaDeductedAmount).toBe(10);
      expect(bill.selfPaidAmount).toBe(20);

      const timeCardResult = service.applyTimeCard(bill, testTimeCards, 'tc1');
      expect(timeCardResult.success).toBe(true);
      bill = timeCardResult.updatedBill;

      expect(bill.timeCardUsed?.minutesUsed).toBe(10);
      expect(bill.selfPaidAmount).toBe(15);

      bill = service.confirmPayment(bill, 'wechat');

      expect(bill.status).toBe('paid');
    });
  });
});
