import { db } from "../db";
import { users, bookings, assignmentLogs, services } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface AssignmentCandidate {
  technicianId: string;
  distanceKm: number;
  workloadScore: number;
  availabilityScore: number;
  skillScore: number;
  performanceScore: number;
  totalScore: number;
  rejectionReason?: string;
}

interface BookingDetails {
  serviceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  customerLatitude: number;
  customerLongitude: number;
}

export class AssignmentService {
  private static readonly WEIGHTS = {
    distance: 0.30,       // 30% - proximity is important
    workload: 0.25,       // 25% - balance workload
    availability: 0.20,   // 20% - ensure availability
    skill: 0.15,          // 15% - service match
    performance: 0.10,    // 10% - past performance
  };

  private static readonly MAX_DISTANCE_KM = 100;
  
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  static async calculateDistanceScore(
    technician: any,
    booking: BookingDetails
  ): Promise<{ score: number; distanceKm: number; reason?: string }> {
    if (!technician.homeLatitude || !technician.homeLongitude) {
      return { score: 50, distanceKm: 0, reason: "No home location set" };
    }
    
    const distance = this.calculateDistance(
      parseFloat(technician.homeLatitude),
      parseFloat(technician.homeLongitude),
      booking.customerLatitude,
      booking.customerLongitude
    );
    
    if (distance > this.MAX_DISTANCE_KM) {
      return { score: 0, distanceKm: distance, reason: `Distance ${distance.toFixed(1)}km exceeds max ${this.MAX_DISTANCE_KM}km` };
    }
    
    const serviceRadius = technician.serviceRadius || 50;
    if (distance > serviceRadius) {
      return { score: 20, distanceKm: distance, reason: `Distance ${distance.toFixed(1)}km exceeds service radius ${serviceRadius}km` };
    }
    
    const score = Math.max(0, 100 - (distance / serviceRadius) * 100);
    return { score, distanceKm: distance };
  }
  
