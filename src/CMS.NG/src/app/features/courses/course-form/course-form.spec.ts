import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RowAuditService } from '../../../core/row-audit/row-audit.service';

import { CourseForm } from './course-form';
import { CourseService } from '../course.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { Course } from '../course.model';

describe('CourseForm', () => {
  let component: CourseForm;
  let fixture: ComponentFixture<CourseForm>;
  let courseServiceSpy: jasmine.SpyObj<CourseService>;
  let lookupSpy: jasmine.SpyObj<LookupService>;
  let routeId: string | null;

  const course: Course = {
    pkid: 123,
    title: 'AI 協作開發實戰',
    officialTitle: null,
    courseId: 'AI-101',
    prodCourseId: 'AI-101-P',
    friendlyUrl: 'ai-101',
    displayOrder: 5,
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

  function fillValidForm(): void {
    component.form.patchValue({
      title: 'New Course',
      courseId: 'NEW-1',
      prodCourseId: 'NEW-1-P',
      friendlyUrl: 'new-1',
      displayOrder: 1,
      partnerPkid: 1,
      publishStatusPkid: 2,
      scheduleOn: new Date(2026, 2, 16),
      scheduleOff: new Date(2026, 11, 31),
      hour: 12,
      listPrice: 9000,
      learningCredit: 1.5,
      canRepeat: false
    });
  }

  beforeEach(async () => {
    routeId = null;

    courseServiceSpy = jasmine.createSpyObj('CourseService', ['getById', 'create', 'update']);
    courseServiceSpy.getById.and.returnValue(of(course));
    courseServiceSpy.create.and.returnValue(of(course));
    courseServiceSpy.update.and.returnValue(of(course));

    lookupSpy = jasmine.createSpyObj('LookupService', [
      'getPartners',
      'getCourseGroups',
      'getPublishStatuses'
    ]);
    lookupSpy.getPartners.and.returnValue(of([{ pkid: 1, name: 'Microsoft' }]));
    lookupSpy.getCourseGroups.and.returnValue(of([{ pkid: 2, description: 'AI' }]));
    lookupSpy.getPublishStatuses.and.returnValue(of([{ pkid: 2, description: '已發布' }]));

    await TestBed.configureTestingModule({
      imports: [CourseForm],
      providers: [
        provideRouter([]),
        { provide: RowAuditService, useValue: { getForRecord: () => of([]) } },
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: LookupService, useValue: lookupSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseForm);
    component = fixture.componentInstance;
  });

  it('add mode: starts empty and invalid, and loads lookups', () => {
    routeId = null;
    fixture.detectChanges();

    expect(component.isEdit).toBeFalse();
    expect(component.pkid).toBeNull();
    expect(component.form.invalid).toBeTrue();
    expect(component.partnerOptions.length).toBe(1);
  });

  it('add mode: create receives the request payload with pkid 0 and ISO dates', () => {
    routeId = null;
    fixture.detectChanges();

    fillValidForm();
    component.save();

    expect(courseServiceSpy.create).toHaveBeenCalled();
    const arg = courseServiceSpy.create.calls.mostRecent().args[0];
    expect(arg.pkid).toBe(0);
    expect(arg.courseId).toBe('NEW-1');
    expect(arg.scheduleOn).toBe('2026-03-16');
    expect(arg.scheduleOff).toBe('2026-12-31');
    expect(courseServiceSpy.update).not.toHaveBeenCalled();
  });

  it('edit mode: loads the course, patches the form, and parses dates', () => {
    routeId = '123';
    fixture.detectChanges();

    expect(component.isEdit).toBeTrue();
    expect(component.pkid).toBe(123);
    expect(courseServiceSpy.getById).toHaveBeenCalledWith(123);
    expect(component.form.getRawValue().courseId).toBe('AI-101');
    expect(component.form.getRawValue().scheduleOn).toEqual(new Date(2026, 2, 16));
  });

  it('edit mode: update receives the request carrying the pkid', () => {
    routeId = '123';
    fixture.detectChanges();

    component.save();

    expect(courseServiceSpy.update).toHaveBeenCalled();
    const arg = courseServiceSpy.update.calls.mostRecent().args[0];
    expect(arg.pkid).toBe(123);
    expect(arg.scheduleOn).toBe('2026-03-16');
    expect(courseServiceSpy.create).not.toHaveBeenCalled();
  });

  it('does not save an invalid form', () => {
    routeId = null;
    fixture.detectChanges();

    component.save(); // nothing filled in

    expect(courseServiceSpy.create).not.toHaveBeenCalled();
    expect(courseServiceSpy.update).not.toHaveBeenCalled();
  });

  describe('sticky action toolbar', () => {
    let scroller: HTMLElement | null = null;

    afterEach(() => {
      scroller?.remove();
      scroller = null;
    });

    // Mounts the form inside a short scroll container (mimicking .app-content), makes the
    // body tall, and returns the toolbar so tests can verify it pins on scroll.
    function mountInScroller(): HTMLElement {
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;

      scroller = document.createElement('div');
      scroller.style.height = '150px';
      scroller.style.overflow = 'auto';
      document.body.appendChild(scroller);
      scroller.appendChild(host);

      // Force the form tall enough to scroll under the toolbar.
      const spacer = document.createElement('div');
      spacer.style.height = '1500px';
      host.querySelector('form')!.appendChild(spacer);

      return host.querySelector('.form-header') as HTMLElement;
    }

    function assertStickyToolbar(header: HTMLElement): void {
      expect(header).withContext('.form-header toolbar exists').toBeTruthy();

      // Static styling declares it pinned above the content.
      const style = getComputedStyle(header);
      expect(style.position).withContext('position').toBe('sticky');
      expect(style.top).withContext('top offset').toBe('0px');
      expect(style.zIndex).withContext('stacked above content').not.toBe('auto');

      // Behavioural check: after scrolling the body, the toolbar stays at the top edge
      // of the scroll container instead of scrolling out of view.
      const scrollerTop = scroller!.getBoundingClientRect().top;
      scroller!.scrollTop = 600;
      const headerTop = header.getBoundingClientRect().top;
      expect(headerTop)
        .withContext('toolbar remains pinned to the top after scrolling')
        .toBeGreaterThanOrEqual(scrollerTop - 1);
      expect(headerTop).toBeLessThanOrEqual(scrollerTop + 2);

      // Save/Cancel remain present and reachable in the pinned toolbar.
      expect(header.textContent).toContain('儲存');
      expect(header.textContent).toContain('取消');
    }

    it('New form: toolbar is sticky, stays pinned on scroll, and keeps Save/Cancel', () => {
      routeId = null;
      const header = mountInScroller();

      expect(component.isEdit).toBeFalse();
      assertStickyToolbar(header);
    });

    it('Edit form: toolbar is sticky, stays pinned on scroll, and keeps Save/Cancel', () => {
      routeId = '123';
      const header = mountInScroller();

      expect(component.isEdit).toBeTrue();
      assertStickyToolbar(header);
    });
  });
});
