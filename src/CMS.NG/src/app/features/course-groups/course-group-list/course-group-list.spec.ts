import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { CourseGroupList } from './course-group-list';
import { CourseGroupService } from '../course-group.service';
import { CourseGroup } from '../course-group.model';

describe('CourseGroupList', () => {
  let component: CourseGroupList;
  let fixture: ComponentFixture<CourseGroupList>;
  let courseGroupServiceSpy: jasmine.SpyObj<CourseGroupService>;

  const courseGroups: CourseGroup[] = [
    { pkid: 1, description: '雲端技術' },
    { pkid: 2, description: '資料庫' }
  ];

  beforeEach(async () => {
    sessionStorage.clear();

    courseGroupServiceSpy = jasmine.createSpyObj('CourseGroupService', ['query', 'delete']);
    courseGroupServiceSpy.query.and.returnValue(of(courseGroups));
    courseGroupServiceSpy.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [CourseGroupList],
      providers: [provideRouter([]), { provide: CourseGroupService, useValue: courseGroupServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseGroupList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads course groups via query on init', () => {
    expect(courseGroupServiceSpy.query).toHaveBeenCalledWith({ keyword: null });
    expect(component.courseGroups).toEqual(courseGroups);
  });

  it('defaults the sort to pkid ascending', () => {
    expect(component.sortField).toBe('pkid');
    expect(component.sortOrder).toBe(1);
  });

  it('persists filters to sessionStorage on search', () => {
    component.filterForm.setValue({ keyword: '雲端' });
    component.search();

    expect(courseGroupServiceSpy.query).toHaveBeenCalledWith({ keyword: '雲端' });
    expect(sessionStorage.getItem('course-group-list-filters')).toContain('雲端');
  });

  it('deletes a course group after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(courseGroups[0]);

    expect(courseGroupServiceSpy.delete).toHaveBeenCalledWith(1);
  });

  it('warns that the cascade deletes the courses in the group', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = spyOn(confirmationService, 'confirm').and.returnValue(confirmationService);

    component.remove(courseGroups[0]);

    expect(confirmSpy.calls.mostRecent().args[0].message).toContain('課程將一併刪除');
  });
});
