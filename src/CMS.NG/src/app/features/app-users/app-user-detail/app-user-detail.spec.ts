import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { RowAuditService } from '../../../core/row-audit/row-audit.service';

import { AppUserDetail } from './app-user-detail';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('AppUserDetail', () => {
  let component: AppUserDetail;
  let fixture: ComponentFixture<AppUserDetail>;
  let appUserServiceSpy: jasmine.SpyObj<AppUserService>;
  let isAdmin: WritableSignal<boolean>;

  const user: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Wu',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  async function setup(admin = true): Promise<void> {
    // Allow a test to reconfigure with a different role after the beforeEach setup.
    TestBed.resetTestingModule();

    appUserServiceSpy = jasmine.createSpyObj('AppUserService', ['getById', 'resetPassword']);
    appUserServiceSpy.getById.and.returnValue(of(user));
    appUserServiceSpy.resetPassword.and.returnValue(of(undefined));

    const lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppRoles']);
    lookupServiceSpy.getAppRoles.and.returnValue(of([{ roleId: 'Admin', roleName: 'Administrator' }]));

    isAdmin = signal(admin);
    const authStub = { isAdmin } as Pick<AuthService, 'isAdmin'>;

    await TestBed.configureTestingModule({
      imports: [AppUserDetail],
      providers: [
        provideRouter([]),
        { provide: RowAuditService, useValue: { getForRecord: () => of([]) } },
        { provide: AppUserService, useValue: appUserServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        { provide: AuthService, useValue: authStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'helen' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppUserDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup();
  });

  function hasResetButton(): boolean {
    return (fixture.nativeElement as HTMLElement).textContent?.includes('重設密碼') ?? false;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the user and maps role labels', () => {
    expect(component.user).toEqual(user);
    expect(component.roleLabels).toEqual(['Administrator (Admin)']);
  });

  it('resets the password after confirmation and reloads', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.resetPassword();

    expect(appUserServiceSpy.resetPassword).toHaveBeenCalledWith('helen');
    expect(appUserServiceSpy.getById).toHaveBeenCalledTimes(2);
  });

  it('shows the reset-password button for Admin users', () => {
    expect(hasResetButton()).toBeTrue();
  });

  it('hides the reset-password button for non-Admin users', async () => {
    await setup(false);

    expect(hasResetButton()).toBeFalse();
  });
});
