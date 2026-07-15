import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturedPromoItemForm } from './featured-promo-item-form';
import { PromotionLookup } from '../../../core/lookups/lookup.model';
import { FeaturedPromoItem, FeaturedPromoItemRequest } from '../featured-promo-item.model';

describe('FeaturedPromoItemForm', () => {
  let component: FeaturedPromoItemForm;
  let fixture: ComponentFixture<FeaturedPromoItemForm>;

  const promotions: PromotionLookup[] = [
    { pkid: 42, promoCode: '20251204_SkillTrainAI', topic: '成為能AI協作的程式設計師', description: '轉職就業養成班' },
    { pkid: 43, promoCode: '251211_GoogleAI', topic: 'Google AI工具一次掌握', description: '不需技術基礎' }
  ];

  const existing: FeaturedPromoItem = {
    pkid: 5,
    scheduleOn: '2026-03-16',
    trainingCenterPkid: 1,
    slot: 1,
    promotionPkid: 42,
    promoCode: '20251204_SkillTrainAI',
    topic: '成為能AI協作的程式設計師',
    description: '轉職就業養成班'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedPromoItemForm]
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturedPromoItemForm);
    component = fixture.componentInstance;
    component.promotions = promotions;
    component.scheduleOn = '2026-03-16';
    component.trainingCenterPkid = 1;
    component.slot = 2;
  });

  it('new mode starts empty and invalid', () => {
    component.item = null;
    fixture.detectChanges();

    expect(component.form.getRawValue().promotionPkid).toBe(0);
    expect(component.form.invalid).toBeTrue();
  });

  it('edit mode patches the form and seeds the autocomplete', () => {
    component.item = existing;
    component.slot = existing.slot;
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({
      promoCode: '20251204_SkillTrainAI',
      promotionPkid: 42,
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班'
    });
    expect(component.selectedPromo).toBe('20251204_SkillTrainAI');
    expect(component.form.valid).toBeTrue();
  });

  it('filterPromotions matches on PromoCode, case-insensitively', () => {
    fixture.detectChanges();

    component.filterPromotions({ query: 'google' } as any);

    expect(component.filteredPromotions).toEqual([promotions[1]]);
  });

  it('selecting a PromoCode resolves Promotion_pkid and pre-fills topic/description', () => {
    component.item = null;
    fixture.detectChanges();

    component.onPromotionSelect(promotions[1]);

    expect(component.form.getRawValue()).toEqual({
      promoCode: '251211_GoogleAI',
      promotionPkid: 43,
      topic: 'Google AI工具一次掌握',
      description: '不需技術基礎'
    });
    expect(component.selectedPromo).toBe(promotions[1]);
  });

  it('submit on a new item emits a create payload (pkid 0) with row context', () => {
    let emitted: FeaturedPromoItemRequest | undefined;
    component.item = null;
    fixture.detectChanges();
    component.save.subscribe((r) => (emitted = r));

    component.onPromotionSelect(promotions[0]);
    component.submit();

    expect(emitted).toEqual({
      pkid: 0,
      scheduleOn: '2026-03-16',
      trainingCenterPkid: 1,
      slot: 2,
      promotionPkid: 42,
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班'
    });
  });

  it('submit on an existing item emits an update payload carrying its pkid', () => {
    let emitted: FeaturedPromoItemRequest | undefined;
    component.item = existing;
    component.slot = existing.slot;
    fixture.detectChanges();
    component.save.subscribe((r) => (emitted = r));

    component.form.patchValue({ description: '轉職就業養成班（修訂）' });
    component.submit();

    expect(emitted?.pkid).toBe(5);
    expect(emitted?.promotionPkid).toBe(42);
    expect(emitted?.description).toBe('轉職就業養成班（修訂）');
  });

  it('an invalid form does not emit save', () => {
    let emitted = false;
    component.item = null;
    fixture.detectChanges();
    component.save.subscribe(() => (emitted = true));

    component.submit();

    expect(emitted).toBeFalse();
  });

  it('cancel emits cancelForm', () => {
    let cancelled = false;
    fixture.detectChanges();
    component.cancelForm.subscribe(() => (cancelled = true));

    component.cancel();

    expect(cancelled).toBeTrue();
  });
});
