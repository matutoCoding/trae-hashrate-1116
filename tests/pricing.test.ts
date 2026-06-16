import { PricingService } from '../src/services/pricing.service';
import type { TimeSlot, BillingSegment } from '../src/types';

const testTimeSlots: TimeSlot[] = [
  { id: '1', name: '低谷时段', startTime: '00:00', endTime: '07:00', pricePerMinute: 0.30, color: '#60A5FA' },
  { id: '2', name: '平峰时段', startTime: '07:00', endTime: '17:00', pricePerMinute: 0.50, color: '#34D399' },
  { id: '3', name: '高峰时段', startTime: '17:00', endTime: '20:00', pricePerMinute: 0.80, color: '#F97316' },
  { id: '4', name: '夜间平峰', startTime: '20:00', endTime: '24:00', pricePerMinute: 0.40, color: '#A78BFA' },
];

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService(testTimeSlots);
  });

  describe('getRateByTime', () => {
    it('should return correct rate for peak hour', () => {
      const peakTime = new Date();
      peakTime.setHours(18, 30, 0, 0);
      const rate = service.getRateByTime(peakTime);
      expect(rate).not.toBeNull();
      expect(rate?.name).toBe('高峰时段');
      expect(rate?.pricePerMinute).toBe(0.80);
    });

    it('should return correct rate for off-peak hour', () => {
      const offPeakTime = new Date();
      offPeakTime.setHours(10, 30, 0, 0);
      const rate = service.getRateByTime(offPeakTime);
      expect(rate).not.toBeNull();
      expect(rate?.name).toBe('平峰时段');
      expect(rate?.pricePerMinute).toBe(0.50);
    });

    it('should return correct rate for low hour', () => {
      const lowTime = new Date();
      lowTime.setHours(3, 0, 0, 0);
      const rate = service.getRateByTime(lowTime);
      expect(rate).not.toBeNull();
      expect(rate?.name).toBe('低谷时段');
      expect(rate?.pricePerMinute).toBe(0.30);
    });

    it('should return correct rate at boundary time (inclusive start)', () => {
      const boundaryTime = new Date();
      boundaryTime.setHours(17, 0, 0, 0);
      const rate = service.getRateByTime(boundaryTime);
      expect(rate?.name).toBe('高峰时段');
    });

    it('should return correct rate just before boundary', () => {
      const justBefore = new Date();
      justBefore.setHours(16, 59, 0, 0);
      const rate = service.getRateByTime(justBefore);
      expect(rate?.name).toBe('平峰时段');
    });

    it('should return night peak at 23:59', () => {
      const nightTime = new Date();
      nightTime.setHours(23, 59, 0, 0);
      const rate = service.getRateByTime(nightTime);
      expect(rate?.name).toBe('夜间平峰');
    });

    it('should return low hour at exactly 00:00', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const rate = service.getRateByTime(midnight);
      expect(rate?.name).toBe('低谷时段');
    });
  });

  describe('splitTimeBySlots - single time slot', () => {
    it('should calculate correctly for single slot duration', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + 30);

      const segments = service.splitTimeBySlots(startTime, endTime);
      
      expect(segments.length).toBe(1);
      expect(segments[0].durationMinutes).toBe(30);
      expect(segments[0].amount).toBe(30 * 0.50);
      expect(segments[0].timeSlot.name).toBe('平峰时段');
    });

    it('should ceil duration to next minute', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setSeconds(endTime.getSeconds() + 61);

      const segments = service.splitTimeBySlots(startTime, endTime);
      const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
      
      expect(totalDuration).toBe(2);
    });

    it('should return empty array when end <= start', () => {
      const startTime = new Date();
      const endTime = new Date(startTime);
      const segments = service.splitTimeBySlots(startTime, endTime);
      expect(segments.length).toBe(0);
    });
  });

  describe('splitTimeBySlots - cross time slots', () => {
    it('should split correctly across two slots', () => {
      const startTime = new Date();
      startTime.setHours(16, 30, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60);

      const segments = service.splitTimeBySlots(startTime, endTime);
      const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
      
      expect(segments.length).toBe(2);
      expect(totalDuration).toBe(60);
      
      expect(segments[0].timeSlot.name).toBe('平峰时段');
      expect(segments[0].durationMinutes).toBe(30);
      expect(segments[0].amount).toBe(30 * 0.50);
      
      expect(segments[1].timeSlot.name).toBe('高峰时段');
      expect(segments[1].durationMinutes).toBe(30);
      expect(segments[1].amount).toBe(30 * 0.80);
    });

    it('should split correctly across three slots', () => {
      const startTime = new Date();
      startTime.setHours(16, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 300);

      const segments = service.splitTimeBySlots(startTime, endTime);
      const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalAmount = segments.reduce((sum, s) => sum + s.amount, 0);
      
      expect(segments.length).toBe(3);
      expect(totalDuration).toBe(300);
      
      expect(segments[0].timeSlot.name).toBe('平峰时段');
      expect(segments[0].durationMinutes).toBe(60);
      
      expect(segments[1].timeSlot.name).toBe('高峰时段');
      expect(segments[1].durationMinutes).toBe(180);
      
      expect(segments[2].timeSlot.name).toBe('夜间平峰');
      expect(segments[2].durationMinutes).toBe(60);
      
      const expectedAmount = 60 * 0.50 + 180 * 0.80 + 60 * 0.40;
      expect(totalAmount).toBeCloseTo(expectedAmount, 2);
    });

    it('should handle crossing midnight correctly', () => {
      const startTime = new Date();
      startTime.setHours(23, 30, 0, 0);
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(0, 30, 0, 0);

      const segments = service.splitTimeBySlots(startTime, endTime);
      const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalAmount = segments.reduce((sum, s) => sum + s.amount, 0);
      
      expect(segments.length).toBe(2);
      expect(totalDuration).toBe(60);
      
      expect(segments[0].timeSlot.name).toBe('夜间平峰');
      expect(segments[0].durationMinutes).toBe(30);
      
      expect(segments[1].timeSlot.name).toBe('低谷时段');
      expect(segments[1].durationMinutes).toBe(30);
      
      expect(totalAmount).toBe(30 * 0.40 + 30 * 0.30);
    });

    it('should handle crossing from night to low correctly (23:40 to 00:20)', () => {
      const startTime = new Date(2026, 5, 17, 23, 40, 0, 0);
      const endTime = new Date(2026, 5, 18, 0, 20, 0, 0);

      const segments = service.splitTimeBySlots(startTime, endTime);
      const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalAmount = segments.reduce((sum, s) => sum + s.amount, 0);
      
      expect(segments.length).toBe(2);
      expect(totalDuration).toBe(40);
      
      expect(segments[0].timeSlot.name).toBe('夜间平峰');
      expect(segments[0].durationMinutes).toBe(20);
      
      expect(segments[1].timeSlot.name).toBe('低谷时段');
      expect(segments[1].durationMinutes).toBe(20);
      
      expect(totalAmount).toBeCloseTo(20 * 0.40 + 20 * 0.30, 2);
    });
  });

  describe('calculateSegments', () => {
    it('should return correct total', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + 30);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.totalDurationMinutes).toBe(30);
      expect(result.totalAmount).toBe(30 * 0.50);
    });

    it('should calculate correctly cross-slot totals', () => {
      const startTime = new Date(2026, 5, 17, 23, 40, 0, 0);
      const endTime = new Date(2026, 5, 18, 0, 20, 0, 0);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.totalDurationMinutes).toBe(40);
      expect(result.totalAmount).toBeCloseTo(20 * 0.40 + 20 * 0.30, 2);
    });
  });

  describe('validateTimeSlots', () => {
    it('should return true for valid slots', () => {
      expect(service.validateTimeSlots()).toBe(true);
    });

    it('should return false for overlapping slots', () => {
      const invalidSlots: TimeSlot[] = [
        { id: '1', name: 'Slot 1', startTime: '00:00', endTime: '12:00', pricePerMinute: 0.5, color: '#000' },
        { id: '2', name: 'Slot 2', startTime: '11:00', endTime: '24:00', pricePerMinute: 0.5, color: '#000' },
      ];
      const invalidService = new PricingService(invalidSlots);
      expect(invalidService.validateTimeSlots()).toBe(false);
    });

    it('should return false for gaps in slots', () => {
      const invalidSlots: TimeSlot[] = [
        { id: '1', name: 'Slot 1', startTime: '00:00', endTime: '12:00', pricePerMinute: 0.5, color: '#000' },
        { id: '2', name: 'Slot 2', startTime: '13:00', endTime: '24:00', pricePerMinute: 0.5, color: '#000' },
      ];
      const invalidService = new PricingService(invalidSlots);
      expect(invalidService.validateTimeSlots()).toBe(false);
    });

    it('should return false for negative price', () => {
      const invalidSlots: TimeSlot[] = [
        { id: '1', name: 'Slot 1', startTime: '00:00', endTime: '24:00', pricePerMinute: -0.5, color: '#000' },
      ];
      const invalidService = new PricingService(invalidSlots);
      expect(invalidService.validateTimeSlots()).toBe(false);
    });

    it('should return false for empty slots', () => {
      const invalidService = new PricingService([]);
      expect(invalidService.validateTimeSlots()).toBe(false);
    });
  });

  describe('getNextRateChangeTime', () => {
    it('should return correct next change time in the same day', () => {
      const now = new Date();
      now.setHours(15, 0, 0, 0);
      const nextChange = service.getNextRateChangeTime(now);
      
      expect(nextChange).not.toBeNull();
      expect(nextChange?.getHours()).toBe(17);
      expect(nextChange?.getMinutes()).toBe(0);
    });

    it('should return next day change when after last slot', () => {
      const now = new Date(2026, 5, 17, 21, 0, 0, 0);
      const nextChange = service.getNextRateChangeTime(now);
      
      expect(nextChange).not.toBeNull();
      expect(nextChange?.getDate()).toBe(18);
      expect(nextChange?.getHours()).toBe(0);
      expect(nextChange?.getMinutes()).toBe(0);
    });
  });
});
