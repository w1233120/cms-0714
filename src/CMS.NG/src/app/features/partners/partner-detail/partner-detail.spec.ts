import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PartnerDetail } from './partner-detail';
import { PartnerService } from '../partner.service';
import { Partner } from '../partner.model';

describe('PartnerDetail', () => {
  let component: PartnerDetail;
  let fixture: ComponentFixture<PartnerDetail>;
  let partnerServiceSpy: jasmine.SpyObj<PartnerService>;

  const partner: Partner = {
    pkid: 1,
    name: 'Microsoft',
    appKey: 'MS',
    nameOnPartnerMenu: 'Microsoft 課程',
    nameOnCourseDetailPage: 'Microsoft',
    displayOrder: 1,
    imageFilename: 'ms.png'
  };

  beforeEach(async () => {
    partnerServiceSpy = jasmine.createSpyObj('PartnerService', ['getById']);
    partnerServiceSpy.getById.and.returnValue(of(partner));

    await TestBed.configureTestingModule({
      imports: [PartnerDetail],
      providers: [
        provideRouter([]),
        { provide: PartnerService, useValue: partnerServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the partner by its numeric pkid on init', () => {
    expect(partnerServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.partner).toEqual(partner);
  });
});
