import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { transactionService } from '../services/transaction.service';
import { quotaService } from '../services/quota.service';
import MemberCard from '../components/MemberCard';
import QuickActions from '../components/QuickActions';
import RecentTransactions from '../components/RecentTransactions';
import { Tag, CreditCard, Clock, ChevronRight, TrendingUp } from 'lucide-react';

export default function Home() {
  const { member, billingRecords, actions } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    actions.checkAndResetQuota();
    actions.loadFromStorage();
  }, []);

  const now = new Date();
  const currentMonthBills = billingRecords.filter(b => {
    const endTime = new Date(b.endTime);
    return endTime.getMonth() === now.getMonth() && endTime.getFullYear() === now.getFullYear();
  });

  const quotaUsedThisMonth = currentMonthBills.reduce((sum, b) => sum + b.quotaDeductedMinutes, 0);
  const timeCardUsedThisMonth = currentMonthBills.reduce(
    (sum, b) => sum + (b.timeCardUsed?.minutesUsed ?? 0),
    0
  );
  const totalSelfPaidThisMonth = currentMonthBills.reduce((sum, b) => sum + b.selfPaidAmount, 0);
  const totalDurationThisMonth = currentMonthBills.reduce((sum, b) => sum + b.totalDurationMinutes, 0);
  const remainingAvailable = member.quota.remainingMinutes + 
    member.timeCards.filter(c => c.isActive && new Date(c.expireDate) > now).reduce((sum, c) => sum + c.remainingMinutes, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">自助洗车</h1>
            <p className="text-sm text-gray-500 mt-1">欢迎回来，{member.name}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-lg">👋</span>
          </div>
        </div>

        <MemberCard member={member} />

        <div 
          className="card cursor-pointer group"
          onClick={() => navigate('/transactions')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-500" />
              <h3 className="font-medium text-gray-800">本月消费概览</h3>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400 group-hover:text-primary-500 transition-colors">
              <span>查看明细</span>
              <ChevronRight size={16} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-success-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Tag size={12} className="text-success-500" />
                <span className="text-xs text-success-600">额度消耗</span>
              </div>
              <div className="font-mono text-lg font-bold text-success-700">{quotaUsedThisMonth}</div>
              <div className="text-xs text-gray-400">分钟</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CreditCard size={12} className="text-purple-500" />
                <span className="text-xs text-purple-600">次卡消耗</span>
              </div>
              <div className="font-mono text-lg font-bold text-purple-700">{timeCardUsedThisMonth}</div>
              <div className="text-xs text-gray-400">分钟</div>
            </div>
            <div className="bg-primary-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={12} className="text-primary-500" />
                <span className="text-xs text-primary-600">还可用</span>
              </div>
              <div className="font-mono text-lg font-bold text-primary-700">{remainingAvailable}</div>
              <div className="text-xs text-gray-400">分钟</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                洗车 <span className="font-medium text-gray-700">{currentMonthBills.length}</span> 次
              </span>
              <span className="text-gray-500">
                共 <span className="font-medium text-gray-700">{totalDurationThisMonth}</span> 分钟
              </span>
            </div>
            <span className="text-gray-500">
              实付 <span className="font-mono font-medium text-gray-800">¥{totalSelfPaidThisMonth.toFixed(2)}</span>
            </span>
          </div>
        </div>

        <QuickActions />

        <RecentTransactions bills={billingRecords} />
      </div>
    </div>
  );
}
