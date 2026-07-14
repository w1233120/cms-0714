import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { PartnerList } from './partner-list';
import { PartnerService } from '../partner.service';
import { Partner } from '../partner.model';

describe('PartnerList', () => {
  let component: PartnerList;
  let fixture: ComponentFixture<PartnerList>;
  let partnerServiceSpy: jasmine.SpyObj<PartnerService>;

  const partners: Partner[] = [
    {
      pkid: 1,
      name: 'Microsoft',
      appKey: 'MS',
      nameOnPartnerMenu: 'Microsoft 課程',
      nameOnCourseDetailPage: 'Microsoft',
      displayOrder: 1,
      imageFilename: 'ms.png'
    },
    {
      pkid: 2,
      name: 'AWS',
      appKey: 'AWS',
      nameOnPartnerMenu: 'AWS 課程',
      nameOnCourseDetailPage: 'AWS',
      displayOrder: 2,
      imageFilename: null
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();

    partnerServiceSpy = jasmine.createSpyObj('PartnerService', ['query', 'delete']);
    partnerServiceSpy.query.and.returnValue(of(partners));
    partnerServiceSpy.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [PartnerList],
      providers: [provideRouter([]), { provide: PartnerService, useValue: partnerServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads partners via query on init', () => {
    expect(partnerServiceSpy.query).toHaveBeenCalledWith({ keyword: null });
    expect(component.partners).toEqual(partners);
  });

  it('defaults the sort to displayOrder ascending', () => {
    expect(component.sortField).toBe('displayOrder');
    expect(component.sortOrder).toBe(1);
  });

  it('persists filters to sessionStorage on search', () => {
    component.filterForm.setValue({ keyword: 'Micro' });
    component.search();

    expect(partnerServiceSpy.query).toHaveBeenCalledWith({ keyword: 'Micro' });
    expect(sessionStorage.getItem('partner-list-filters')).toContain('Micro');
  });

  it('deletes a partner after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(partners[0]);

    expect(partnerServiceSpy.delete).toHaveBeenCalledWith(1);
  });
});
