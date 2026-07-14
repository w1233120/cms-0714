import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AppUserForm } from './app-user-form';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';

describe('AppUserForm', () => {
  let component: AppUserForm;
  let fixture: ComponentFixture<AppUserForm>;
  let appUserServiceSpy: jasmine.SpyObj<AppUserService>;
  let lookupServiceSpy: jasmine.SpyObj<LookupService>;

  const existingUser: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Wu',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  function setup(paramMap: Record<string, string>): void {
    appUserServiceSpy = jasmine.createSpyObj('AppUserService', ['getById', 'create', 'update']);
    appUserServiceSpy.getById.and.returnValue(of(existingUser));

    lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppRoles']);
    lookupServiceSpy.getAppRoles.and.returnValue(of([{ roleId: 'Admin', roleName: 'Administrator' }]));

    TestBed.configureTestingModule({
      imports: [AppUserForm],
      providers: [
        provideRouter([]),
        { provide: AppUserService, useValue: appUserServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => paramMap[key] ?? null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(AppUserForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts with an empty, enabled form in add mode', () => {
    setup({});

    expect(component.isEdit).toBeFalse();
    expect(component.form.controls.userId.disabled).toBeFalse();
    expect(component.form.controls.isActive.value).toBeTrue();
    expect(appUserServiceSpy.getById).not.toHaveBeenCalled();
  });

  it('has no password control', () => {
    setup({});

    expect(Object.keys(component.form.controls)).toEqual(['userId', 'userName', 'isActive', 'roleIds']);
  });

  it('loads the existing user and disables userId in edit mode', () => {
    setup({ id: 'helen' });

    expect(component.isEdit).toBeTrue();
    expect(appUserServiceSpy.getById).toHaveBeenCalledWith('helen');
    expect(component.form.controls.userName.value).toBe('Helen Wu');
    expect(component.form.controls.roleIds.value).toEqual(['Admin']);
    expect(component.form.controls.userId.disabled).toBeTrue();
  });

  it('calls create with the form value when adding a new user', () => {
    setup({});
    appUserServiceSpy.create.and.returnValue(of({ ...existingUser, userId: 'amy', userName: 'Amy Chen' }));

    component.form.setValue({
      userId: 'amy',
      userName: 'Amy Chen',
      isActive: true,
      roleIds: ['Admin']
    });
    component.save();

    expect(appUserServiceSpy.create).toHaveBeenCalledWith({
      userId: 'amy',
      userName: 'Amy Chen',
      isActive: true,
      roleIds: ['Admin']
    });
  });

  it('submits the disabled userId in edit mode', () => {
    setup({ id: 'helen' });
    appUserServiceSpy.update.and.returnValue(of(existingUser));

    component.form.controls.userName.setValue('Helen Wu（修訂）');
    component.save();

    expect(appUserServiceSpy.update).toHaveBeenCalledWith({
      userId: 'helen',
      userName: 'Helen Wu（修訂）',
      isActive: true,
      roleIds: ['Admin']
    });
  });

  it('does not save when the form is invalid', () => {
    setup({});
    component.form.controls.userName.setValue('');

    component.save();

    expect(appUserServiceSpy.create).not.toHaveBeenCalled();
  });
});