  static async calculateWorkloadScore(technicianId: string, scheduledDate: Date): Promise<number> {
    const startOfDay = new Date(scheduledDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.technicianId, technicianId),
        sql`${bookings.scheduledDate} >= ${startOfDay}`,
        sql`${bookings.scheduledDate} <= ${endOfDay}`,
        sql`${bookings.status} IN ('pending', 'confirmed', 'technician_assigned', 'en_route', 'in_progress')`
      ),
    });
    
    const technician = await db.query.users.findFirst({
      where: eq(users.id, technicianId),
    });
    
    const maxDaily = technician?.maxDailyBookings || 8;
    const currentLoad = todayBookings.length;
    
    if (currentLoad >= maxDaily) {
      return 0;
    }
    
    const utilizationRate = currentLoad / maxDaily;
    return Math.max(0, 100 - (utilizationRate * 100));
  }
  
  static async calculateAvailabilityScore(
    technician: any,
    scheduledDate: Date,
    scheduledTime: string
  ): Promise<{ score: number; reason?: string }> {
    if (technician.availabilityStatus === 'off_duty') {
      return { score: 0, reason: "Technician is off duty" };
    }
    
    if (technician.availabilityStatus === 'suspended') {
      return { score: 0, reason: "Technician is suspended" };
    }
    
    const dayOfWeek = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (technician.daysOff && Array.isArray(technician.daysOff)) {
      const dateString = scheduledDate.toISOString().split('T')[0];
      if (technician.daysOff.includes(dateString)) {
        return { score: 0, reason: `Scheduled day ${dateString} is a day off` };
      }
    }
    
    if (technician.workingHours && technician.workingHours[dayOfWeek]) {
      const daySchedule = technician.workingHours[dayOfWeek];
      if (!daySchedule.enabled) {
        return { score: 0, reason: `Not working on ${dayOfWeek}` };
      }
      
      const [schedHour, schedMinute] = scheduledTime.split(':').map(Number);
      const schedMinutes = schedHour * 60 + schedMinute;
      
      const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      
      const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;
      
      if (schedMinutes < startMinutes || schedMinutes > endMinutes) {
        return { 
          score: 20, 
          reason: `Time ${scheduledTime} outside working hours ${daySchedule.start}-${daySchedule.end}` 
        };
      }
    }
    
    if (technician.availabilityStatus === 'busy') {
      return { score: 50, reason: "Technician is currently busy" };
    }
    
    if (technician.availabilityStatus === 'on_job') {
      return { score: 30, reason: "Technician is on another job" };
    }
    
    return { score: 100 };
  }
  
  static async calculateSkillScore(
    technician: any,
    serviceId: string
  ): Promise<{ score: number; reason?: string }> {
    // Get the service to find its category
    const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
    });
    
    if (!service) {
      return { score: 60 }; // Default score if service not found
    }
    
    const categoryId = service.categoryId;
    
    // Check if technician has specializations for this service category
    const hasSpecializations = technician.specializations && Array.isArray(technician.specializations);
    
    if (!hasSpecializations || technician.specializations.length === 0) {
      // No specializations set - available for all services (generalist)
      return { score: 60 };
    }
    
    // Check if the technician's specializations include this service category
    const isSpecialized = technician.specializations.includes(categoryId);
    
    if (!isSpecialized) {
      // Technician is specialized but NOT in this category - HARD REJECT
      return { 
        score: 0, 
        reason: `Not qualified: specialized in other categories (required: ${categoryId})` 
      };
    }
    
    // Technician is specialized in this category
    // Give extra points if they have relevant certifications
    const hasCertifications = technician.certifications && Array.isArray(technician.certifications) && technician.certifications.length > 0;
    
    return { score: hasCertifications ? 100 : 85 }; // 100 if certified specialist, 85 if specialist without certs
  }
  
  static async calculatePerformanceScore(technicianId: string): Promise<number> {
    const bookingsWithReviews = await db.query.bookings.findMany({
      where: and(
        eq(bookings.technicianId, technicianId),
        eq(bookings.status, 'completed')
      ),
      with: {
        reviews: true,
      },
      limit: 50,
    });
    
    const reviewsList = bookingsWithReviews.filter(b => (b.reviews as any)?.technicianRating);
    
    if (reviewsList.length === 0) {
      return 70;
    }
    
    const avgRating = reviewsList.reduce((sum, b) => {
      return sum + ((b.reviews as any)?.technicianRating || 0);
    }, 0) / reviewsList.length;
    
    return (avgRating / 5) * 100;
  }
  
  static async findBestTechnician(
    booking: BookingDetails,
    bookingId: string
  ): Promise<{ technicianId: string | null; assignmentLog: any }> {
    const availableTechnicians = await db.query.users.findMany({
      where: and(
        eq(users.role, 'technician'),
        eq(users.status, 'active')
      ),
    });
    
    if (availableTechnicians.length === 0) {
      return {
        technicianId: null,
        assignmentLog: null,
      };
    }
    
    const candidates: AssignmentCandidate[] = [];
    
    for (const technician of availableTechnicians) {
      const distanceResult = await this.calculateDistanceScore(technician, booking);
      const workloadScore = await this.calculateWorkloadScore(technician.id, booking.scheduledDate);
      const availabilityResult = await this.calculateAvailabilityScore(
        technician,
        booking.scheduledDate,
        booking.scheduledTime
      );
      const skillResult = await this.calculateSkillScore(technician, booking.serviceId);
      const performanceScore = await this.calculatePerformanceScore(technician.id);
      
      const totalScore = 
        (distanceResult.score * this.WEIGHTS.distance) +
        (workloadScore * this.WEIGHTS.workload) +
        (availabilityResult.score * this.WEIGHTS.availability) +
        (skillResult.score * this.WEIGHTS.skill) +
        (performanceScore * this.WEIGHTS.performance);
      
      // Collect rejection reasons from all dimensions
      let rejectionReason: string | undefined;
      const reasons = [
        distanceResult.reason,
        availabilityResult.reason,
        skillResult.reason, // Include skill rejection (most important!)
      ].filter(Boolean);
      
      if (reasons.length > 0 || totalScore < 30) {
        rejectionReason = reasons.length > 0 
          ? reasons.join('; ') 
          : 'Low total score';
      }
      
      candidates.push({
        technicianId: technician.id,
        distanceKm: distanceResult.distanceKm,
        workloadScore: Math.round(workloadScore),
        availabilityScore: Math.round(availabilityResult.score),
        skillScore: Math.round(skillResult.score),
        performanceScore: Math.round(performanceScore),
        totalScore: Math.round(totalScore),
        rejectionReason,
      });
    }
    
    candidates.sort((a, b) => b.totalScore - a.totalScore);
    
    const bestCandidate = candidates.find(c => !c.rejectionReason);
    
    const selectedCandidate = bestCandidate || candidates[0];
    
    if (selectedCandidate) {
      const [logResult] = await db.insert(assignmentLogs).values({
        bookingId,
        technicianId: selectedCandidate.technicianId,
        assignmentMethod: 'auto',
        distanceKm: selectedCandidate.distanceKm.toString(),
        workloadScore: selectedCandidate.workloadScore,
        availabilityScore: selectedCandidate.availabilityScore,
        skillScore: selectedCandidate.skillScore,
        performanceScore: selectedCandidate.performanceScore,
        totalScore: selectedCandidate.totalScore,
        rejectionReason: selectedCandidate.rejectionReason,
      }).returning();
      
      return {
        technicianId: bestCandidate ? selectedCandidate.technicianId : null,
        assignmentLog: logResult,
      };
    }
    
    return {
      technicianId: null,
      assignmentLog: null,
    };
  }
  
  static async logManualAssignment(
    bookingId: string,
    technicianId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<void> {
    await db.insert(assignmentLogs).values({
      bookingId,
      technicianId,
      assignmentMethod: 'manual',
      adminNotes,
      assignedBy: adminId,
    });
  }
}

export const assignmentService = new AssignmentService();
