import type { MemberQuota, Member, QuotaResetLog, TimeCard } from '../types';
import { getDefaultQuotaMinutes } from '../data/mockData';

export class QuotaService {
  private resetLogs: QuotaResetLog[] = [];

  getCurrentQuota(member: Member): MemberQuota {
    this.checkAndResetQuota(member);
    return member.quota;
  }

  checkAndResetQuota(member: Member): boolean {
    const now = new Date();
    const resetDate = new Date(member.quota.resetDate);
    
    if (now >= resetDate) {
      this.resetMonthlyQuota(member);
      return true;
    }
    return false;
  }

  resetMonthlyQuota(member: Member): MemberQuota {
    const previousUsedMinutes = member.quota.usedMinutes;
    const newMonthlyMinutes = getDefaultQuotaMinutes(member.level);
    
    const log: QuotaResetLog = {
      id: `LOG${Date.now()}`,
      memberId: member.id,
      resetDate: new Date(),
      previousUsedMinutes,
      newMonthlyMinutes
    };
    this.resetLogs.push(log);

    const now = new Date();
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    member.quota = {
      memberId: member.id,
      monthlyFreeMinutes: newMonthlyMinutes,
      usedMinutes: 0,
      remainingMinutes: newMonthlyMinutes,
      resetDate: nextResetDate,
      lastResetDate: new Date()
    };

    return member.quota;
  }

  deductQuota(member: Member, minutesToDeduct: number): {
    deductedMinutes: number;
    remainingMinutes: number;
    success: boolean;
  } {
    this.checkAndResetQuota(member);
    
    const availableMinutes = member.quota.remainingMinutes;
    const actualDeduction = Math.min(minutesToDeduct, availableMinutes);
    
    if (actualDeduction <= 0) {
      return {
        deductedMinutes: 0,
        remainingMinutes: availableMinutes,
        success: false
      };
    }

    member.quota.usedMinutes += actualDeduction;
    member.quota.remainingMinutes -= actualDeduction;

    return {
      deductedMinutes: actualDeduction,
      remainingMinutes: member.quota.remainingMinutes,
      success: true
    };
  }

  hasEnoughQuota(member: Member, requiredMinutes: number): boolean {
    this.checkAndResetQuota(member);
    return member.quota.remainingMinutes >= requiredMinutes;
  }

  getQuotaUsagePercentage(member: Member): number {
    this.checkAndResetQuota(member);
    if (member.quota.monthlyFreeMinutes === 0) return 100;
    return Math.round(
      (member.quota.usedMinutes / member.quota.monthlyFreeMinutes) * 100
    );
  }

  getDaysUntilReset(member: Member): number {
    this.checkAndResetQuota(member);
    const now = new Date();
    const resetDate = new Date(member.quota.resetDate);
    const diffTime = resetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  addTimeCard(member: Member, timeCard: Omit<TimeCard, 'id' | 'isActive'>): TimeCard {
    const newCard: TimeCard = {
      ...timeCard,
      id: `TC${Date.now()}`,
      isActive: true
    };
    
    member.timeCards.push(newCard);
    return newCard;
  }

  getActiveTimeCards(member: Member): TimeCard[] {
    const now = new Date();
    return member.timeCards.filter(
      card => card.isActive && card.remainingMinutes > 0 && new Date(card.expireDate) > now
    );
  }

  deductTimeCard(
    member: Member,
    cardId: string,
    minutesToDeduct: number
  ): {
    deductedMinutes: number;
    remainingMinutes: number;
    success: boolean;
  } {
    const card = member.timeCards.find(c => c.id === cardId);
    
    if (!card || !card.isActive) {
      return { deductedMinutes: 0, remainingMinutes: 0, success: false };
    }

    if (new Date(card.expireDate) <= new Date()) {
      card.isActive = false;
      return { deductedMinutes: 0, remainingMinutes: 0, success: false };
    }

    const actualDeduction = Math.min(minutesToDeduct, card.remainingMinutes);
    
    if (actualDeduction <= 0) {
      return {
        deductedMinutes: 0,
        remainingMinutes: card.remainingMinutes,
        success: false
      };
    }

    card.remainingMinutes -= actualDeduction;

    return {
      deductedMinutes: actualDeduction,
      remainingMinutes: card.remainingMinutes,
      success: true
    };
  }

  getResetLogs(memberId: string): QuotaResetLog[] {
    return this.resetLogs.filter(log => log.memberId === memberId)
      .sort((a, b) => b.resetDate.getTime() - a.resetDate.getTime());
  }

  getTotalFreeMinutes(member: Member): number {
    this.checkAndResetQuota(member);
    const quotaMinutes = member.quota.remainingMinutes;
    const timeCardMinutes = this.getActiveTimeCards(member)
      .reduce((sum, card) => sum + card.remainingMinutes, 0);
    return quotaMinutes + timeCardMinutes;
  }
}

export const quotaService = new QuotaService();
