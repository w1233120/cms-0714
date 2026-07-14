import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CourseGroupDetail } from './course-group-detail';
import { CourseGroupService } from '../course-group.service';
import { CourseGroup } from '../course-group.model';

describe('CourseGroupDetail', () => {
  let component: CourseGroupDetail;
  let fixture: ComponentFixture<CourseGroupDetail>;
  let courseGroupServiceSpy: jasmine.SpyObj<CourseGroupService>;

  const courseGroup: CourseGroup = { pkid: 1, description: '雲端技術' };

  beforeEach(async () => {
    courseGroupServiceSpy = jasmine.createSpyObj('CourseGroupService', ['getById']);
    courseGroupServiceSpy.getById.and.returnValue(of(courseGroup));

    await TestBed.configureTestingModule({
      imports: [CourseGroupDetail],
      providers: [
        provideRouter([]),
        { provide: CourseGroupService, useValue: courseGroupServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseGroupDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the course group by its numeric pkid on init', () => {
    expect(courseGroupServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.courseGroup).toEqual(courseGroup);
  });
});
