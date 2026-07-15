import { Routes } from '@angular/router';

export const FEATURED_PROMO_ITEM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./featured-promo-item-list/featured-promo-item-list').then((m) => m.FeaturedPromoItemList)
  }
];
