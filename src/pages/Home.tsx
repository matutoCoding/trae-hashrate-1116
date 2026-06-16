import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import MemberCard from '../components/MemberCard';
import QuickActions from '../components/QuickActions';
import RecentTransactions from '../components/RecentTransactions';

export default function Home() {
  const { member, billingRecords, actions } = useStore();

  useEffect(() => {
    actions.checkAndResetQuota();
    actions.loadFromStorage();
  }, []);

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

        <QuickActions />

        <RecentTransactions bills={billingRecords} />
      </div>
    </div>
  );
}
