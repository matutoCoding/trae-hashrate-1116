import type { TimeSlot, BillingSegment, BillingCalculationResult } from '../types';
import { defaultTimeSlots } from '../data/mockData';

export class PricingService {
  private timeSlots: TimeSlot[];

  constructor(timeSlots?: TimeSlot[]) {
    this.timeSlots = timeSlots || [...defaultTimeSlots];
  }

  getTimeSlots(): TimeSlot[] {
    return this.timeSlots;
  }

  updateTimeSlots(timeSlots: TimeSlot[]): void {
    this.timeSlots = timeSlots;
  }

  getRateByTime(datetime: Date): TimeSlot | null {
    const hours = datetime.getHours();
    const minutes = datetime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    for (const slot of this.timeSlots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;
      
      if (slot.endTime === '24:00') {
        endMinutes = 24 * 60;
      }

      if (totalMinutes >= startMinutes && totalMinutes < endMinutes) {
        return slot;
      }
    }

    return null;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTimeStr(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  splitTimeBySlots(startTime: Date, endTime: Date): BillingSegment[] {
    const segments: BillingSegment[] = [];
    
    if (endTime <= startTime) {
      return segments;
    }

    const sortedSlots = [...this.timeSlots].sort((a, b) => 
      this.parseTimeToMinutes(a.startTime) - this.parseTimeToMinutes(b.startTime)
    );

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const currentSlot = this.getRateByTime(currentTime);
      
      if (!currentSlot) {
        const nextMinute = new Date(currentTime);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        currentTime = nextMinute;
        continue;
      }

      const currentDayMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const slotEndMinutes = this.parseTimeToMinutes(currentSlot.endTime);
      
      let segmentEndTime: Date;
      
      if (currentSlot.endTime === '24:00') {
        const nextDay = new Date(currentTime);
        nextDay.setHours(24, 0, 0, 0);
        segmentEndTime = nextDay;
      } else {
        const slotEndDate = new Date(currentTime);
        slotEndDate.setHours(
          Math.floor(slotEndMinutes / 60),
          slotEndMinutes % 60,
          0,
          0
        );
        
        if (slotEndDate <= currentTime) {
          slotEndDate.setDate(slotEndDate.getDate() + 1);
        }
        segmentEndTime = slotEndDate;
      }

      const actualEndTime = new Date(Math.min(segmentEndTime.getTime(), endTime.getTime()));
      const durationMs = actualEndTime.getTime() - currentTime.getTime();
      const durationMinutes = Math.ceil(durationMs / (1000 * 60));
      
      if (durationMinutes > 0) {
        const amount = this.calculateSegmentAmount(durationMinutes, currentSlot.pricePerMinute);
        
        segments.push({
          timeSlot: currentSlot,
          startTime: new Date(currentTime),
          endTime: new Date(actualEndTime),
          durationMinutes,
          amount
        });
      }

      currentTime = new Date(actualEndTime);
    }

    return segments;
  }

  calculateSegmentAmount(durationMinutes: number, pricePerMinute: number): number {
    return Math.round(durationMinutes * pricePerMinute * 100) / 100;
  }

  calculateSegments(startTime: Date, endTime: Date): BillingCalculationResult {
    const segments = this.splitTimeBySlots(startTime, endTime);
    
    const totalDurationMinutes = segments.reduce(
      (sum, seg) => sum + seg.durationMinutes,
      0
    );
    
    const totalAmount = segments.reduce(
      (sum, seg) => Math.round((sum + seg.amount) * 100) / 100,
      0
    );

    return {
      segments,
      totalDurationMinutes,
      totalAmount
    };
  }

  calculateRealTimeCost(startTime: Date, currentTime: Date): BillingCalculationResult {
    return this.calculateSegments(startTime, currentTime);
  }

  getNextRateChangeTime(fromTime: Date): Date | null {
    const currentSlot = this.getRateByTime(fromTime);
    if (!currentSlot) return null;

    const slotEndMinutes = this.parseTimeToMinutes(currentSlot.endTime);
    const nextChange = new Date(fromTime);
    
    if (currentSlot.endTime === '24:00') {
      nextChange.setHours(24, 0, 0, 0);
    } else {
      nextChange.setHours(
        Math.floor(slotEndMinutes / 60),
        slotEndMinutes % 60,
        0,
        0
      );
      
      if (nextChange <= fromTime) {
        nextChange.setDate(nextChange.getDate() + 1);
      }
    }

    return nextChange;
  }

  validateTimeSlots(): boolean {
    if (this.timeSlots.length === 0) return false;

    const sortedSlots = [...this.timeSlots].sort((a, b) => 
      this.parseTimeToMinutes(a.startTime) - this.parseTimeToMinutes(b.startTime)
    );

    let prevEnd = 0;
    for (const slot of sortedSlots) {
      const start = this.parseTimeToMinutes(slot.startTime);
      const end = slot.endTime === '24:00' ? 1440 : this.parseTimeToMinutes(slot.endTime);
      
      if (start !== prevEnd) return false;
      if (end <= start) return false;
      if (slot.pricePerMinute <= 0) return false;
      
      prevEnd = end;
    }

    return prevEnd === 1440;
  }
}

export const pricingService = new PricingService();
