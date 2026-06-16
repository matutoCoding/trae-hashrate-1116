import { PricingService } from '../src/services/pricing.service';
import type { TimeSlot } from '../src/types';

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

    it('should return correct rate at boundary time', () => {
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
  });

  describe('calculateSegments - single time slot', () => {
    it('should calculate correctly for single slot duration', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + 30);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.segments.length).toBe(1);
      expect(result.totalDurationMinutes).toBe(30);
      expect(result.totalAmount).toBe(30 * 0.50);
      expect(result.segments[0].timeSlot.name).toBe('平峰时段');
    });

    it('should ceil duration to next minute', () => {
      const startTime = new Date();
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setSeconds(endTime.getSeconds() + 61);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.totalDurationMinutes).toBe(2);
      expect(result.totalAmount).toBe(2 * 0.50);
    });
  });

  describe('calculateSegments - cross time slots', () => {
    it('should split correctly across two slots', () => {
      const startTime = new Date();
      startTime.setHours(16, 30, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.segments.length).toBe(2);
      expect(result.totalDurationMinutes).toBe(60);
      
      expect(result.segments[0].timeSlot.name).toBe('平峰时段');
      expect(result.segments[0].durationMinutes).toBe(30);
      expect(result.segments[0].amount).toBe(30 * 0.50);
      
      expect(result.segments[1].timeSlot.name).toBe('高峰时段');
      expect(result.segments[1].durationMinutes).toBe(30);
      expect(result.segments[1].amount).toBe(30 * 0.80);
      
      expect(result.totalAmount).toBe(30 * 0.50 + 30 * 0.80);
    });

    it('should split correctly across three slots', () => {
      const startTime = new Date();
      startTime.setHours(16, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 180);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.segments.length).toBe(3);
      expect(result.totalDurationMinutes).toBe(180);
      
      expect(result.segments[0].timeSlot.name).toBe('平峰时段');
      expect(result.segments[0].durationMinutes).toBe(60);
      
      expect(result.segments[1].timeSlot.name).toBe('高峰时段');
      expect(result.segments[1].durationMinutes).toBe(180);
      
      expect(result.segments[2].timeSlot.name).toBe('夜间平峰');
      expect(result.segments[2].durationMinutes).toBe(60);
      
      const expectedAmount = 60 * 0.50 + 180 * 0.80 + 60 * 0.40;
      expect(result.totalAmount).toBeCloseTo(expectedAmount, 2);
    });

    it('should handle crossing midnight', () => {
      const startTime = new Date();
      startTime.setHours(23, 30, 0, 0);
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(0, 30, 0, 0);

      const result = service.calculateSegments(startTime, endTime);
      
      expect(result.segments.length).toBe(2);
      expect(result.totalDurationMinutes).toBe(60);
      
      expect(result.segments[0].timeSlot.name).toBe('夜间平峰');
      expect(result.segments[0].durationMinutes).toBe(30);
      
      expect(result.segments[1].timeSlot.name).toBe('低谷时段');
      expect(result.segments[1].durationMinutes).toBe(30);
      
      expect(result.totalAmount).toBe(30 * 0.40 + 30 * 0.30);
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
  });

  describe('getNextRateChangeTime', () => {
    it('should return correct next change time', () => {
      const now = new Date();
      now.setHours(15, 0, 0, 0);
      const nextChange = service.getNextRateChangeTime(now);
      
      expect(nextChange).not.toBeNull();
      expect(nextChange?.getHours()).toBe(17);
      expect(nextChange?.getMinutes()).toBe(0);
    });
  });
});
