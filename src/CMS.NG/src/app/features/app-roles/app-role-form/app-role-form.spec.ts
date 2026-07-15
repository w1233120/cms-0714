import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RowAuditService } from '../../../core/row-audit/row-audit.service';

import { AppRoleForm } from './app-role-form';
import { AppRoleService } from '../app-role.service';
import { AppRole } from '../app-role.model';
import { LookupService } from '../../../core/lookups/lookup.service';

describe('AppRoleForm', () => {
  let component: AppRoleForm;
  let fixture: ComponentFixture<AppRoleForm>;
  let appRoleServiceSpy: jasmine.SpyObj<AppRoleService>;
  let lookupServiceSpy: jasmine.SpyObj<LookupService>;

  const existingRole: AppRole = {
    pkid: 1,
    roleId: 'Admin',
    roleName: 'Administrator',
    permissionLevel: 1,
    description: '系統管理員',
    userCount: 1,
    userIds: ['helen']
  };

  function setup(paramMap: Record<string, string>): void {
    appRoleServiceSpy = jasmine.createSpyObj('AppRoleService', ['getById', 'create', 'update']);
    appRoleServiceSpy.getById.and.returnValue(of(existingRole));

    lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppUsers']);
    lookupServiceSpy.getAppUsers.and.returnValue(of([{ userId: 'helen', userName: 'helen' }]));

    TestBed.configureTestingModule({
      imports: [AppRoleForm],
      providers: [
        provideRouter([]),
        { provide: RowAuditService, useValue: { getForRecord: () => of([]) } },
        { provide: AppRoleService, useValue: appRoleServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => paramMap[key] ?? null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(AppRoleForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts with an empty, enabled form in add mode', () => {
    setup({});

    expect(component.isEdit).toBeFalse();
    expect(component.form.controls.roleId.disabled).toBeFalse();
  });

  it('loads the existing role and disables roleId in edit mode', () => {
    setup({ id: 'Admin' });

    expect(component.isEdit).toBeTrue();
    expect(appRoleServiceSpy.getById).toHaveBeenCalledWith('Admin');
    expect(component.form.controls.roleName.value).toBe('Administrator');
    expect(component.form.controls.userIds.value).toEqual(['helen']);
    expect(component.form.controls.roleId.disabled).toBeTrue();
  });

  it('calls create with the form value when adding a new role', () => {
    setup({});
    appRoleServiceSpy.create.and.returnValue(of({ ...existingRole, roleId: 'Editor', roleName: 'Editor' }));

    component.form.setValue({
      roleId: 'Editor',
      roleName: 'Editor',
      permissionLevel: 50,
      description: '',
      userIds: []
    });
    component.save();

    expect(appRoleServiceSpy.create).toHaveBeenCalledWith({
      roleId: 'Editor',
      roleName: 'Editor',
      permissionLevel: 50,
      description: null,
      userIds: []
    });
  });

  it('does not save when the form is invalid', () => {
    setup({});
    component.form.controls.roleName.setValue('');

    component.save();

    expect(appRoleServiceSpy.create).not.toHaveBeenCalled();
  });
});
