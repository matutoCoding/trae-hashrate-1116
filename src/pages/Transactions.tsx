import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Car, Filter, Calendar, Download, X, Tag, CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { transactionService } from '../services/transaction.service';
import BillDetailModal from '../components/BillDetailModal';
import type { BillingRecord, TransactionFilter } from '../types';
import { cn } from '@/lib/utils';

const statusConfig = {
  paid: { label: '已完成', color: 'bg-success-100 text-success-700' },
  pending: { label: '待支付', color: 'bg-warning-100 text-warning-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

const paymentMethodOptions = [
  { value: '', label: '全部方式', icon: Wallet },
  { value: 'quota', label: '额度支付', icon: Tag },
  { value: 'timecard', label: '次卡支付', icon: CreditCard },
  { value: 'balance', label: '余额支付', icon: Wallet },
  { value: 'mixed', label: '组合支付', icon: Wallet },
];

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { member, billingRecords, selectedMonth, actions } = useStore();
  
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    totalDuration: number;
    totalAmount: number;
    totalSelfPaid: number;
    totalQuotaDeducted: number;
  } | null>(null);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [statusFilter, setStatusFilter] = useState<BillingRecord['status'] | 'all'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [usedQuotaFilter, setUsedQuotaFilter] = useState(false);
  const [usedTimeCardFilter, setUsedTimeCardFilter] = useState(false);

  const billIdParam = searchParams.get('id');

  const buildFilter = (): TransactionFilter => {
    const filter: TransactionFilter = {};
    if (statusFilter !== 'all') filter.status = statusFilter;
    if (paymentMethodFilter) filter.paymentMethod = paymentMethodFilter;
    if (usedQuotaFilter) filter.usedQuota = true;
    if (usedTimeCardFilter) filter.usedTimeCard = true;
    return filter;
  };

  const hasActiveFilters = statusFilter !== 'all' || paymentMethodFilter !== '' || usedQuotaFilter || usedTimeCardFilter;

  useEffect(() => {
    transactionService.setBills(billingRecords);
    refreshData();
  }, [billingRecords, selectedMonth, statusFilter, paymentMethodFilter, usedQuotaFilter, usedTimeCardFilter]);

  useEffect(() => {
    if (billIdParam) {
      const bill = billingRecords.find(b => b.id === billIdParam);
      if (bill) {
        setSelectedBill(bill);
        setSearchParams({});
      }
    }
  }, [billIdParam, billingRecords]);

  const refreshData = () => {
    const filter = buildFilter();
    const data = transactionService.getBillsByMonthWithFilter(
      member.id,
      selectedMonth.year,
      selectedMonth.month,
      filter
    );
    setBills(data);

    const monthlyStats = transactionService.getMonthlyStatisticsWithFilter(
      member.id,
      selectedMonth.year,
      selectedMonth.month,
      filter
    );
    setStats({
      totalCount: monthlyStats.totalCount,
      totalDuration: monthlyStats.totalDuration,
      totalAmount: monthlyStats.totalAmount,
      totalSelfPaid: monthlyStats.totalSelfPaid,
      totalQuotaDeducted: monthlyStats.totalQuotaDeducted
    });
  };

  const changeMonth = (delta: number) => {
    let { year, month } = selectedMonth;
    month += delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    actions.setSelectedMonth(year, month);
  };

  const handleExportMonth = () => {
    const content = transactionService.exportMonth(member.id, selectedMonth.year, selectedMonth.month);
    if (content) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `消费明细_${selectedMonth.year}年${selectedMonth.month}月.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentMethodFilter('');
    setUsedQuotaFilter(false);
    setUsedTimeCardFilter(false);
  };

  const availableMonths = transactionService.getAvailableMonths(member.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">消费明细</h1>
          <p className="text-sm text-gray-500 mt-1">查看您的历史消费记录</p>
        </div>

        <div className="card mb-6 animate-fade-in-up opacity-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div className="text-center">
                <div className="font-semibold text-gray-800">
                  {selectedMonth.year}年{selectedMonth.month}月
                </div>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出本月报表"
              >
                <Download size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  hasActiveFilters ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'
                )}
              >
                <Filter size={20} />
              </button>
            </div>
          </div>

          {showFilter && (
            <div className="space-y-4 mb-4 animate-fade-in-up opacity-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">账单状态</div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    >
                      <X size={12} /> 清除筛选
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'paid', 'pending', 'cancelled'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        statusFilter === s
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {s === 'all' ? '全部' : statusConfig[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">支付方式</div>
                <div className="flex gap-2 flex-wrap">
                  {paymentMethodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethodFilter(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                        paymentMethodFilter === opt.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <opt.icon size={14} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">更多条件</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setUsedQuotaFilter(!usedQuotaFilter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                      usedQuotaFilter
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Tag size={14} />
                    使用了月度额度
                  </button>
                  <button
                    onClick={() => setUsedTimeCardFilter(!usedTimeCardFilter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                      usedTimeCardFilter
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <CreditCard size={14} />
                    使用了次卡
                  </button>
                </div>
              </div>
            </div>
          )}

          {availableMonths.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
              {availableMonths.slice(0, 6).map((m) => (
                <button
                  key={`${m.year}-${m.month}`}
                  onClick={() => actions.setSelectedMonth(m.year, m.month)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
                    selectedMonth.year === m.year && selectedMonth.month === m.month
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="text-sm text-primary-600 mb-1">消费次数</div>
                <div className="text-2xl font-bold text-primary-700">{stats.totalCount}</div>
              </div>
              <div className="bg-accent-50 rounded-xl p-4">
                <div className="text-sm text-accent-600 mb-1">总时长</div>
                <div className="text-2xl font-bold text-accent-700">{stats.totalDuration}分钟</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">消费总额</div>
                <div className="text-xl font-bold text-gray-800">¥{stats.totalAmount.toFixed(2)}</div>
              </div>
              <div className="bg-success-50 rounded-xl p-4">
                <div className="text-sm text-success-600 mb-1">实付金额</div>
                <div className="text-xl font-bold text-success-700">¥{stats.totalSelfPaid.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {bills.length === 0 ? (
          <div className="card text-center py-12 animate-fade-in-up opacity-0 animate-stagger-1">
            <Car size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {hasActiveFilters ? '没有符合筛选条件的记录' : '本月暂无消费记录'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-primary-500 hover:text-primary-600"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map((bill, index) => {
              const status = statusConfig[bill.status];
              const hasPeak = bill.segments.some(s => s.timeSlot.name === '高峰时段');
              
              return (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBill(bill)}
                  className="card p-4 cursor-pointer animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        hasPeak ? 'bg-accent-100' : 'bg-primary-100'
                      )}>
                        <Car 
                          size={20} 
                          className={hasPeak ? 'text-accent-500' : 'text-primary-500'} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {format(new Date(bill.startTime), 'MM月dd日 HH:mm')}
                          </span>
                          <span className={cn('badge', status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                          <Calendar size={12} />
                          <span>{bill.totalDurationMinutes}分钟</span>
                          {bill.quotaDeductedMinutes > 0 && (
                            <span className="text-success-600">
                              · 额度抵扣{bill.quotaDeductedMinutes}分钟
                            </span>
                          )}
                          {bill.timeCardUsed && bill.timeCardUsed.minutesUsed > 0 && (
                            <span className="text-purple-600">
                              · 次卡抵扣{bill.timeCardUsed.minutesUsed}分钟
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        'font-mono font-semibold',
                        bill.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'
                      )}>
                        ¥{bill.selfPaidAmount.toFixed(2)}
                      </div>
                      {bill.quotaDeductedAmount > 0 && bill.status !== 'cancelled' && (
                        <div className="text-xs text-success-600">
                          已省¥{bill.quotaDeductedAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
