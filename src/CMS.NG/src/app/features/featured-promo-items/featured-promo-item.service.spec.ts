import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { FeaturedPromoItemService } from './featured-promo-item.service';
import { FeaturedPromoItem, FeaturedPromoItemRequest } from './featured-promo-item.model';

describe('FeaturedPromoItemService', () => {
  let service: FeaturedPromoItemService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/featuredpromoitems`;

  const item: FeaturedPromoItem = {
    pkid: 1,
    scheduleOn: '2026-03-16',
    trainingCenterPkid: 1,
    slot: 1,
    promotionPkid: 42,
    promoCode: '20251204_SkillTrainAI',
    topic: '成為能AI協作的程式設計師',
    description: '轉職就業養成班'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(FeaturedPromoItemService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([item]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([item]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = {
      trainingCenterPkid: 1,
      scheduleOnFrom: '2026-03-16',
      scheduleOnTo: '2026-03-22'
    };
    service.query(query).subscribe((result) => expect(result).toEqual([item]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([item]);
  });

  it('getById issues GET to the pkid URL', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(item));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(item);
  });

  it('create issues POST to the collection URL', () => {
    const request: FeaturedPromoItemRequest = {
      pkid: 0,
      scheduleOn: '2026-03-16',
      trainingCenterPkid: 1,
      slot: 2,
      promotionPkid: 43,
      topic: 'Google AI工具一次掌握',
      description: '不需技術基礎'
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...request, pkid: 7 });
  });

  it('update issues PUT to the collection URL with pkid in the body', () => {
    const request: FeaturedPromoItemRequest = {
      pkid: 1,
      scheduleOn: '2026-03-16',
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 42,
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班'
    };

    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(item);
  });

  it('swapSlots issues POST to /swap with both pkids', () => {
    service.swapSlots({ pkidA: 1, pkidB: 2 }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/swap`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pkidA: 1, pkidB: 2 });
    req.flush(null);
  });

  it('delete issues DELETE to the pkid URL', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
