export interface Course {
  pkid: number;
  title: string;
  officialTitle?: string | null;
  courseId: string;
  prodCourseId: string;
  friendlyUrl: string;
  displayOrder: number;
  partnerPkid: number;
  courseGroupPkid?: number | null;
  publishStatusPkid: number;
  scheduleOn: string; // 'yyyy-MM-dd'
  scheduleOff: string;
  hour: number;
  listPrice: number;
  learningCredit: number;
  material?: string | null;
  objective?: string | null;
  target?: string | null;
  prerequisites?: string | null;
  outline?: string | null;
  towardCertOrExam?: string | null;
  note?: string | null;
  otherInfo?: string | null;
  canRepeat: boolean;
  // Joined FK labels (read-only).
  partnerName: string;
  courseGroupDescription?: string | null;
  publishStatusDescription: string;
}

export interface CourseRequest {
  pkid: number;
  title: string;
  officialTitle?: string | null;
  courseId: string;
  prodCourseId: string;
  friendlyUrl: string;
  displayOrder: number;
  partnerPkid: number;
  courseGroupPkid?: number | null;
  publishStatusPkid: number;
  scheduleOn: string;
  scheduleOff: string;
  hour: number;
  listPrice: number;
  learningCredit: number;
  material?: string | null;
  objective?: string | null;
  target?: string | null;
  prerequisites?: string | null;
  outline?: string | null;
  towardCertOrExam?: string | null;
  note?: string | null;
  otherInfo?: string | null;
  canRepeat: boolean;
}

export interface CourseQuery {
  keyword?: string | null;
  partnerPkid?: number | null;
  courseGroupPkid?: number | null;
  publishStatusPkid?: number | null;
  scheduleOnFrom?: string | null;
  scheduleOnTo?: string | null;
  scheduleOffFrom?: string | null;
  scheduleOffTo?: string | null;
  canRepeat?: boolean | null;
}
