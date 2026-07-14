import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PublishStatusDetail } from './publish-status-detail';
import { PublishStatusService } from '../publish-status.service';
import { PublishStatus } from '../publish-status.model';

describe('PublishStatusDetail', () => {
  let component: PublishStatusDetail;
  let fixture: ComponentFixture<PublishStatusDetail>;
  let publishStatusServiceSpy: jasmine.SpyObj<PublishStatusService>;

  const status: PublishStatus = {
    pkid: 1,
    description: '草稿',
    isDraft: true,
    isPublished: false,
    isDiscontinued: false
  };

  beforeEach(async () => {
    publishStatusServiceSpy = jasmine.createSpyObj('PublishStatusService', ['getById']);
    publishStatusServiceSpy.getById.and.returnValue(of(status));

    await TestBed.configureTestingModule({
      imports: [PublishStatusDetail],
      providers: [
        provideRouter([]),
        { provide: PublishStatusService, useValue: publishStatusServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PublishStatusDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the status by its numeric pkid on init', () => {
    expect(publishStatusServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.status).toEqual(status);
  });
});
