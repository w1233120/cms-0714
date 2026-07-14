import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { CourseGroupService } from './course-group.service';
import { CourseGroup, CourseGroupRequest } from './course-group.model';

describe('CourseGroupService', () => {
  let service: CourseGroupService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/coursegroups`;

  const courseGroup: CourseGroup = {
    pkid: 1,
    description: '雲端技術'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(CourseGroupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([courseGroup]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([courseGroup]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = { keyword: '雲端' };
    service.query(query).subscribe((result) => expect(result).toEqual([courseGroup]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([courseGroup]);
  });

  it('getById issues GET to the pkid URL', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(courseGroup));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(courseGroup);
  });

  it('create issues POST to the collection URL', () => {
    const request: CourseGroupRequest = {
      pkid: 0,
      description: '資料庫'
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...request, pkid: 7 });
  });

  it('update issues PUT to the collection URL with pkid in the body', () => {
    const request: CourseGroupRequest = { ...courseGroup, description: '雲端技術（修訂）' };

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
