import { QuotaService } from '../src/services/quota.service';
import type { MemberQuota, TimeCard } from '../src/types';

describe('QuotaService', () => {
  let service: QuotaService;
  let testQuota: MemberQuota;
  let testTimeCards: TimeCard[];

  beforeEach(() => {
    const now = new Date();
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
        purchaseDate: new Date(),
        expireDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        isActive: true,
      },
    ];

    service = new QuotaService();
  });

  describe('checkAndResetQuota', () => {
    it('should not reset when within current cycle', () => {
      const result = service.checkAndResetQuota(testQuota);
      expect(result.usedMinutes).toBe(30);
      expect(result.remainingMinutes).toBe(90);
    });

    it('should reset when past cycle end date', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);
      testQuota.cycleStartDate = new Date(pastDate.getFullYear(), pastDate.getMonth(), 1);
      testQuota.cycleEndDate = new Date(pastDate.getFullYear(), pastDate.getMonth() + 1, 0);
      testQuota.lastResetDate = new Date(pastDate.getFullYear(), pastDate.getMonth(), 1);

      const result = service.checkAndResetQuota(testQuota);
      
      expect(result.usedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(120);
      expect(result.lastResetDate.getMonth()).toBe(new Date().getMonth());
    });
  });

  describe('resetMonthlyQuota', () => {
    it('should reset quota to full amount', () => {
      const result = service.resetMonthlyQuota(testQuota);
      
      expect(result.usedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(120);
      expect(result.lastResetDate.getDate()).toBe(new Date().getDate());
    });
  });

  describe('deductQuota', () => {
    it('should deduct from remaining quota when sufficient', () => {
      const result = service.deductQuota(testQuota, 50);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(50);
      expect(result.remainingMinutes).toBe(40);
      expect(result.selfPayMinutes).toBe(0);
      expect(result.updatedQuota.usedMinutes).toBe(80);
    });

    it('should deduct partial and return self-pay when insufficient', () => {
      const result = service.deductQuota(testQuota, 100);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(90);
      expect(result.remainingMinutes).toBe(0);
      expect(result.selfPayMinutes).toBe(10);
      expect(result.updatedQuota.usedMinutes).toBe(120);
    });

    it('should return all self-pay when no quota left', () => {
      testQuota.usedMinutes = 120;
      const result = service.deductQuota(testQuota, 30);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(0);
      expect(result.selfPayMinutes).toBe(30);
    });

    it('should fail for negative minutes', () => {
      const result = service.deductQuota(testQuota, -10);
      expect(result.success).toBe(false);
    });
  });

  describe('deductTimeCard', () => {
    it('should deduct from time card when sufficient', () => {
      const result = service.deductTimeCard(testTimeCards, 'tc1', 120);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(120);
      expect(result.remainingMinutes).toBe(480);
      expect(result.updatedCards[0].remainingMinutes).toBe(480);
    });

    it('should deduct partial when insufficient', () => {
      testTimeCards[0].remainingMinutes = 50;
      const result = service.deductTimeCard(testTimeCards, 'tc1', 120);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(50);
      expect(result.remainingMinutes).toBe(0);
      expect(result.selfPayMinutes).toBe(70);
    });

    it('should fail for inactive card', () => {
      testTimeCards[0].isActive = false;
      const result = service.deductTimeCard(testTimeCards, 'tc1', 30);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('无效');
    });

    it('should fail for expired card', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      testTimeCards[0].expireDate = pastDate;
      const result = service.deductTimeCard(testTimeCards, 'tc1', 30);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('已过期');
    });

    it('should fail for non-existent card', () => {
      const result = service.deductTimeCard(testTimeCards, 'invalid', 30);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不存在');
    });
  });

  describe('getQuotaUsagePercentage', () => {
    it('should calculate correct percentage', () => {
      const percentage = service.getQuotaUsagePercentage(testQuota);
      expect(percentage).toBe(25);
    });

    it('should cap at 100%', () => {
      testQuota.usedMinutes = 150;
      const percentage = service.getQuotaUsagePercentage(testQuota);
      expect(percentage).toBe(100);
    });
  });

  describe('getTimeCardUsagePercentage', () => {
    it('should calculate correct percentage', () => {
      testTimeCards[0].remainingMinutes = 300;
      const percentage = service.getTimeCardUsagePercentage(testTimeCards[0]);
      expect(percentage).toBe(50);
    });
  });

  describe('getDaysUntilReset', () => {
    it('should calculate correct days until reset', () => {
      const today = new Date();
      testQuota.resetDay = 1;
      
      const days = service.getDaysUntilReset(testQuota);
      
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const expectedDays = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(days).toBe(expectedDays);
    });
  });

  describe('getValidTimeCards', () => {
    it('should return only active and non-expired cards', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      testTimeCards.push({
        id: 'tc2',
        memberId: 'm1',
        name: '过期卡',
        totalMinutes: 300,
        remainingMinutes: 300,
        purchaseDate: pastDate,
        expireDate: pastDate,
        isActive: true,
      });
      
      testTimeCards.push({
        id: 'tc3',
        memberId: 'm1',
        name: '未激活卡',
        totalMinutes: 300,
        remainingMinutes: 300,
        purchaseDate: new Date(),
        expireDate: new Date(),
        isActive: false,
      });

      const validCards = service.getValidTimeCards(testTimeCards);
      
      expect(validCards.length).toBe(1);
      expect(validCards[0].id).toBe('tc1');
    });
  });
});
