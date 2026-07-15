import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RowAuditService } from '../../../core/row-audit/row-audit.service';

import { PartnerForm } from './partner-form';
import { PartnerService } from '../partner.service';
import { Partner } from '../partner.model';

describe('PartnerForm', () => {
  let component: PartnerForm;
  let fixture: ComponentFixture<PartnerForm>;
  let partnerServiceSpy: jasmine.SpyObj<PartnerService>;

  const existingPartner: Partner = {
    pkid: 1,
    name: 'Microsoft',
    appKey: 'MS',
    nameOnPartnerMenu: 'Microsoft 課程',
    nameOnCourseDetailPage: 'Microsoft',
    displayOrder: 1,
    imageFilename: 'ms.png'
  };

  function setup(paramMap: Record<string, string>): void {
    partnerServiceSpy = jasmine.createSpyObj('PartnerService', ['getById', 'create', 'update']);
    partnerServiceSpy.getById.and.returnValue(of(existingPartner));

    TestBed.configureTestingModule({
      imports: [PartnerForm],
      providers: [
        provideRouter([]),
        { provide: RowAuditService, useValue: { getForRecord: () => of([]) } },
        { provide: PartnerService, useValue: partnerServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => paramMap[key] ?? null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(PartnerForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts with an empty form in add mode and fetches nothing', () => {
    setup({});

    expect(component.isEdit).toBeFalse();
    expect(component.pkid).toBeNull();
    expect(component.form.controls.name.value).toBe('');
    expect(partnerServiceSpy.getById).not.toHaveBeenCalled();
  });

  it('loads the existing partner in edit mode', () => {
    setup({ id: '1' });

    expect(component.isEdit).toBeTrue();
    expect(partnerServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.pkid).toBe(1);
    expect(component.form.controls.name.value).toBe('Microsoft');
    expect(component.form.controls.displayOrder.value).toBe(1);
  });

  it('calls create with pkid 0 when adding a new partner', () => {
    setup({});
    partnerServiceSpy.create.and.returnValue(of({ ...existingPartner, pkid: 7, name: 'AWS' }));

    component.form.setValue({
      name: 'AWS',
      appKey: 'AWS',
      nameOnPartnerMenu: 'AWS 課程',
      nameOnCourseDetailPage: 'AWS',
      displayOrder: 2,
      imageFilename: null
    });
    component.save();

    expect(partnerServiceSpy.create).toHaveBeenCalledWith({
      pkid: 0,
      name: 'AWS',
      appKey: 'AWS',
      nameOnPartnerMenu: 'AWS 課程',
      nameOnCourseDetailPage: 'AWS',
      displayOrder: 2,
      imageFilename: null
    });
  });

  it('submits the pkid held outside the form when updating', () => {
    setup({ id: '1' });
    partnerServiceSpy.update.and.returnValue(of(existingPartner));

    component.form.controls.name.setValue('Microsoft（修訂）');
    component.save();

    expect(partnerServiceSpy.update).toHaveBeenCalledWith({
      pkid: 1,
      name: 'Microsoft（修訂）',
      appKey: 'MS',
      nameOnPartnerMenu: 'Microsoft 課程',
      nameOnCourseDetailPage: 'Microsoft',
      displayOrder: 1,
      imageFilename: 'ms.png'
    });
  });

  it('does not save when a required field is missing', () => {
    setup({});
    component.form.controls.name.setValue('');

    component.save();

    expect(partnerServiceSpy.create).not.toHaveBeenCalled();
  });
});
