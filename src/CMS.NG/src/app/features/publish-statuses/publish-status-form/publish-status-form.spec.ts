import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PublishStatusForm } from './publish-status-form';
import { PublishStatusService } from '../publish-status.service';
import { PublishStatus } from '../publish-status.model';

describe('PublishStatusForm', () => {
  let component: PublishStatusForm;
  let fixture: ComponentFixture<PublishStatusForm>;
  let publishStatusServiceSpy: jasmine.SpyObj<PublishStatusService>;

  const existingStatus: PublishStatus = {
    pkid: 1,
    description: '草稿',
    isDraft: true,
    isPublished: false,
    isDiscontinued: false
  };

  function setup(paramMap: Record<string, string>): void {
    publishStatusServiceSpy = jasmine.createSpyObj('PublishStatusService', ['getById', 'create', 'update']);
    publishStatusServiceSpy.getById.and.returnValue(of(existingStatus));

    TestBed.configureTestingModule({
      imports: [PublishStatusForm],
      providers: [
        provideRouter([]),
        { provide: PublishStatusService, useValue: publishStatusServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => paramMap[key] ?? null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(PublishStatusForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts with an empty, enabled form in add mode and fetches nothing', () => {
    setup({});

    expect(component.isEdit).toBeFalse();
    expect(component.form.controls.pkid.disabled).toBeFalse();
    expect(publishStatusServiceSpy.getById).not.toHaveBeenCalled();
  });

  it('loads the existing status and disables pkid in edit mode', () => {
    setup({ id: '1' });

    expect(component.isEdit).toBeTrue();
    expect(publishStatusServiceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.form.controls.description.value).toBe('草稿');
    expect(component.form.controls.isDraft.value).toBeTrue();
    expect(component.form.controls.pkid.disabled).toBeTrue();
  });

  it('calls create with the form value when adding a new status', () => {
    setup({});
    publishStatusServiceSpy.create.and.returnValue(
      of({ pkid: 3, description: '已下架', isDraft: false, isPublished: false, isDiscontinued: true })
    );

    component.form.setValue({
      pkid: 3,
      description: '已下架',
      isDraft: false,
      isPublished: false,
      isDiscontinued: true
    });
    component.save();

    expect(publishStatusServiceSpy.create).toHaveBeenCalledWith({
      pkid: 3,
      description: '已下架',
      isDraft: false,
      isPublished: false,
      isDiscontinued: true
    });
  });

  it('submits the disabled pkid when updating', () => {
    setup({ id: '1' });
    publishStatusServiceSpy.update.and.returnValue(of(existingStatus));

    component.form.controls.description.setValue('草稿（修訂）');
    component.save();

    expect(publishStatusServiceSpy.update).toHaveBeenCalledWith({
      pkid: 1,
      description: '草稿（修訂）',
      isDraft: true,
      isPublished: false,
      isDiscontinued: false
    });
  });

  it('does not save when a required field is missing', () => {
    setup({});
    component.form.controls.description.setValue('');

    component.save();

    expect(publishStatusServiceSpy.create).not.toHaveBeenCalled();
  });
});
