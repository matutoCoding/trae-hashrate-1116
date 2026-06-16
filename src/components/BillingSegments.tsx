import { format } from 'date-fns';
import type { BillingSegment } from '../types';
import { cn } from '@/lib/utils';

interface BillingSegmentsProps {
  segments: BillingSegment[];
  showHeader?: boolean;
}

export default function BillingSegments({ segments, showHeader = true }: BillingSegmentsProps) {
  if (segments.length === 0) return null;

  const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalAmount = segments.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>时段</span>
          <div className="flex gap-8">
            <span className="w-16 text-right">时长</span>
            <span className="w-16 text-right">单价</span>
            <span className="w-20 text-right">金额</span>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.timeSlot.color }}
              />
              <div>
                <div className="font-medium text-gray-800">
                  {segment.timeSlot.name}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(segment.startTime), 'HH:mm')} - {format(new Date(segment.endTime), 'HH:mm')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 font-mono text-sm">
              <span className="w-16 text-right text-gray-600">
                {segment.durationMinutes}分钟
              </span>
              <span className="w-16 text-right text-gray-600">
                ¥{segment.timeSlot.pricePerMinute.toFixed(2)}
              </span>
              <span className="w-20 text-right font-medium text-gray-800">
                ¥{segment.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-gray-600">合计</span>
        <div className="flex items-center gap-8 font-mono">
          <span className="w-16 text-right font-medium text-gray-800">
            {totalDuration}分钟
          </span>
          <span className="w-16 text-right" />
          <span className={cn(
            'w-20 text-right font-bold text-lg',
            totalAmount > 0 ? 'text-accent-500' : 'text-gray-800'
          )}>
            ¥{totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
