export interface BookingSlot {
  id: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  notes?: string;
  teacher: string;
  teacherId: number;
  student?: string;
  studentId?: number;
  course?: string;
  courseId?: number;
  createdAt: string;
}

export interface CreateSlotRequest {
  startTime: string;
  endTime: string;
  courseId: number;
}
