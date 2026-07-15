import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RowAuditService } from '../../../core/row-audit/row-audit.service';

import { AppRoleDetail } from './app-role-detail';
import { AppRoleService } from '../app-role.service';
import { AppRole } from '../app-role.model';
import { LookupService } from '../../../core/lookups/lookup.service';

describe('AppRoleDetail', () => {
  let component: AppRoleDetail;
  let fixture: ComponentFixture<AppRoleDetail>;

  const role: AppRole = {
    pkid: 1,
    roleId: 'Admin',
    roleName: 'Administrator',
    permissionLevel: 1,
    description: '系統管理員',
    userCount: 1,
    userIds: ['helen']
  };

  beforeEach(async () => {
    const appRoleServiceSpy = jasmine.createSpyObj('AppRoleService', ['getById']);
    appRoleServiceSpy.getById.and.returnValue(of(role));

    const lookupServiceSpy = jasmine.createSpyObj('LookupService', ['getAppUsers']);
    lookupServiceSpy.getAppUsers.and.returnValue(of([{ userId: 'helen', userName: 'helen' }]));

    await TestBed.configureTestingModule({
      imports: [AppRoleDetail],
      providers: [
        provideRouter([]),
        { provide: RowAuditService, useValue: { getForRecord: () => of([]) } },
        { provide: AppRoleService, useValue: appRoleServiceSpy },
        { provide: LookupService, useValue: lookupServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'Admin' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppRoleDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the role and maps user labels', () => {
    expect(component.role).toEqual(role);
    expect(component.userLabels).toEqual(['helen (helen)']);
  });
});
