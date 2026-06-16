import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Clock, Zap, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { useStore } from '../store/useStore';
import { pricingService } from '../services/pricing.service';
import { billingService } from '../services/billing.service';
import { quotaService } from '../services/quota.service';
import BillingSegments from '../components/BillingSegments';
import type { BillingRecord, TimeCard } from '../types';
import { cn } from '@/lib/utils';

export default function Wash() {
  const navigate = useNavigate();
  const { member, actions } = useStore();
  
  const [isWashing, setIsWashing] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentCost, setCurrentCost] = useState<{
    segments: any[];
    totalDurationMinutes: number;
    totalAmount: number;
  } | null>(null);
  const [currentSlot, setCurrentSlot] = useState(pricingService.getRateByTime(new Date()));
  const [nextRateChange, setNextRateChange] = useState<Date | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingBill, setPendingBill] = useState<BillingRecord | null>(null);
  const [selectedTimeCard, setSelectedTimeCard] = useState<string | null>(null);
  const [useQuota, setUseQuota] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const costUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    const updateSlot = () => {
      const now = new Date();
      setCurrentSlot(pricingService.getRateByTime(now));
      setNextRateChange(pricingService.getNextRateChangeTime(now));
    };
    
    updateSlot();
    const interval = setInterval(updateSlot, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isWashing && startTime) {
      timerRef.current = window.setInterval(() => {
        const elapsed = differenceInSeconds(new Date(), startTime);
        setElapsedSeconds(elapsed);
      }, 1000);

      costUpdateRef.current = window.setInterval(() => {
        const result = pricingService.calculateRealTimeCost(startTime, new Date());
        setCurrentCost(result);
      }, 5000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (costUpdateRef.current) clearInterval(costUpdateRef.current);
      };
    }
  }, [isWashing, startTime]);

  const startWash = () => {
    const now = new Date();
    setStartTime(now);
    setIsWashing(true);
    setElapsedSeconds(0);
    setCurrentCost(null);
    setPaymentSuccess(false);
    
    setTimeout(() => {
      const result = pricingService.calculateRealTimeCost(now, new Date());
      setCurrentCost(result);
    }, 1000);
  };

  const endWash = () => {
    if (!startTime) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (costUpdateRef.current) clearInterval(costUpdateRef.current);
    
    const endTime = new Date();
    const finalResult = pricingService.calculateSegments(startTime, endTime);
    setCurrentCost(finalResult);
    
    const options = {
      useTimeCardId: selectedTimeCard || undefined,
      preferQuotaFirst: useQuota
    };
    
    const result = billingService.createBill(startTime, endTime, member, options);
    setPendingBill(result.bill);
    setIsWashing(false);
    setShowPayment(true);
  };

  const confirmPayment = () => {
    if (!pendingBill) return;
    
    const finalBill = billingService.confirmPayment(pendingBill, pendingBill.paymentMethod);
    actions.addBillingRecord(finalBill);
    setPaymentSuccess(true);
    
    setTimeout(() => {
      setShowPayment(false);
      setPendingBill(null);
      setSelectedTimeCard(null);
      setUseQuota(true);
      setCurrentCost(null);
      setStartTime(null);
      setElapsedSeconds(0);
    }, 2000);
  };

  const cancelPayment = () => {
    if (pendingBill) {
      billingService.cancelBill(pendingBill);
    }
    setShowPayment(false);
    setPendingBill(null);
    setCurrentCost(null);
    setStartTime(null);
    setElapsedSeconds(0);
    setSelectedTimeCard(null);
    setUseQuota(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeToChange = () => {
    if (!nextRateChange) return '';
    const diff = differenceInSeconds(nextRateChange, new Date());
    if (diff <= 0) return '';
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}分${secs}秒后切换费率`;
  };

  const activeTimeCards = quotaService.getActiveTimeCards(member);

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24">
        <div className="text-center animate-fade-in-up opacity-0">
          <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} className="text-success-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">支付成功</h2>
          <p className="text-gray-500 mb-6">账单已生成，感谢您的使用</p>
          <button
            onClick={() => navigate('/transactions')}
            className="btn-primary"
          >
            查看账单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">洗车消费</h1>
          <p className="text-sm text-gray-500 mt-1">扫码启动设备，开始洗车</p>
        </div>

        {currentSlot && (
          <div 
            className="card mb-6 animate-fade-in-up opacity-0"
            style={{ borderLeftColor: currentSlot.color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">当前时段</div>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentSlot.color }}
                  />
                  <span className="font-semibold text-gray-800">{currentSlot.name}</span>
                  <span className="text-sm text-gray-500">
                    {currentSlot.startTime} - {currentSlot.endTime}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">费率</div>
                <div className="font-mono text-lg font-bold text-accent-500">
                  ¥{currentSlot.pricePerMinute.toFixed(2)}/分钟
                </div>
              </div>
            </div>
            {nextRateChange && !isWashing && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-warning-600">
                <AlertCircle size={14} />
                <span>{formatTimeToChange()}</span>
              </div>
            )}
          </div>
        )}

        {!isWashing && !showPayment && (
          <div className="space-y-6 animate-fade-in-up opacity-0 animate-stagger-1">
            <div className="card text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">准备开始</h2>
              <p className="text-gray-500 mb-6">请确保车辆已停妥，设备已连接</p>
              <button
                onClick={startWash}
                className="btn-accent w-full max-w-xs"
              >
                开始洗车
              </button>
            </div>

            {member.quota.remainingMinutes > 0 && (
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
                      <Tag size={20} className="text-success-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">使用月度免费额度</div>
                      <div className="text-sm text-gray-500">
                        剩余 {member.quota.remainingMinutes} 分钟
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseQuota(!useQuota)}
                    className={cn(
                      'w-12 h-7 rounded-full transition-colors duration-300',
                      useQuota ? 'bg-success-500' : 'bg-gray-200'
                    )}
                  >
                    <div 
                      className={cn(
                        'w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300',
                        useQuota ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTimeCards.length > 0 && (
              <div className="card">
                <h3 className="font-medium text-gray-800 mb-3">选择次卡抵扣（可选）</h3>
                <div className="space-y-2">
                  {activeTimeCards.map((card: TimeCard) => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedTimeCard(selectedTimeCard === card.id ? null : card.id)}
                      className={cn(
                        'p-3 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        selectedTimeCard === card.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{card.name}</div>
                          <div className="text-sm text-gray-500">
                            剩余 {card.remainingMinutes}/{card.totalMinutes} 分钟
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          有效期至 {format(new Date(card.expireDate), 'yyyy-MM-dd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isWashing && (
          <div className="space-y-6 animate-fade-in-up opacity-0">
            <div className="card-gradient text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/80">正在计费中</span>
              </div>
              <div className="font-mono text-6xl font-bold text-white mb-2">
                {formatDuration(elapsedSeconds)}
              </div>
              <div className="text-white/70 text-sm">
                开始时间: {startTime && format(startTime, 'HH:mm:ss')}
              </div>
              
              {currentCost && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="text-white/80 mb-1">当前费用</div>
                  <div className="font-mono text-4xl font-bold text-white">
                    ¥{currentCost.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-white/70 text-sm mt-1">
                    已计时 {currentCost.totalDurationMinutes} 分钟
                  </div>
                </div>
              )}

              {nextRateChange && (
                <div className="mt-4 flex items-center justify-center gap-2 text-white/80 text-sm">
                  <Clock size={14} />
                  <span>{formatTimeToChange()}</span>
                </div>
              )}
            </div>

            {currentCost && currentCost.segments.length > 0 && (
              <div className="card">
                <h3 className="font-medium text-gray-800 mb-4">分段计费明细</h3>
                <BillingSegments segments={currentCost.segments} />
              </div>
            )}

            {member.quota.remainingMinutes > 0 && (
              <div className="bg-success-50 border border-success-100 rounded-xl p-4 flex items-center gap-3">
                <Zap size={20} className="text-success-500" />
                <div>
                  <div className="font-medium text-success-700">额度充足</div>
                  <div className="text-sm text-success-600">
                    剩余免费额度 {member.quota.remainingMinutes} 分钟，将优先抵扣
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={endWash}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
                         hover:from-red-600 hover:to-red-700 active:scale-[0.98] transition-all duration-200
                         shadow-lg flex items-center justify-center gap-2"
            >
              <Square size={20} fill="currentColor" />
              结束洗车
            </button>
          </div>
        )}

        {showPayment && pendingBill && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden animate-fade-in-up opacity-0">
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 text-center">确认支付</h2>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6 space-y-6 scrollbar-hide">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">应付金额</div>
                  <div className="font-mono text-5xl font-bold text-accent-500">
                    ¥{pendingBill.selfPaidAmount.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">消费总额</span>
                      <span className="font-mono">¥{pendingBill.totalAmount.toFixed(2)}</span>
                    </div>
                    {pendingBill.quotaDeductedMinutes > 0 && (
                      <div className="flex items-center justify-between text-sm text-success-600">
                        <span>月度额度抵扣 ({pendingBill.quotaDeductedMinutes}分钟)</span>
                        <span className="font-mono">-¥{pendingBill.quotaDeductedAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {pendingBill.timeCardUsed && (
                      <div className="flex items-center justify-between text-sm text-purple-600">
                        <span>次卡抵扣 ({pendingBill.timeCardUsed.minutesUsed}分钟)</span>
                        <span className="font-mono">
                          -¥{(pendingBill.totalAmount - pendingBill.quotaDeductedAmount - pendingBill.selfPaidAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">分段明细</h3>
                  <BillingSegments segments={pendingBill.segments} />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white p-6 border-t border-gray-100 flex gap-4">
                <button
                  onClick={cancelPayment}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-medium rounded-xl
                             hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-1 btn-accent"
                >
                  确认支付 ¥{pendingBill.selfPaidAmount.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
