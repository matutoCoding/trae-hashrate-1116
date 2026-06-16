import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Wallet, Gift, Calendar, RefreshCw, Clock, ChevronRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { quotaService } from '../services/quota.service';
import { transactionService } from '../services/transaction.service';
import type { TimeCard, QuotaResetLog } from '../types';
import { cn } from '@/lib/utils';

const levelConfig = {
  normal: { label: '普通会员', monthlyQuota: 60, color: '#6B7280' },
  silver: { label: '银卡会员', monthlyQuota: 90, color: '#9CA3AF' },
  gold: { label: '黄金会员', monthlyQuota: 120, color: '#F59E0B' },
  platinum: { label: '铂金会员', monthlyQuota: 180, color: '#8B5CF6' },
};

export default function Quota() {
  const { member, billingRecords } = useStore();
  
  const [activeTab, setActiveTab] = useState<'quota' | 'cards' | 'history'>('quota');
  const [resetLogs, setResetLogs] = useState<QuotaResetLog[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; duration: number }[]>([]);

  useEffect(() => {
    transactionService.setBills(billingRecords);
    setResetLogs(quotaService.getResetLogs(member.id));
    setTrendData(transactionService.getDailyConsumptionTrend(member.id, 7));
  }, [billingRecords, member.id]);

  const quota = quotaService.getCurrentQuota(member);
  const usagePercent = quotaService.getQuotaUsagePercentage(member);
  const daysUntilReset = quotaService.getDaysUntilReset(member);
  const activeCards = quotaService.getActiveTimeCards(member);
  const expiredCards = member.timeCards.filter(
    card => !card.isActive || new Date(card.expireDate) <= new Date()
  );

  const pieData = [
    { name: '已使用', value: quota.usedMinutes, color: '#F97316' },
    { name: '剩余', value: quota.remainingMinutes, color: '#10B981' },
  ];

  const totalCardMinutes = activeCards.reduce((sum, card) => sum + card.remainingMinutes, 0);
  const totalUsedCardMinutes = member.timeCards.reduce(
    (sum, card) => sum + (card.totalMinutes - card.remainingMinutes),
    0
  );

  const handleResetQuota = () => {
    if (confirm('确定要手动重置月度额度吗？这将会清零已用额度。')) {
      quotaService.resetMonthlyQuota(member);
      setResetLogs(quotaService.getResetLogs(member.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">额度管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的免费额度和次卡</p>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: 'quota', label: '月度额度', icon: Wallet },
            { key: 'cards', label: '我的次卡', icon: Gift },
            { key: 'history', label: '重置记录', icon: RefreshCw },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200',
                activeTab === key
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon size={16} />
                <span>{label}</span>
              </div>
            </button>
          ))}
        </div>

        {activeTab === 'quota' && (
          <div className="space-y-6 animate-fade-in-up opacity-0">
            <div className="card-gradient">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-white/80 text-sm">当前会员等级</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: levelConfig[member.level].color }}
                    />
                    <span className="text-xl font-bold text-white">
                      {levelConfig[member.level].label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleResetQuota}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
                >
                  手动重置
                </button>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={52}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value}分钟`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1">
                  <div className="text-white/80 text-sm mb-1">已使用 / 总额度</div>
                  <div className="font-mono text-3xl font-bold text-white mb-1">
                    {quota.usedMinutes}
                    <span className="text-white/60 text-xl">/{quota.monthlyFreeMinutes}</span>
                    <span className="text-white/60 text-base ml-1">分钟</span>
                  </div>
                  <div className="text-white/80">
                    剩余 <span className="font-semibold text-white">{quota.remainingMinutes}</span> 分钟
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar size={16} />
                    <span>下次重置</span>
                  </div>
                  <div className="text-white font-medium">
                    {format(new Date(quota.resetDate), 'yyyy年MM月dd日')}
                    <span className="text-white/60 ml-2">({daysUntilReset}天后)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary-500" />
                  <h3 className="font-medium text-gray-800">近7天消费趋势</h3>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: '分钟', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9CA3AF' } }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'duration') return [`${value} 分钟`, '洗车时长'];
                        if (name === 'amount') return [`¥${value.toFixed(2)}`, '消费金额'];
                        return [value, name];
                      }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                      formatter={(value) => {
                        if (value === 'duration') return '洗车时长(分钟)';
                        if (value === 'amount') return '消费金额(元)';
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="duration" 
                      fill="#0EA5E9" 
                      radius={[4, 4, 0, 0]} 
                      name="duration"
                      barSize={20}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#34D399" 
                      radius={[4, 4, 0, 0]} 
                      name="amount"
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <div className="text-sm text-gray-500 mb-2">本月已节省</div>
                <div className="font-mono text-2xl font-bold text-success-600">
                  ¥{billingRecords
                    .filter(b => new Date(b.createdAt).getMonth() === new Date().getMonth())
                    .reduce((sum, b) => sum + b.quotaDeductedAmount, 0)
                    .toFixed(2)}
                </div>
              </div>
              <div className="card">
                <div className="text-sm text-gray-500 mb-2">累计节省</div>
                <div className="font-mono text-2xl font-bold text-primary-600">
                  ¥{billingRecords.reduce((sum, b) => sum + b.quotaDeductedAmount, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-4 animate-fade-in-up opacity-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={20} className="text-accent-500" />
                <h3 className="font-medium text-gray-800">有效次卡</h3>
              </div>
              <span className="text-sm text-gray-500">
                共 {activeCards.length} 张，{totalCardMinutes} 分钟
              </span>
            </div>

            {activeCards.length === 0 ? (
              <div className="card text-center py-12">
                <Gift size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无有效次卡</p>
                <button className="btn-primary mt-4 text-sm py-2 px-4">
                  购买次卡
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCards.map((card: TimeCard, index: number) => {
                  const usagePercent = Math.round(
                    ((card.totalMinutes - card.remainingMinutes) / card.totalMinutes) * 100
                  );
                  
                  return (
                    <div 
                      key={card.id}
                      className="card animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-800">{card.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Clock size={12} />
                            <span>有效期至 {format(new Date(card.expireDate), 'yyyy-MM-dd')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-accent-500">
                            {card.remainingMinutes}
                            <span className="text-sm text-gray-500 font-normal">/{card.totalMinutes}分钟</span>
                          </div>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>已使用 {card.totalMinutes - card.remainingMinutes} 分钟</span>
                        <span>{usagePercent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {expiredCards.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-gray-500 mb-3">已失效次卡</h3>
                <div className="space-y-2">
                  {expiredCards.slice(0, 3).map((card: TimeCard) => (
                    <div 
                      key={card.id}
                      className="bg-gray-50 rounded-xl p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-600">{card.name}</div>
                          <div className="text-sm text-gray-400">
                            已使用 {card.totalMinutes - card.remainingMinutes}/{card.totalMinutes} 分钟
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(card.expireDate) <= new Date() ? '已过期' : '已用完'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card bg-gradient-to-r from-accent-50 to-primary-50 border-none">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">累计已核销</div>
                  <div className="text-sm text-gray-500">所有次卡使用情况</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-accent-600">
                    {totalUsedCardMinutes} 分钟
                  </div>
                  <div className="text-xs text-gray-500">
                    共 {member.timeCards.length} 张次卡
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in-up opacity-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-primary-500" />
                <h3 className="font-medium text-gray-800">额度重置记录</h3>
              </div>
            </div>

            {resetLogs.length === 0 ? (
              <div className="card text-center py-12">
                <RefreshCw size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无重置记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resetLogs.map((log, index) => (
                  <div 
                    key={log.id}
                    className="card p-4 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                          <RefreshCw size={18} className="text-primary-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">月度额度重置</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(log.resetDate), 'yyyy-MM-dd HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-primary-600">
                          +{log.newMonthlyMinutes} 分钟
                        </div>
                        <div className="text-xs text-gray-400">
                          上月使用 {log.previousUsedMinutes} 分钟
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <h3 className="font-medium text-gray-800 mb-3">额度规则说明</h3>
              <div className="card space-y-3">
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800 text-sm">每月自动重置</div>
                    <div className="text-sm text-gray-500">每月1日0点自动重置当月免费额度，上月剩余额度不累加</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800 text-sm">优先使用免费额度</div>
                    <div className="text-sm text-gray-500">消费时优先使用月度免费额度，超出部分转为自费或使用次卡</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800 text-sm">会员等级额度</div>
                    <div className="text-sm text-gray-500">
                      普通会员60分钟/月，银卡90分钟/月，金卡120分钟/月，铂金卡180分钟/月
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
