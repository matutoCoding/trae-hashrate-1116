import { X, Download, Calendar, Clock, Wallet, CreditCard, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { BillingRecord } from '../types';
import BillingSegments from './BillingSegments';
import { cn } from '@/lib/utils';

interface BillDetailModalProps {
  bill: BillingRecord;
  onClose: () => void;
}

const statusConfig = {
  paid: { label: '已支付', color: 'bg-success-100 text-success-700' },
  pending: { label: '待支付', color: 'bg-warning-100 text-warning-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

const paymentMethodConfig: Record<string, { label: string; icon: typeof Wallet }> = {
  quota: { label: '月度额度', icon: Tag },
  timecard: { label: '次卡抵扣', icon: CreditCard },
  balance: { label: '余额支付', icon: Wallet },
  mixed: { label: '组合支付', icon: Wallet },
};

export default function BillDetailModal({ bill, onClose }: BillDetailModalProps) {
  const status = statusConfig[bill.status];
  const paymentMethod = paymentMethodConfig[bill.paymentMethod] || paymentMethodConfig.balance;
  const PaymentIcon = paymentMethod.icon;

  const handleExport = () => {
    const { transactionService } = require('../services/transaction.service');
    const content = transactionService.exportBill(bill.id);
    if (content) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `账单_${bill.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden animate-fade-in-up opacity-0">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">账单详情</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出账单"
              >
                <Download size={20} className="text-gray-500" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6 space-y-6 scrollbar-hide">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">账单编号</div>
              <div className="font-mono text-gray-800 mt-1">{bill.id}</div>
            </div>
            <span className={cn('badge px-3 py-1', status.color)}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar size={14} />
                <span>开始时间</span>
              </div>
              <div className="font-medium text-gray-800">
                {format(new Date(bill.startTime), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar size={14} />
                <span>结束时间</span>
              </div>
              <div className="font-medium text-gray-800">
                {format(new Date(bill.endTime), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Clock size={14} />
              <span>洗车时长</span>
            </div>
            <div className="font-mono text-2xl font-bold text-gray-800">
              {bill.totalDurationMinutes} <span className="text-base font-normal">分钟</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-3">分段计费明细</h3>
            <BillingSegments segments={bill.segments} />
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-5">
            <h3 className="font-medium text-gray-800 mb-4">费用汇总</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">消费总额</span>
                <span className="font-mono text-gray-800">¥{bill.totalAmount.toFixed(2)}</span>
              </div>
              
              {bill.quotaDeductedMinutes > 0 && (
                <div className="flex items-center justify-between text-success-600">
                  <span className="flex items-center gap-2">
                    <Tag size={16} />
                    月度额度抵扣 ({bill.quotaDeductedMinutes}分钟)
                  </span>
                  <span className="font-mono">-¥{bill.quotaDeductedAmount.toFixed(2)}</span>
                </div>
              )}
              
              {bill.timeCardUsed && (
                <div className="flex items-center justify-between text-purple-600">
                  <span className="flex items-center gap-2">
                    <CreditCard size={16} />
                    次卡抵扣 ({bill.timeCardUsed.minutesUsed}分钟)
                  </span>
                  <span className="font-mono">-¥{(bill.totalAmount - bill.quotaDeductedAmount - bill.selfPaidAmount).toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">应付金额</span>
                  <span className="font-mono text-2xl font-bold text-accent-500">
                    ¥{bill.selfPaidAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <PaymentIcon size={18} className="text-primary-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">支付方式</div>
                <div className="font-medium text-gray-800">{paymentMethod.label}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">支付时间</div>
              <div className="font-medium text-gray-800">
                {format(new Date(bill.createdAt), 'MM-dd HH:mm')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
