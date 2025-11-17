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
  refreshToken?: string | null;
  user?: User | null;
}