import { User, Crown, Calendar, Zap } from 'lucide-react';
import type { Member } from '../types';
import { quotaService } from '../services/quota.service';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  member: Member;
}

const levelConfig = {
  normal: { label: '普通会员', color: 'bg-gray-500', gradient: 'from-gray-500 to-gray-600' },
  silver: { label: '银卡会员', color: 'bg-slate-400', gradient: 'from-slate-400 to-slate-500' },
  gold: { label: '黄金会员', color: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600' },
  platinum: { label: '铂金会员', color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600' },
};

export default function MemberCard({ member }: MemberCardProps) {
  const config = levelConfig[member.level];
  const usagePercent = quotaService.getQuotaUsagePercentage(member);
  const daysUntilReset = quotaService.getDaysUntilReset(member);
  const activeCards = quotaService.getActiveTimeCards(member);
  const totalFreeMinutes = quotaService.getTotalFreeMinutes(member);

  return (
    <div className="card-gradient animate-fade-in-up opacity-0">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {member.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Crown size={14} className="text-amber-300" />
              <span className="text-white/80 text-sm">{config.label}</span>
            </div>
          </div>
        </div>
        <span className={cn(
            'badge',
            `bg-gradient-to-r ${config.gradient} border border-white/30 text-white`
          )}>
            VIP
          </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-white">
            {member.quota.remainingMinutes}
          </div>
          <div className="text-white/70 text-xs mt-1">
            剩余额度(分钟)
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-white">
            {totalFreeMinutes}
          </div>
          <div className="text-white/70 text-xs mt-1">
            总可用(分钟)
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-white">
            {activeCards.length}
          </div>
          <div className="text-white/70 text-xs mt-1">
            有效次卡
          </div>
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-white/80" />
            <span className="text-white/80 text-sm">本月额度使用</span>
          </div>
          <span className="text-white font-mono">
            {member.quota.usedMinutes}/{member.quota.monthlyFreeMinutes} 分钟
          </span>
        </div>
        <div className="progress-bar bg-white/20">
          <div 
            className="progress-fill bg-gradient-to-r from-amber-400 to-amber-300"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Calendar size={12} />
            <span>{daysUntilReset} 天后重置</span>
          </div>
          <span className="text-white/60 text-xs">
            已使用 {usagePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
