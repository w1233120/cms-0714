import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { PublishStatusService } from './publish-status.service';
import { PublishStatus, PublishStatusRequest } from './publish-status.model';

describe('PublishStatusService', () => {
  let service: PublishStatusService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/publishstatuses`;

  const status: PublishStatus = {
    pkid: 1,
    description: '草稿',
    isDraft: true,
    isPublished: false,
    isDiscontinued: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(PublishStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([status]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([status]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = { keyword: '草稿', isDraft: true, isPublished: null, isDiscontinued: null };
    service.query(query).subscribe((result) => expect(result).toEqual([status]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([status]);
  });

  it('getById issues GET to the pkid URL', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(status));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(status);
  });

  it('create issues POST to the collection URL', () => {
    const request: PublishStatusRequest = {
      pkid: 3,
      description: '已下架',
      isDraft: false,
      isPublished: false,
      isDiscontinued: true
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...request });
  });

  it('update issues PUT to the collection URL with pkid in the body', () => {
    const request: PublishStatusRequest = {
      pkid: 1,
      description: '草稿（修訂）',
      isDraft: true,
      isPublished: false,
      isDiscontinued: false
    };

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
