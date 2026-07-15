import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { CourseService } from './course.service';
import { Course, CourseRequest } from './course.model';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/courses`;

  const course: Course = {
    pkid: 123,
    title: 'AI 協作開發實戰',
    officialTitle: null,
    courseId: 'AI-101',
    prodCourseId: 'AI-101-P',
    friendlyUrl: 'ai-101',
    displayOrder: 1,
    partnerPkid: 1,
    courseGroupPkid: 2,
    publishStatusPkid: 2,
    scheduleOn: '2026-03-16',
    scheduleOff: '2026-12-31',
    hour: 24,
    listPrice: 12000,
    learningCredit: 2.5,
    material: null,
    objective: null,
    target: null,
    prerequisites: null,
    outline: null,
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: false,
    partnerName: 'Microsoft',
    courseGroupDescription: 'AI',
    publishStatusDescription: '已發布'
  };

  const request: CourseRequest = {
    pkid: 0,
    title: 'AI 協作開發實戰',
    officialTitle: null,
    courseId: 'AI-101',
    prodCourseId: 'AI-101-P',
    friendlyUrl: 'ai-101',
    displayOrder: 1,
    partnerPkid: 1,
    courseGroupPkid: 2,
    publishStatusPkid: 2,
    scheduleOn: '2026-03-16',
    scheduleOff: '2026-12-31',
    hour: 24,
    listPrice: 12000,
    learningCredit: 2.5,
    material: null,
    objective: null,
    target: null,
    prerequisites: null,
    outline: null,
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([course]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([course]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = { keyword: 'AI', partnerPkid: 1 };
    service.query(query).subscribe((result) => expect(result).toEqual([course]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([course]);
  });

  it('getById issues GET to the pkid URL', () => {
    service.getById(123).subscribe((result) => expect(result).toEqual(course));

    const req = httpMock.expectOne(`${baseUrl}/123`);
    expect(req.request.method).toBe('GET');
    req.flush(course);
  });

  it('create issues POST to the collection URL', () => {
    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...course, pkid: 7 });
  });

  it('update issues PUT to the collection URL with pkid in the body', () => {
    const updateRequest: CourseRequest = { ...request, pkid: 123 };
    service.update(updateRequest).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateRequest);
    req.flush(course);
  });

  it('delete issues DELETE to the pkid URL', () => {
    service.delete(123).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/123`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
