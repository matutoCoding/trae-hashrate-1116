import { useNavigate } from 'react-router-dom';
import { Car, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { BillingRecord } from '../types';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  bills: BillingRecord[];
}

const statusConfig = {
  paid: { label: '已完成', color: 'bg-success-100 text-success-700' },
  pending: { label: '待支付', color: 'bg-warning-100 text-warning-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

export default function RecentTransactions({ bills }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const recentBills = bills.slice(0, 3);

  if (recentBills.length === 0) {
    return (
      <div className="animate-fade-in-up opacity-0 animate-stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">最近消费</h3>
          <button
            onClick={() => navigate('/transactions')}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            查看全部 <ChevronRight size={16} />
          </button>
        </div>
        <div className="card text-center py-12">
          <Car size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">暂无消费记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up opacity-0 animate-stagger-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">最近消费</h3>
        <button
          onClick={() => navigate('/transactions')}
          className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
        >
          查看全部 <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        {recentBills.map((bill, index) => {
          const status = statusConfig[bill.status];
          const hasPeak = bill.segments.some(s => s.timeSlot.name === '高峰时段');
          
          return (
            <div
              key={bill.id}
              onClick={() => navigate(`/transactions?id=${bill.id}`)}
              className="card p-4 cursor-pointer"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
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
                      {hasPeak && (
                        <span className="badge bg-accent-100 text-accent-700">
                          高峰
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      时长 {bill.totalDurationMinutes} 分钟
                      {bill.quotaDeductedMinutes > 0 && (
                        <span className="text-success-600 ml-2">
                          · 额度抵扣 {bill.quotaDeductedMinutes}分钟
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-gray-800">
                    ¥{bill.selfPaidAmount.toFixed(2)}
                  </div>
                  {bill.quotaDeductedAmount > 0 && (
                    <div className="text-xs text-success-600">
                      已省 ¥{bill.quotaDeductedAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
