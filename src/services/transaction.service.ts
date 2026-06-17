import type { BillingRecord, TransactionFilter } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export class TransactionService {
  private bills: BillingRecord[] = [];

  constructor(initialBills: BillingRecord[] = []) {
    this.bills = initialBills;
  }

  setBills(bills: BillingRecord[]): void {
    this.bills = bills;
  }

  addBill(bill: BillingRecord): void {
    this.bills.unshift(bill);
    this.saveToStorage();
  }

  getBillList(memberId: string, filter: TransactionFilter = {}): BillingRecord[] {
    let filtered = this.bills.filter(bill => bill.memberId === memberId);

    if (filter.startDate && filter.endDate) {
      filtered = filtered.filter(bill =>
        isWithinInterval(new Date(bill.endTime), {
          start: filter.startDate!,
          end: filter.endDate!
        })
      );
    }

    if (filter.status) {
      filtered = filtered.filter(bill => bill.status === filter.status);
    }

    if (filter.paymentMethod) {
      filtered = filtered.filter(bill => bill.paymentMethod === filter.paymentMethod);
    }

    if (filter.usedQuota === true) {
      filtered = filtered.filter(bill => bill.quotaDeductedMinutes > 0);
    }

    if (filter.usedTimeCard === true) {
      filtered = filtered.filter(bill => !!bill.timeCardUsed && bill.timeCardUsed.minutesUsed > 0);
    }

    return filtered.sort((a, b) => 
      new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );
  }

  getBillDetail(billId: string): BillingRecord | undefined {
    return this.bills.find(bill => bill.id === billId);
  }

  getBillsByMonth(memberId: string, year: number, month: number): BillingRecord[] {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    
    return this.getBillList(memberId, { startDate: start, endDate: end });
  }

  getBillsByMonthWithFilter(memberId: string, year: number, month: number, filter: TransactionFilter = {}): BillingRecord[] {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    
    return this.getBillList(memberId, { ...filter, startDate: start, endDate: end });
  }

  getMonthlyStatisticsWithFilter(memberId: string, year: number, month: number, filter: TransactionFilter = {}) {
    const bills = this.getBillsByMonthWithFilter(memberId, year, month, filter);
    
    const totalCount = bills.length;
    const totalDuration = bills.reduce((sum, bill) => sum + bill.totalDurationMinutes, 0);
    const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalQuotaDeducted = bills.reduce((sum, bill) => sum + bill.quotaDeductedAmount, 0);
    const totalSelfPaid = bills.reduce((sum, bill) => sum + bill.selfPaidAmount, 0);

    return {
      totalCount,
      totalDuration,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalQuotaDeducted: Math.round(totalQuotaDeducted * 100) / 100,
      totalSelfPaid: Math.round(totalSelfPaid * 100) / 100,
      averageDuration: totalCount > 0 ? Math.round(totalDuration / totalCount) : 0
    };
  }

  getMonthlyStatistics(memberId: string, year: number, month: number) {
    const bills = this.getBillsByMonth(memberId, year, month);
    
    const totalCount = bills.length;
    const totalDuration = bills.reduce((sum, bill) => sum + bill.totalDurationMinutes, 0);
    const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalQuotaDeducted = bills.reduce((sum, bill) => sum + bill.quotaDeductedAmount, 0);
    const totalSelfPaid = bills.reduce((sum, bill) => sum + bill.selfPaidAmount, 0);

    const peakCount = bills.filter(bill => 
      bill.segments.some(s => s.timeSlot.name === '高峰时段')
    ).length;

    return {
      totalCount,
      totalDuration,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalQuotaDeducted: Math.round(totalQuotaDeducted * 100) / 100,
      totalSelfPaid: Math.round(totalSelfPaid * 100) / 100,
      peakCount,
      averageDuration: totalCount > 0 ? Math.round(totalDuration / totalCount) : 0
    };
  }

  getRecentBills(memberId: string, limit: number = 5): BillingRecord[] {
    return this.getBillList(memberId).slice(0, limit);
  }

  getAvailableMonths(memberId: string): { year: number; month: number; label: string }[] {
    const months = new Set<string>();
    
    this.bills
      .filter(bill => bill.memberId === memberId)
      .forEach(bill => {
        const date = new Date(bill.endTime);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        months.add(key);
      });

    return Array.from(months)
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          label: format(new Date(year, month - 1), 'yyyy年MM月')
        };
      })
      .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));
  }

  exportBill(billId: string): string | null {
    const bill = this.getBillDetail(billId);
    if (!bill) return null;

    const lines: string[] = [];
    lines.push('================================');
    lines.push('        自助洗车账单');
    lines.push('================================');
    lines.push('');
    lines.push(`账单编号: ${bill.id}`);
    lines.push(`消费时间: ${format(new Date(bill.startTime), 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push(`结束时间: ${format(new Date(bill.endTime), 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push('');
    lines.push('--------------------------------');
    lines.push('时段明细');
    lines.push('--------------------------------');
    
    bill.segments.forEach((seg, idx) => {
      lines.push(
        `${idx + 1}. ${seg.timeSlot.name}`
      );
      lines.push(
        `   时间: ${format(new Date(seg.startTime), 'HH:mm')} - ${format(new Date(seg.endTime), 'HH:mm')}`
      );
      lines.push(
        `   时长: ${seg.durationMinutes}分钟 × ¥${seg.timeSlot.pricePerMinute.toFixed(2)}/分钟`
      );
      lines.push(
        `   金额: ¥${seg.amount.toFixed(2)}`
      );
      lines.push('');
    });

    lines.push('--------------------------------');
    lines.push('费用合计');
    lines.push('--------------------------------');
    lines.push(`总时长: ${bill.totalDurationMinutes}分钟`);
    lines.push(`总金额: ¥${bill.totalAmount.toFixed(2)}`);
    lines.push('');
    
    if (bill.quotaDeductedMinutes > 0) {
      lines.push(`月度额度抵扣: ${bill.quotaDeductedMinutes}分钟  -¥${bill.quotaDeductedAmount.toFixed(2)}`);
    }
    
    if (bill.timeCardUsed) {
      lines.push(`次卡抵扣: ${bill.timeCardUsed.minutesUsed}分钟`);
    }
    
    lines.push('');
    lines.push(`应付金额: ¥${bill.selfPaidAmount.toFixed(2)}`);
    lines.push('');
    lines.push(`支付方式: ${this.getPaymentMethodName(bill.paymentMethod)}`);
    lines.push(`账单状态: ${this.getStatusName(bill.status)}`);
    lines.push('');
    lines.push('================================');
    lines.push(`打印时间: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push('================================');

    return lines.join('\n');
  }

  exportMonth(memberId: string, year: number, month: number): string | null {
    const bills = this.getBillsByMonth(memberId, year, month);
    if (bills.length === 0) return null;

    const stats = this.getMonthlyStatistics(memberId, year, month);

    const lines: string[] = [];
    lines.push('====================================');
    lines.push(`  ${year}年${month}月 消费明细报表`);
    lines.push('====================================');
    lines.push('');
    lines.push('--- 月度汇总 ---');
    lines.push(`消费次数: ${stats.totalCount} 次`);
    lines.push(`总时长: ${stats.totalDuration} 分钟`);
    lines.push(`消费总额: ¥${stats.totalAmount.toFixed(2)}`);
    lines.push(`额度抵扣: ¥${stats.totalQuotaDeducted.toFixed(2)}`);
    lines.push(`实付金额: ¥${stats.totalSelfPaid.toFixed(2)}`);
    lines.push(`平均时长: ${stats.averageDuration} 分钟/次`);
    lines.push('');
    lines.push('--- 消费明细 ---');
    lines.push('');

    bills.forEach((bill, idx) => {
      lines.push(`${idx + 1}. 账单编号: ${bill.id}`);
      lines.push(`   时间: ${format(new Date(bill.startTime), 'yyyy-MM-dd HH:mm')} ~ ${format(new Date(bill.endTime), 'HH:mm')}`);
      lines.push(`   时长: ${bill.totalDurationMinutes}分钟  总额: ¥${bill.totalAmount.toFixed(2)}`);
      if (bill.quotaDeductedMinutes > 0) {
        lines.push(`   额度抵扣: ${bill.quotaDeductedMinutes}分钟 -¥${bill.quotaDeductedAmount.toFixed(2)}`);
      }
      if (bill.timeCardUsed) {
        lines.push(`   次卡抵扣: ${bill.timeCardUsed.minutesUsed}分钟 -¥${bill.timeCardUsed.amountDeducted.toFixed(2)}`);
      }
      lines.push(`   实付: ¥${bill.selfPaidAmount.toFixed(2)}  方式: ${this.getPaymentMethodName(bill.paymentMethod)}  状态: ${this.getStatusName(bill.status)}`);
      lines.push('');
    });

    lines.push('====================================');
    lines.push(`导出时间: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push('====================================');

    return lines.join('\n');
  }

  private getPaymentMethodName(method: string): string {
    const map: Record<string, string> = {
      'quota': '月度额度',
      'timecard': '次卡',
      'balance': '余额支付',
      'mixed': '组合支付'
    };
    return map[method] || method;
  }

  private getStatusName(status: string): string {
    const map: Record<string, string> = {
      'pending': '待支付',
      'paid': '已支付',
      'cancelled': '已取消'
    };
    return map[status] || status;
  }

  getDailyConsumptionTrend(memberId: string, days: number = 7) {
    const data: { date: string; fullDate: string; amount: number; duration: number; billIds: string[] }[] = [];
    const end = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayBills = this.getBillList(memberId, {
        startDate: date,
        endDate: nextDay
      });

      data.push({
        date: format(date, 'MM-dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        amount: Math.round(dayBills.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100,
        duration: dayBills.reduce((sum, b) => sum + b.totalDurationMinutes, 0),
        billIds: dayBills.map(b => b.id)
      });
    }

    return data;
  }

  getCumulativeQuotaUsedUpTo(memberId: string, upToDate: Date): number {
    return this.bills
      .filter(bill => 
        bill.memberId === memberId && 
        new Date(bill.endTime) <= upToDate
      )
      .reduce((sum, bill) => sum + bill.quotaDeductedMinutes, 0);
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('billingRecords', JSON.stringify(this.bills));
    } catch (e) {
      console.error('保存账单失败', e);
    }
  }

  loadFromStorage(): void {
    try {
      const data = localStorage.getItem('billingRecords');
      if (data) {
        this.bills = JSON.parse(data).map((bill: BillingRecord) => ({
          ...bill,
          startTime: new Date(bill.startTime),
          endTime: new Date(bill.endTime),
          createdAt: new Date(bill.createdAt),
          segments: bill.segments.map(seg => ({
            ...seg,
            startTime: new Date(seg.startTime),
            endTime: new Date(seg.endTime)
          }))
        }));
      }
    } catch (e) {
      console.error('加载账单失败', e);
    }
  }
}

export const transactionService = new TransactionService();
