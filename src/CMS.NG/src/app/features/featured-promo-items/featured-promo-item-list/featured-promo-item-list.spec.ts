import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { FeaturedPromoItemList } from './featured-promo-item-list';
import { FeaturedPromoItemService } from '../featured-promo-item.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { FeaturedPromoItem } from '../featured-promo-item.model';
import { PromotionLookup, TrainingCenterLookup } from '../../../core/lookups/lookup.model';

describe('FeaturedPromoItemList', () => {
  let component: FeaturedPromoItemList;
  let fixture: ComponentFixture<FeaturedPromoItemList>;
  let serviceSpy: jasmine.SpyObj<FeaturedPromoItemService>;
  let lookupSpy: jasmine.SpyObj<LookupService>;

  const centers: TrainingCenterLookup[] = [
    { pkid: 1, name: '台北' },
    { pkid: 2, name: '新竹' }
  ];

  const promotions: PromotionLookup[] = [
    { pkid: 42, promoCode: '20251204_SkillTrainAI', topic: '成為能AI協作的程式設計師', description: '轉職就業養成班' }
  ];

  const items: FeaturedPromoItem[] = [
    {
      pkid: 10,
      scheduleOn: '2026-03-16',
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 42,
      promoCode: '20251204_SkillTrainAI',
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班'
    },
    {
      pkid: 11,
      scheduleOn: '2026-03-16',
      trainingCenterPkid: 1,
      slot: 2,
      promotionPkid: 43,
      promoCode: '251211_GoogleAI',
      topic: 'Google AI工具一次掌握',
      description: '不需技術基礎'
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    // Seed a deterministic week: 2026-03-18 is a Wednesday → Monday is 2026-03-16.
    sessionStorage.setItem('featured-promo-item-list-week', '2026-03-18T00:00:00');

    serviceSpy = jasmine.createSpyObj('FeaturedPromoItemService', [
      'query',
      'create',
      'update',
      'swapSlots',
      'delete'
    ]);
    serviceSpy.query.and.returnValue(of(items));
    serviceSpy.create.and.returnValue(of(items[0]));
    serviceSpy.update.and.returnValue(of(items[0]));
    serviceSpy.swapSlots.and.returnValue(of(undefined));
    serviceSpy.delete.and.returnValue(of(undefined));

    lookupSpy = jasmine.createSpyObj('LookupService', ['getTrainingCenters', 'getPromotions']);
    lookupSpy.getTrainingCenters.and.returnValue(of(centers));
    lookupSpy.getPromotions.and.returnValue(of(promotions));

    await TestBed.configureTestingModule({
      imports: [FeaturedPromoItemList],
      providers: [
        { provide: FeaturedPromoItemService, useValue: serviceSpy },
        { provide: LookupService, useValue: lookupSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturedPromoItemList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults the active tab to the first training center', () => {
    expect(component.activeTrainingCenterPkid).toBe(1);
  });

  it('queries the selected week (Mon–Sun) and center on init', () => {
    expect(serviceSpy.query).toHaveBeenCalledWith({
      trainingCenterPkid: 1,
      scheduleOnFrom: '2026-03-16',
      scheduleOnTo: '2026-03-22'
    });
    expect(component.weekLabel).toBe('3/16 -- 3/22');
  });

  it('builds a 7-day grid with three slots, placing items in their cell', () => {
    expect(component.rows.length).toBe(7);

    const monday = component.rows[0];
    expect(monday.scheduleOn).toBe('2026-03-16');
    expect(monday.label).toBe('3/16 (一)');
    expect(monday.cells.length).toBe(3);
    expect(monday.cells[0].item?.pkid).toBe(10);
    expect(monday.cells[1].item?.pkid).toBe(11);
    expect(monday.cells[2].item).toBeNull();
  });

  it('switching tab re-queries with the new center', () => {
    component.selectTab(2);

    expect(component.activeTrainingCenterPkid).toBe(2);
    expect(serviceSpy.query).toHaveBeenCalledWith({
      trainingCenterPkid: 2,
      scheduleOnFrom: '2026-03-16',
      scheduleOnTo: '2026-03-22'
    });
  });

  it('next/prev week shifts the window by seven days and re-queries', () => {
    component.nextWeek();
    expect(serviceSpy.query).toHaveBeenCalledWith({
      trainingCenterPkid: 1,
      scheduleOnFrom: '2026-03-23',
      scheduleOnTo: '2026-03-29'
    });

    component.prevWeek(); // back to the original week
    component.prevWeek(); // one week earlier
    expect(serviceSpy.query).toHaveBeenCalledWith({
      trainingCenterPkid: 1,
      scheduleOnFrom: '2026-03-09',
      scheduleOnTo: '2026-03-15'
    });
  });

  it('moveSlot swaps with the occupant of the target slot', () => {
    const monday = component.rows[0];
    component.moveSlot(monday, monday.cells[0].item!, 1); // slot 1 -> 2, occupied by pkid 11

    expect(serviceSpy.swapSlots).toHaveBeenCalledWith({ pkidA: 10, pkidB: 11 });
  });

  it('moveSlot updates the item when the target slot is empty', () => {
    const monday = component.rows[0];
    component.moveSlot(monday, monday.cells[1].item!, 1); // slot 2 -> 3, empty

    expect(serviceSpy.update).toHaveBeenCalled();
    const arg = serviceSpy.update.calls.mostRecent().args[0];
    expect(arg.pkid).toBe(11);
    expect(arg.slot).toBe(3);
  });

  it('moveSlot ignores moves outside slots 1..3', () => {
    const monday = component.rows[0];
    component.moveSlot(monday, monday.cells[0].item!, -1); // slot 1 -> 0

    expect(serviceSpy.swapSlots).not.toHaveBeenCalled();
    expect(serviceSpy.update).not.toHaveBeenCalled();
  });

  it('paste creates a new item from the clipboard at the target cell', () => {
    component.copy(items[0]);
    component.paste('2026-03-17', 1);

    expect(serviceSpy.create).toHaveBeenCalled();
    const arg = serviceSpy.create.calls.mostRecent().args[0];
    expect(arg).toEqual({
      pkid: 0,
      scheduleOn: '2026-03-17',
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 42,
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班'
    });
  });

  it('paste does nothing when the clipboard is empty', () => {
    component.paste('2026-03-17', 1);
    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('deletes an item after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(items[0]);

    expect(serviceSpy.delete).toHaveBeenCalledWith(10);
  });

  it('onSave routes new items to create and existing items to update', () => {
    component.onSave({
      pkid: 0,
      scheduleOn: '2026-03-18',
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 42,
      topic: 't',
      description: 'd'
    });
    expect(serviceSpy.create).toHaveBeenCalled();

    component.onSave({
      pkid: 99,
      scheduleOn: '2026-03-18',
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 42,
      topic: 't',
      description: 'd'
    });
    expect(serviceSpy.update).toHaveBeenCalled();
  });
});
