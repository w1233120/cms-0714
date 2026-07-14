export interface AppUser {
  pkid: number;
  userId: string;
  userName: string;
  isActive: boolean;
  passwordUpdatedTime?: string | null;
  roleCount: number;
  roleIds: string[];
}

export interface AppUserRequest {
  userId: string;
  userName: string;
  isActive: boolean;
  roleIds: string[];
}

export interface AppUserQuery {
  keyword?: string | null;
  isActive?: boolean | null;
  passwordUpdatedFrom?: string | null;
  passwordUpdatedTo?: string | null;
}
