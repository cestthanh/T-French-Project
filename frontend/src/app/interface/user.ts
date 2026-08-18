import { UserRole } from 'src/app/constants/enum';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: keyof typeof UserRole;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}
