import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { AppRoleList } from './app-role-list';
import { AppRoleService } from '../app-role.service';
import { AppRole } from '../app-role.model';

describe('AppRoleList', () => {
  let component: AppRoleList;
  let fixture: ComponentFixture<AppRoleList>;
  let appRoleServiceSpy: jasmine.SpyObj<AppRoleService>;

  const roles: AppRole[] = [
    { pkid: 1, roleId: 'Admin', roleName: 'Administrator', permissionLevel: 1, description: '系統管理員', userCount: 3, userIds: [] },
    { pkid: 2, roleId: 'User', roleName: 'User', permissionLevel: 100, description: '一般使用者', userCount: 9, userIds: [] }
  ];

  beforeEach(async () => {
    sessionStorage.clear();

    appRoleServiceSpy = jasmine.createSpyObj('AppRoleService', ['query', 'delete']);
    appRoleServiceSpy.query.and.returnValue(of(roles));
    appRoleServiceSpy.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AppRoleList],
      providers: [provideRouter([]), { provide: AppRoleService, useValue: appRoleServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppRoleList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads roles via query on init', () => {
    expect(appRoleServiceSpy.query).toHaveBeenCalledWith({ keyword: null, permissionLevel: null });
    expect(component.roles).toEqual(roles);
  });

  it('persists filters to sessionStorage on search', () => {
    component.filterForm.setValue({ keyword: 'Admin', permissionLevel: 1 });
    component.search();

    expect(appRoleServiceSpy.query).toHaveBeenCalledWith({ keyword: 'Admin', permissionLevel: 1 });
    expect(sessionStorage.getItem('app-role-list-filters')).toContain('Admin');
  });

  it('deletes a role after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(roles[0]);

    expect(appRoleServiceSpy.delete).toHaveBeenCalledWith('Admin');
  });
});
