import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CourseGroupForm } from './course-group-form';
import { CourseGroupService } from '../course-group.service';
import { CourseGroup } from '../course-group.model';

describe('CourseGroupForm', () => {
  let component: CourseGroupForm;
  let fixture: ComponentFixture<CourseGroupForm>;
  let courseGroupServiceSpy: jasmine.SpyObj<CourseGroupService>;

  const existingCourseGroup: CourseGroup = { pkid: 1, description: '雲端技術' };

  function setup(paramMap: Record<string, string>): void {
    courseGroupServiceSpy = jasmine.createSpyObj('CourseGroupService', ['getById', 'create', 'update']);
    courseGroupServiceSpy.getById.and.returnValue(of(existingCourseGroup));

    TestBed.configureTestingModule({
      imports: [CourseGroupForm],
      providers: [
        provideRouter([]),
        { provide: CourseGroupService, useValue: courseGroupServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => paramMap[key] ?? null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(CourseGroupForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts with an empty form in add mode and fetches nothing', () => {
    setup({});

    expect(component.isEdit).toBeFalse();
    expect(component.pkid).toBeNull();
    expect(component.form.controls.description.value).toBe('');
    expect(courseGroupServiceSpy.getById).not.toHaveBeenCalled();
  });

  it('loads the existing course group in edit mode', () => {
    setup({ id: '1' });

    expect(component.isEdit).toBeTrue();
    expect(courseGroupServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.pkid).toBe(1);
    expect(component.form.controls.description.value).toBe('雲端技術');
  });

  it('calls create with pkid 0 when adding a new course group', () => {
    setup({});
    courseGroupServiceSpy.create.and.returnValue(of({ pkid: 7, description: '資料庫' }));

    component.form.setValue({ description: '資料庫' });
    component.save();

    expect(courseGroupServiceSpy.create).toHaveBeenCalledWith({ pkid: 0, description: '資料庫' });
  });

  it('submits the pkid held outside the form when updating', () => {
    setup({ id: '1' });
    courseGroupServiceSpy.update.and.returnValue(of(existingCourseGroup));

    component.form.controls.description.setValue('雲端技術（修訂）');
    component.save();

    expect(courseGroupServiceSpy.update).toHaveBeenCalledWith({
      pkid: 1,
      description: '雲端技術（修訂）'
    });
  });

  it('does not save when the required 群組名稱 is missing', () => {
    setup({});
    component.form.controls.description.setValue('');

    component.save();

    expect(courseGroupServiceSpy.create).not.toHaveBeenCalled();
  });
});
