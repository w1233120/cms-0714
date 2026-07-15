import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { CourseList } from './course-list';
import { CourseService } from '../course.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { Course } from '../course.model';

describe('CourseList', () => {
  let component: CourseList;
  let fixture: ComponentFixture<CourseList>;
  let courseServiceSpy: jasmine.SpyObj<CourseService>;
  let lookupSpy: jasmine.SpyObj<LookupService>;

  const course: Course = {
    pkid: 1,
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
    sessionStorage.clear();

    courseServiceSpy = jasmine.createSpyObj('CourseService', ['query', 'delete', 'update']);
    courseServiceSpy.query.and.returnValue(of([course]));
    courseServiceSpy.delete.and.returnValue(of(undefined));
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
      imports: [CourseList],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: LookupService, useValue: lookupSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('queries courses on init after lookups resolve', () => {
    expect(courseServiceSpy.query).toHaveBeenCalledWith({
      keyword: null,
      partnerPkid: null,
      courseGroupPkid: null,
      publishStatusPkid: null,
      scheduleOnFrom: null,
      scheduleOnTo: null,
      scheduleOffFrom: null,
      scheduleOffTo: null,
      canRepeat: null
    });
    expect(component.courses).toEqual([course]);
  });

  it('loads the filter lookups', () => {
    expect(component.partnerOptions).toEqual([{ value: 1, label: 'Microsoft' }]);
    expect(component.courseGroupOptions).toEqual([{ value: 2, label: 'AI' }]);
    expect(component.publishStatusOptions).toEqual([{ value: 2, label: '已發布' }]);
  });

  it('defaults the sort to displayOrder ascending', () => {
    expect(component.sortField).toBe('displayOrder');
    expect(component.sortOrder).toBe(1);
  });

  it('persists filters to sessionStorage on search', () => {
    component.filterForm.patchValue({ keyword: 'AI', partnerPkid: 1 });
    component.search();

    expect(courseServiceSpy.query).toHaveBeenCalledWith(
      jasmine.objectContaining({ keyword: 'AI', partnerPkid: 1 })
    );
    expect(sessionStorage.getItem('course-list-filters')).toContain('AI');
  });

  it('serializes date filters with local components', () => {
    component.filterForm.patchValue({ scheduleOnFrom: new Date(2026, 2, 6) });
    component.search();

    expect(courseServiceSpy.query).toHaveBeenCalledWith(
      jasmine.objectContaining({ scheduleOnFrom: '2026-03-06' })
    );
  });

  it('deletes a course after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(course);

    expect(courseServiceSpy.delete).toHaveBeenCalledWith(1);
  });

  // ---- Inline editing -------------------------------------------------------

  describe('inline editing', () => {
    it('double-click enters edit mode for an editable cell', () => {
      component.startEdit(course, 'title');

      expect(component.isEditing(course, 'title')).toBeTrue();
      expect(component.editValue).toBe(course.title);
    });

    it('single-click does not put any cell in edit mode', () => {
      // Edit is driven solely by the (dblclick) → startEdit path; nothing opens by default.
      expect(component.editing).toBeNull();
      expect(component.isEditing(course, 'title')).toBeFalse();
    });

    it('read-only columns (pkid, 原廠, 課程群組) cannot be edited', () => {
      for (const field of ['pkid', 'partnerName', 'courseGroupDescription']) {
        component.startEdit(course, field);
        expect(component.editing)
          .withContext(`startEdit should be a no-op for ${field}`)
          .toBeNull();
        expect(component.isEditable(field)).toBeFalse();
      }
    });

    it('blur commits the edited value via the update endpoint and exits edit mode', () => {
      const updated = { ...course, title: '新課程名稱' };
      courseServiceSpy.update.and.returnValue(of(updated));

      component.startEdit(course, 'title');
      component.editValue = '新課程名稱';
      component.commit(course, 'title');

      expect(courseServiceSpy.update).toHaveBeenCalled();
      const request = courseServiceSpy.update.calls.mostRecent().args[0];
      expect(request.pkid).toBe(1);
      expect(request.title).toBe('新課程名稱');
      expect(component.courses[0]).toEqual(updated);
      expect(component.editing).toBeNull();
    });

    it('editing 上架狀態 sends the selected publishStatusPkid', () => {
      component.startEdit(course, 'publishStatusPkid');
      component.editValue = 3;
      component.commit(course, 'publishStatusPkid');

      expect(courseServiceSpy.update.calls.mostRecent().args[0].publishStatusPkid).toBe(3);
    });

    it('serializes an edited date to a local ISO string on save', () => {
      component.startEdit(course, 'scheduleOn');
      component.editValue = new Date(2026, 5, 1);
      component.commit(course, 'scheduleOn');

      expect(courseServiceSpy.update.calls.mostRecent().args[0].scheduleOn).toBe('2026-06-01');
    });

    it('validation: blocks clearing a required text field and stays in edit mode', () => {
      component.startEdit(course, 'title');
      component.editValue = '   ';
      component.commit(course, 'title');

      expect(courseServiceSpy.update).not.toHaveBeenCalled();
      expect(component.editError).toBeTruthy();
      expect(component.isEditing(course, 'title')).toBeTrue();
    });

    it('validation: blocks negative numeric fields (時數/定價/點數)', () => {
      for (const field of ['hour', 'listPrice', 'learningCredit'] as const) {
        component.startEdit(course, field);
        component.editValue = -1;
        component.commit(course, field);
        expect(component.editError).withContext(field).toBeTruthy();
      }
      expect(courseServiceSpy.update).not.toHaveBeenCalled();
    });

    it('validation: blocks an invalid (cleared) date', () => {
      component.startEdit(course, 'scheduleOn');
      component.editValue = null;
      component.commit(course, 'scheduleOn');

      expect(courseServiceSpy.update).not.toHaveBeenCalled();
      expect(component.editError).toBeTruthy();
    });

    it('validation: blocks 上架日期 later than 下架日期', () => {
      // course.scheduleOff is 2026-12-31.
      component.startEdit(course, 'scheduleOn');
      component.editValue = new Date(2027, 0, 1);
      component.commit(course, 'scheduleOn');

      expect(courseServiceSpy.update).not.toHaveBeenCalled();
      expect(component.editError).toContain('上架日期');
    });

    it('validation: allows 上架日期 on/before 下架日期', () => {
      component.startEdit(course, 'scheduleOn');
      component.editValue = new Date(2026, 5, 1);
      component.commit(course, 'scheduleOn');

      expect(courseServiceSpy.update).toHaveBeenCalled();
      expect(component.editError).toBeNull();
    });

    it('reverts to the previous value and exits edit mode when the save fails', () => {
      courseServiceSpy.update.and.returnValue(throwError(() => new Error('boom')));

      component.startEdit(course, 'title');
      component.editValue = '不會被保存';
      component.commit(course, 'title');

      // Row is only replaced on success, so the previous value stands.
      expect(component.courses[0].title).toBe('AI 協作開發實戰');
      expect(component.editing).toBeNull();
    });
  });
});
