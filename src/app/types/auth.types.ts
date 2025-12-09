export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  isSuccess: boolean;
  message: string;
  token: string | null;
  username?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  refreshToken?: string | null;
  user?: User | null;
  fullName?: string | null;
  jobTitle?: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  age?: string;
  nativeLanguage?: string;
  learningLanguage?: string;
  profileImageUrl?: string;
  jobTitle?: string;
}