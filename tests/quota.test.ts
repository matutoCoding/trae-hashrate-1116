import { QuotaService } from '../src/services/quota.service';
import type { Member, MemberQuota, TimeCard } from '../src/types';
import { getDefaultQuotaMinutes } from '../src/data/mockData';

function createMockMember(level: Member['level'] = 'gold', usedMinutes = 0): Member {
  const now = new Date();
  const monthlyFree = getDefaultQuotaMinutes(level);
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const quota: MemberQuota = {
    memberId: 'M001',
    monthlyFreeMinutes: monthlyFree,
    usedMinutes: usedMinutes,
    remainingMinutes: monthlyFree - usedMinutes,
    resetDate: nextReset,
    lastResetDate: new Date(now.getFullYear(), now.getMonth(), 1),
  };

  const timeCards: TimeCard[] = [
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

describe('QuotaService', () => {
  let service: QuotaService;

  beforeEach(() => {
    service = new QuotaService();
  });

  describe('checkAndResetQuota', () => {
    it('should not reset when within current cycle', () => {
      const member = createMockMember('gold', 30);
      const wasReset = service.checkAndResetQuota(member);
      
      expect(wasReset).toBe(false);
      expect(member.quota.usedMinutes).toBe(30);
      expect(member.quota.remainingMinutes).toBe(getDefaultQuotaMinutes('gold') - 30);
    });

    it('should reset when past reset date', () => {
      const member = createMockMember('gold', 80);
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      member.quota.resetDate = pastDate;
      member.quota.lastResetDate = pastDate;

      const wasReset = service.checkAndResetQuota(member);
      
      expect(wasReset).toBe(true);
      expect(member.quota.usedMinutes).toBe(0);
      expect(member.quota.remainingMinutes).toBe(getDefaultQuotaMinutes('gold'));
      expect(member.quota.resetDate.getMonth()).toBe(new Date().getMonth() + 1 === 12 ? 0 : new Date().getMonth() + 1);
    });
  });

  describe('resetMonthlyQuota', () => {
    it('should reset quota to full amount regardless of usage', () => {
      const member = createMockMember('gold', 110);
      const expectedMonthly = getDefaultQuotaMinutes('gold');
      
      const newQuota = service.resetMonthlyQuota(member);
      
      expect(newQuota.usedMinutes).toBe(0);
      expect(newQuota.remainingMinutes).toBe(expectedMonthly);
      expect(newQuota.monthlyFreeMinutes).toBe(expectedMonthly);
    });

    it('should create a reset log entry', () => {
      const member = createMockMember('gold', 50);
      const beforeReset = new Date();
      
      service.resetMonthlyQuota(member);
      const logs = service.getResetLogs(member.id);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].previousUsedMinutes).toBe(50);
      expect(logs[0].newMonthlyMinutes).toBe(getDefaultQuotaMinutes('gold'));
      expect(logs[0].resetDate.getTime()).toBeGreaterThanOrEqual(beforeReset.getTime());
    });

    it('should assign correct minutes per level', () => {
      const levels: Array<{ level: Member['level']; expected: number }> = [
        { level: 'normal', expected: 60 },
        { level: 'silver', expected: 90 },
        { level: 'gold', expected: 120 },
        { level: 'platinum', expected: 180 },
      ];
      
      for (const { level, expected } of levels) {
        const member = createMockMember(level, 0);
        const quota = service.resetMonthlyQuota(member);
        expect(quota.monthlyFreeMinutes).toBe(expected);
      }
    });
  });

  describe('deductQuota', () => {
    it('should deduct fully when quota is sufficient', () => {
      const member = createMockMember('gold', 30);
      const originalRemaining = member.quota.remainingMinutes;
      const minutesToDeduct = 50;
      
      const result = service.deductQuota(member, minutesToDeduct);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(minutesToDeduct);
      expect(result.remainingMinutes).toBe(originalRemaining - minutesToDeduct);
      expect(member.quota.usedMinutes).toBe(30 + minutesToDeduct);
      expect(member.quota.remainingMinutes).toBe(originalRemaining - minutesToDeduct);
    });

    it('should deduct partial and leave remainder for self-pay when insufficient', () => {
      const member = createMockMember('gold', 100);
      const minutesToDeduct = 40;
      const available = member.quota.remainingMinutes;
      const expectedDeducted = available; 
      
      const result = service.deductQuota(member, minutesToDeduct);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(expectedDeducted);
      expect(result.remainingMinutes).toBe(0);
      expect(member.quota.usedMinutes).toBe(100 + expectedDeducted);
      expect(member.quota.remainingMinutes).toBe(0);
    });

    it('should return all self-pay when no quota left', () => {
      const member = createMockMember('gold', getDefaultQuotaMinutes('gold'));
      const minutesToDeduct = 30;
      
      const result = service.deductQuota(member, minutesToDeduct);
      
      expect(result.success).toBe(false);
      expect(result.deductedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(0);
    });

    it('should fail for zero or negative minutes', () => {
      const member = createMockMember('gold', 30);
      
      const resultZero = service.deductQuota(member, 0);
      expect(resultZero.success).toBe(false);
      
      const resultNegative = service.deductQuota(member, -10);
      expect(resultNegative.success).toBe(false);
    });
  });

  describe('hasEnoughQuota', () => {
    it('should return true when enough', () => {
      const member = createMockMember('gold', 30);
      expect(service.hasEnoughQuota(member, 50)).toBe(true);
    });

    it('should return false when not enough', () => {
      const member = createMockMember('gold', 100);
      expect(service.hasEnoughQuota(member, 50)).toBe(false);
    });
  });

  describe('getQuotaUsagePercentage', () => {
    it('should calculate correct percentage', () => {
      const member = createMockMember('gold', 30);
      const expected = Math.round((30 / getDefaultQuotaMinutes('gold')) * 100);
      expect(service.getQuotaUsagePercentage(member)).toBe(expected);
    });

    it('should cap at 100% when overused', () => {
      const member = createMockMember('gold', 200);
      expect(service.getQuotaUsagePercentage(member)).toBe(100);
    });

    it('should return 100 for zero quota', () => {
      const member = createMockMember('gold', 0);
      member.quota.monthlyFreeMinutes = 0;
      member.quota.remainingMinutes = 0;
      expect(service.getQuotaUsagePercentage(member)).toBe(100);
    });
  });

  describe('getDaysUntilReset', () => {
    it('should calculate positive days', () => {
      const member = createMockMember('gold', 0);
      const days = service.getDaysUntilReset(member);
      expect(days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addTimeCard', () => {
    it('should add a new card correctly', () => {
      const member = createMockMember('gold', 0);
      const originalCount = member.timeCards.length;
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      const newCard = service.addTimeCard(member, {
        name: '新购次卡',
        totalMinutes: 500,
        remainingMinutes: 500,
        expireDate: nextYear,
      });
      
      expect(newCard.id).toBeTruthy();
      expect(newCard.isActive).toBe(true);
      expect(member.timeCards.length).toBe(originalCount + 1);
    });
  });

  describe('getActiveTimeCards', () => {
    it('should return only active and non-expired cards', () => {
      const member = createMockMember('gold', 0);
      const now = new Date();
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      member.timeCards.push(
        {
          id: 'TC-EXPIRED',
          name: '过期卡',
          totalMinutes: 300,
          remainingMinutes: 300,
          expireDate: pastDate,
          isActive: true,
        },
        {
          id: 'TC-INACTIVE',
          name: '未激活卡',
          totalMinutes: 300,
          remainingMinutes: 300,
          expireDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          isActive: false,
        },
        {
          id: 'TC-USED-UP',
          name: '用完的卡',
          totalMinutes: 100,
          remainingMinutes: 0,
          expireDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          isActive: true,
        },
      );
      
      const activeCards = service.getActiveTimeCards(member);
      const cardNames = activeCards.map(c => c.name);
      
      expect(cardNames).toContain('10次洗车卡');
      expect(cardNames).not.toContain('过期卡');
      expect(cardNames).not.toContain('未激活卡');
      expect(cardNames).not.toContain('用完的卡');
    });
  });

  describe('deductTimeCard', () => {
    it('should deduct fully when card has enough minutes', () => {
      const member = createMockMember('gold', 0);
      const cardId = member.timeCards[0].id;
      const originalRemaining = member.timeCards[0].remainingMinutes;
      const toDeduct = 120;
      
      const result = service.deductTimeCard(member, cardId, toDeduct);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(toDeduct);
      expect(result.remainingMinutes).toBe(originalRemaining - toDeduct);
      expect(member.timeCards[0].remainingMinutes).toBe(originalRemaining - toDeduct);
    });

    it('should deduct partially and flag remainder when card insufficient', () => {
      const member = createMockMember('gold', 0);
      const cardId = member.timeCards[0].id;
      member.timeCards[0].remainingMinutes = 50;
      const toDeduct = 120;
      
      const result = service.deductTimeCard(member, cardId, toDeduct);
      
      expect(result.success).toBe(true);
      expect(result.deductedMinutes).toBe(50);
      expect(result.remainingMinutes).toBe(0);
    });

    it('should fail for inactive card', () => {
      const member = createMockMember('gold', 0);
      const cardId = member.timeCards[0].id;
      member.timeCards[0].isActive = false;
      
      const result = service.deductTimeCard(member, cardId, 30);
      
      expect(result.success).toBe(false);
    });

    it('should fail and deactivate for expired card', () => {
      const member = createMockMember('gold', 0);
      const cardId = member.timeCards[0].id;
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      member.timeCards[0].expireDate = pastDate;
      
      const result = service.deductTimeCard(member, cardId, 30);
      
      expect(result.success).toBe(false);
      expect(member.timeCards[0].isActive).toBe(false);
    });

    it('should fail for non-existent card', () => {
      const member = createMockMember('gold', 0);
      const result = service.deductTimeCard(member, 'NON-EXISTENT', 30);
      expect(result.success).toBe(false);
    });

    it('should fail for negative or zero minutes', () => {
      const member = createMockMember('gold', 0);
      const cardId = member.timeCards[0].id;
      
      const resultZero = service.deductTimeCard(member, cardId, 0);
      expect(resultZero.success).toBe(false);
      
      const resultNeg = service.deductTimeCard(member, cardId, -10);
      expect(resultNeg.success).toBe(false);
    });
  });

  describe('getResetLogs', () => {
    it('should return logs for correct member only', () => {
      const memberA = createMockMember('gold', 20);
      const memberB = createMockMember('silver', 10);
      memberB.id = 'M002';
      
      service.resetMonthlyQuota(memberA);
      service.resetMonthlyQuota(memberB);
      
      const logsA = service.getResetLogs(memberA.id);
      const logsB = service.getResetLogs(memberB.id);
      
      expect(logsA.every(l => l.memberId === memberA.id)).toBe(true);
      expect(logsB.every(l => l.memberId === memberB.id)).toBe(true);
      expect(logsA.length).toBeGreaterThanOrEqual(1);
      expect(logsB.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTotalFreeMinutes', () => {
    it('should sum remaining quota plus active time cards', () => {
      const member = createMockMember('gold', 0);
      const quotaMin = member.quota.remainingMinutes;
      const cardMin = member.timeCards[0].remainingMinutes;
      
      const total = service.getTotalFreeMinutes(member);
      
      expect(total).toBe(quotaMin + cardMin);
    });

    it('should exclude expired or inactive cards', () => {
      const member = createMockMember('gold', 0);
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      member.timeCards.push({
        id: 'TC-EXPIRED',
        name: '过期卡',
        totalMinutes: 100,
        remainingMinutes: 100,
        expireDate: pastDate,
        isActive: true,
      });
      
      const total = service.getTotalFreeMinutes(member);
      const quotaMin = member.quota.remainingMinutes;
      
      expect(total).toBe(quotaMin + member.timeCards[0].remainingMinutes);
    });
  });
});
