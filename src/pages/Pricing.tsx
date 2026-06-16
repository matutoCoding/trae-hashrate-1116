import { useState } from 'react';
import { Clock, Info, ChevronRight, Edit3, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { pricingService } from '../services/pricing.service';
import type { TimeSlot } from '../types';
import { cn } from '@/lib/utils';

export default function Pricing() {
  const { timeSlots, actions } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editSlots, setEditSlots] = useState<TimeSlot[]>([]);
  const [currentSlot, setCurrentSlot] = useState(pricingService.getRateByTime(new Date()));

  const handleStartEdit = () => {
    setEditSlots(timeSlots.map(slot => ({ ...slot })));
    setIsEditing(true);
  };

  const handleSave = () => {
    const isValid = pricingService.validateTimeSlots();
    if (!isValid) {
      alert('时段配置不完整，请确保覆盖全天24小时且无重叠');
      return;
    }
    actions.updateTimeSlots(editSlots);
    pricingService.updateTimeSlots(editSlots);
    setIsEditing(false);
    setCurrentSlot(pricingService.getRateByTime(new Date()));
  };

  const handleCancel = () => {
    setEditSlots([]);
    setIsEditing(false);
  };

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: string | number) => {
    const newSlots = [...editSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setEditSlots(newSlots);
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      name: '新时段',
      startTime: '00:00',
      endTime: '00:00',
      pricePerMinute: 0.5,
      color: '#60A5FA'
    };
    setEditSlots([...editSlots, newSlot]);
  };

  const removeTimeSlot = (index: number) => {
    if (editSlots.length <= 1) {
      alert('至少保留一个时段');
      return;
    }
    setEditSlots(editSlots.filter((_, i) => i !== index));
  };

  const displaySlots = isEditing ? editSlots : timeSlots;
  const sortedSlots = [...displaySlots].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  );

  const colorOptions = [
    '#60A5FA', '#34D399', '#F97316', '#A78BFA', '#FBBF24', '#F43F5E', '#10B981', '#8B5CF6'
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">费率查询</h1>
            <p className="text-sm text-gray-500 mt-1">查看和管理时段费率配置</p>
          </div>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg
                         hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <Edit3 size={16} />
              编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg
                           hover:bg-gray-200 transition-colors text-sm font-medium text-gray-600"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 rounded-lg
                           hover:bg-primary-600 transition-colors text-sm font-medium text-white"
              >
                <Check size={16} />
                保存
              </button>
            </div>
          )}
        </div>

        {currentSlot && (
          <div 
            className="card mb-6 animate-fade-in-up opacity-0"
            style={{ borderTop: `4px solid ${currentSlot.color}` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${currentSlot.color}20` }}
                >
                  <Clock size={24} style={{ color: currentSlot.color }} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">当前时段</div>
                  <div className="font-semibold text-gray-800">{currentSlot.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">执行费率</div>
                <div className="font-mono text-xl font-bold" style={{ color: currentSlot.color }}>
                  ¥{currentSlot.pricePerMinute.toFixed(2)}
                  <span className="text-sm font-normal text-gray-500">/分钟</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 animate-fade-in-up opacity-0 animate-stagger-1">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-primary-500" />
            <h3 className="font-medium text-gray-800">时段费率表</h3>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            <div className="space-y-4">
              {sortedSlots.map((slot, index) => (
                <div 
                  key={slot.id}
                  className="relative pl-14 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div 
                    className="absolute left-4 top-6 w-4 h-4 rounded-full border-4 border-white shadow-md z-10"
                    style={{ backgroundColor: slot.color }}
                  />
                  
                  <div className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={slot.name}
                            onChange={(e) => handleSlotChange(index, 'name', e.target.value)}
                            className="input-field mb-3"
                            placeholder="时段名称"
                          />
                        ) : (
                          <div className="font-semibold text-gray-800 mb-2">{slot.name}</div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">开始</span>
                            {isEditing ? (
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                                className="input-field w-24 py-1.5 text-sm"
                              />
                            ) : (
                              <span className="font-mono text-gray-800">{slot.startTime}</span>
                            )}
                          </div>
                          <div className="text-gray-400">—</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">结束</span>
                            {isEditing ? (
                              <input
                                type="time"
                                value={slot.endTime === '24:00' ? '23:59' : slot.endTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleSlotChange(index, 'endTime', val === '23:59' ? '24:00' : val);
                                }}
                                className="input-field w-24 py-1.5 text-sm"
                              />
                            ) : (
                              <span className="font-mono text-gray-800">{slot.endTime}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">¥</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={slot.pricePerMinute}
                                onChange={(e) => handleSlotChange(index, 'pricePerMinute', parseFloat(e.target.value) || 0)}
                                className="input-field w-24 py-1.5 text-right font-mono"
                              />
                              <span className="text-sm text-gray-500">/分钟</span>
                            </div>
                            <div className="flex gap-1">
                              {colorOptions.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => handleSlotChange(index, 'color', color)}
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                                    slot.color === color ? 'border-gray-800 scale-110' : 'border-white'
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => removeTimeSlot(index)}
                              className="text-red-500 hover:text-red-600 text-xs mt-1"
                            >
                              删除
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono text-xl font-bold" style={{ color: slot.color }}>
                              ¥{slot.pricePerMinute.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">每分钟</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isEditing && (
              <button
                onClick={addTimeSlot}
                className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-xl
                           text-gray-400 hover:border-primary-300 hover:text-primary-500
                           transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} className="rotate-90" />
                添加时段
              </button>
            )}
          </div>
        </div>

        <div className="card animate-fade-in-up opacity-0 animate-stagger-2">
          <h3 className="font-medium text-gray-800 mb-4">计费规则说明</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">1</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">分时段计费</div>
                <p>洗车费用根据消费时间所属时段的费率计算，不同时段执行不同单价。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">2</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">跨时段分段计算</div>
                <p>如洗车时间跨越多个费率时段，系统自动按各时段实际占用时长分段计算，再合计总费用。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">3</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">额度优先抵扣</div>
                <p>消费时优先使用会员月度免费额度，额度不足部分可使用次卡或自费支付。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">4</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">按月重置额度</div>
                <p>每月1日0点自动重置月度免费额度，上月未用完的额度不累计到下月。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">5</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">不满1分钟按1分钟计算</div>
                <p>计费以分钟为最小单位，不满1分钟的部分按1分钟计算收取。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-5 animate-fade-in-up opacity-0 animate-stagger-3">
          <h4 className="font-medium text-gray-800 mb-2">温馨提示</h4>
          <p className="text-sm text-gray-600">
            高峰时段（17:00-20:00）费率较高，建议尽量选择平峰或低谷时段洗车，可节省费用。
            会员可在「额度管理」页面查看当前剩余免费额度和次卡使用情况。
          </p>
        </div>
      </div>
    </div>
  );
}
