export interface FeaturedPromoItem {
  pkid: number;
  scheduleOn: string; // 'yyyy-MM-dd' (date only, no timezone)
  trainingCenterPkid: number;
  slot: number;
  promotionPkid: number;
  promoCode: string; // joined from Promotion2
  topic: string;
  description: string;
}

export interface FeaturedPromoItemRequest {
  pkid: number;
  scheduleOn: string;
  trainingCenterPkid: number;
  slot: number;
  promotionPkid: number;
  topic: string;
  description: string;
}

export interface FeaturedPromoItemQuery {
  trainingCenterPkid?: number | null;
  scheduleOnFrom?: string | null;
  scheduleOnTo?: string | null;
}

export interface SwapSlotsRequest {
  pkidA: number;
  pkidB: number;
}
