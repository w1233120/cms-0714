import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { PartnerService } from './partner.service';
import { Partner, PartnerRequest } from './partner.model';

describe('PartnerService', () => {
  let service: PartnerService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/partners`;

  const partner: Partner = {
    pkid: 1,
    name: 'Microsoft',
    appKey: 'MS',
    nameOnPartnerMenu: 'Microsoft 課程',
    nameOnCourseDetailPage: 'Microsoft',
    displayOrder: 1,
    imageFilename: 'ms.png'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(PartnerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([partner]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([partner]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = { keyword: 'Micro' };
    service.query(query).subscribe((result) => expect(result).toEqual([partner]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([partner]);
  });

  it('getById issues GET to the pkid URL', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(partner));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(partner);
  });

  it('create issues POST to the collection URL', () => {
    const request: PartnerRequest = {
      pkid: 0,
      name: 'AWS',
      appKey: 'AWS',
      nameOnPartnerMenu: 'AWS 課程',
      nameOnCourseDetailPage: 'AWS',
      displayOrder: 2,
      imageFilename: null
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...request, pkid: 7 });
  });

  it('update issues PUT to the collection URL with pkid in the body', () => {
    const request: PartnerRequest = { ...partner, name: 'Microsoft（修訂）' };

    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ ...request });
  });

  it('delete issues DELETE to the pkid URL', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
