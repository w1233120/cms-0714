export interface AppUserLookup {
  userId: string;
  userName: string;
}

export interface AppRoleLookup {
  roleId: string;
  roleName: string;
}

export interface PublishStatusLookup {
  pkid: number;
  description: string;
}

export interface PartnerLookup {
  pkid: number;
  name: string;
}

export interface CourseGroupLookup {
  pkid: number;
  description: string;
}

export interface TrainingCenterLookup {
  pkid: number;
  name: string;
}

export interface PromotionLookup {
  pkid: number;
  promoCode: string;
  topic: string;
  description: string;
}
