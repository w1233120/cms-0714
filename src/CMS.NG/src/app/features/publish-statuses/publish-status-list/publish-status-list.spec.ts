import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { PublishStatusList } from './publish-status-list';
import { PublishStatusService } from '../publish-status.service';
import { PublishStatus } from '../publish-status.model';

describe('PublishStatusList', () => {
  let component: PublishStatusList;
  let fixture: ComponentFixture<PublishStatusList>;
  let publishStatusServiceSpy: jasmine.SpyObj<PublishStatusService>;

  const statuses: PublishStatus[] = [
    { pkid: 1, description: '草稿', isDraft: true, isPublished: false, isDiscontinued: false },
    { pkid: 2, description: '已發布', isDraft: false, isPublished: true, isDiscontinued: false }
  ];

  beforeEach(async () => {
    sessionStorage.clear();

    publishStatusServiceSpy = jasmine.createSpyObj('PublishStatusService', ['query', 'delete']);
    publishStatusServiceSpy.query.and.returnValue(of(statuses));
    publishStatusServiceSpy.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [PublishStatusList],
      providers: [provideRouter([]), { provide: PublishStatusService, useValue: publishStatusServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(PublishStatusList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads statuses via query on init', () => {
    expect(publishStatusServiceSpy.query).toHaveBeenCalledWith({
      keyword: null,
      isDraft: null,
      isPublished: null,
      isDiscontinued: null
    });
    expect(component.statuses).toEqual(statuses);
  });

  it('persists filters to sessionStorage on search', () => {
    component.filterForm.setValue({
      keyword: '草稿',
      isDraft: true,
      isPublished: false,
      isDiscontinued: null
    });
    component.search();

    expect(publishStatusServiceSpy.query).toHaveBeenCalledWith({
      keyword: '草稿',
      isDraft: true,
      isPublished: false,
      isDiscontinued: null
    });
    expect(sessionStorage.getItem('publish-status-list-filters')).toContain('草稿');
  });

  it('deletes a status after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(statuses[0]);

    expect(publishStatusServiceSpy.delete).toHaveBeenCalledWith(1);
  });
});
