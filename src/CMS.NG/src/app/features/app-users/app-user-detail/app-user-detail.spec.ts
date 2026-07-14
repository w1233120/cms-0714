import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { AppUserDetail } from './app-user-detail';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';

describe('AppUserDetail', () => {
  let component: AppUserDetail;
  let fixture: ComponentFixture<AppUserDetail>;
  let appUserServiceSpy: jasmine.SpyObj<AppUserService>;

  const user: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Wu',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  beforeEach(async () => {
    appUserServiceSpy = jasmine.createSpyObj('AppUserService', ['getById', 'resetPassword']);
    appUserServiceSpy.getById.and.returnValue(of(user));
    appUserServiceSpy.resetPassword.and.returnValue(of(undefined));

    const lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppRoles']);
    lookupServiceSpy.getAppRoles.and.returnValue(of([{ roleId: 'Admin', roleName: 'Administrator' }]));

    await TestBed.configureTestingModule({
      imports: [AppUserDetail],
      providers: [
        provideRouter([]),
        { provide: AppUserService, useValue: appUserServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'helen' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppUserDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

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
});
