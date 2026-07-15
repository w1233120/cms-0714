import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';

import { AppUserForm } from './app-user-form';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('AppUserForm', () => {
  let component: AppUserForm;
  let fixture: ComponentFixture<AppUserForm>;
  let appUserServiceSpy: jasmine.SpyObj<AppUserService>;
  let lookupServiceSpy: jasmine.SpyObj<LookupService>;
  let isAdmin: WritableSignal<boolean>;

  const existingUser: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Wu',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  function setup(paramMap: Record<string, string>, admin = false): void {
    appUserServiceSpy = jasmine.createSpyObj('AppUserService', ['getById', 'create', 'update', 'resetPassword']);
    appUserServiceSpy.getById.and.returnValue(of(existingUser));
    appUserServiceSpy.resetPassword.and.returnValue(of(undefined));

    lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppRoles']);
    lookupServiceSpy.getAppRoles.and.returnValue(of([{ roleId: 'Admin', roleName: 'Administrator' }]));

    isAdmin = signal(admin);
    const authStub = { isAdmin } as Pick<AuthService, 'isAdmin'>;

    TestBed.configureTestingModule({
      imports: [AppUserForm],
      providers: [
        provideRouter([]),
        { provide: AppUserService, useValue: appUserServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        { provide: AuthService, useValue: authStub },
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

  function hasResetButton(): boolean {
    return (fixture.nativeElement as HTMLElement).textContent?.includes('重設密碼') ?? false;
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

  it('shows the reset-password button in edit mode for Admin users', () => {
    setup({ id: 'helen' }, true);

    expect(hasResetButton()).toBeTrue();
  });

  it('hides the reset-password button for non-Admin users', () => {
    setup({ id: 'helen' }, false);

    expect(hasResetButton()).toBeFalse();
  });

  it('hides the reset-password button in add mode even for Admins', () => {
    setup({}, true);

    expect(hasResetButton()).toBeFalse();
  });

  it('resets the password via the service after confirmation', () => {
    setup({ id: 'helen' }, true);
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.resetPassword();

    expect(appUserServiceSpy.resetPassword).toHaveBeenCalledWith('helen');
  });
});
