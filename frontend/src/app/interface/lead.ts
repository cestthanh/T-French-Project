/** Where an enquiry has got to in the centre's follow-up. Mirrors LeadStatus
 * on the API, which serialises the enum by name. */
export type LeadStatus = 'New' | 'Contacted' | 'Enrolled' | 'Closed';

export interface ContactLead {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  message: string;
  interest?: string;
  status: LeadStatus;
  note?: string;
  createdAt: string;
  handledAt?: string;
  handledBy?: string;
  studentId?: number;
  enrollmentId?: number;
}

export interface ConvertLeadResult {
  id: number;
  status: LeadStatus;
  studentId: number;
  enrollmentId: number;
  createdAccount: boolean;
  temporaryPassword?: string;
}

/** What the public contact form sends. No auth, no account required. */
export interface CreateLeadRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  message: string;
  interest?: string;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  enrolled: number;
  closed: number;
}
