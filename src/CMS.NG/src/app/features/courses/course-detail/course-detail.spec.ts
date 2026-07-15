import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CourseDetail } from './course-detail';
import { CourseService } from '../course.service';
import { Course } from '../course.model';

describe('CourseDetail', () => {
  let component: CourseDetail;
  let fixture: ComponentFixture<CourseDetail>;
  let courseServiceSpy: jasmine.SpyObj<CourseService>;

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
    canRepeat: false,
    partnerName: 'Microsoft',
    courseGroupDescription: 'AI',
    publishStatusDescription: '已發布'
  };

  beforeEach(async () => {
    courseServiceSpy = jasmine.createSpyObj('CourseService', ['getById']);
    courseServiceSpy.getById.and.returnValue(of(course));

    await TestBed.configureTestingModule({
      imports: [CourseDetail],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '123' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the course by its numeric pkid on init', () => {
    expect(courseServiceSpy.getById).toHaveBeenCalledWith(123);
    expect(component.course).toEqual(course);
  });

  it('renders the 基本資料 card hosting the QR code for the course', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('基本資料');

    // The QR component receives the course pkid/CourseId and renders its title.
    const qrTitle = host.querySelector('app-course-qr-code .qr__title');
    expect(qrTitle?.textContent?.trim()).toBe('AI-101');
  });
});
