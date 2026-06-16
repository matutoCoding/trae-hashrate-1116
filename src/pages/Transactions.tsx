import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Car, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { transactionService } from '../services/transaction.service';
import BillDetailModal from '../components/BillDetailModal';
import type { BillingRecord } from '../types';
import { cn } from '@/lib/utils';

const statusConfig = {
  paid: { label: '已完成', color: 'bg-success-100 text-success-700' },
  pending: { label: '待支付', color: 'bg-warning-100 text-warning-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { member, billingRecords, selectedMonth, actions } = useStore();
  
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    totalDuration: number;
    totalAmount: number;
    totalSelfPaid: number;
  } | null>(null);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BillingRecord['status'] | 'all'>('all');

  const billIdParam = searchParams.get('id');

  useEffect(() => {
    transactionService.setBills(billingRecords);
    refreshData();
  }, [billingRecords, selectedMonth, statusFilter]);

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
    const filter = statusFilter !== 'all' ? { status: statusFilter } : {};
    const data = transactionService.getBillList(member.id, filter);
    setBills(data);

    const monthlyStats = transactionService.getMonthlyStatistics(
      member.id,
      selectedMonth.year,
      selectedMonth.month
    );
    setStats({
      totalCount: monthlyStats.totalCount,
      totalDuration: monthlyStats.totalDuration,
      totalAmount: monthlyStats.totalAmount,
      totalSelfPaid: monthlyStats.totalSelfPaid
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
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                statusFilter !== 'all' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              <Filter size={20} />
            </button>
          </div>

          {showFilter && (
            <div className="flex gap-2 mb-4 animate-fade-in-up opacity-0">
              {(['all', 'paid', 'pending', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    statusFilter === s
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s === 'all' ? '全部' : statusConfig[s].label}
                </button>
              ))}
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
            <p className="text-gray-500">本月暂无消费记录</p>
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
