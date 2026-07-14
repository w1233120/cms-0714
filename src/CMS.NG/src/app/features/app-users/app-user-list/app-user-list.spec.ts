import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { AppUserList } from './app-user-list';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';

describe('AppUserList', () => {
  let component: AppUserList;
  let fixture: ComponentFixture<AppUserList>;
  let appUserServiceSpy: jasmine.SpyObj<AppUserService>;

  const users: AppUser[] = [
    {
      pkid: 1,
      userId: 'helen',
      userName: 'Helen Wu',
      isActive: true,
      passwordUpdatedTime: '2026-05-01T09:30:00',
      roleCount: 2,
      roleIds: []
    },
    {
      pkid: 2,
      userId: 'sam',
      userName: 'Sam Lin',
      isActive: false,
      passwordUpdatedTime: null,
      roleCount: 0,
      roleIds: []
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();

    appUserServiceSpy = jasmine.createSpyObj('AppUserService', ['query', 'delete']);
    appUserServiceSpy.query.and.returnValue(of(users));
    appUserServiceSpy.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AppUserList],
      providers: [provideRouter([]), { provide: AppUserService, useValue: appUserServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppUserList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads users via query on init', () => {
    expect(appUserServiceSpy.query).toHaveBeenCalledWith({
      keyword: null,
      isActive: null,
      passwordUpdatedFrom: null,
      passwordUpdatedTo: null
    });
    expect(component.users).toEqual(users);
  });

  it('defaults the sort to userId ascending', () => {
    expect(component.sortField).toBe('userId');
    expect(component.sortOrder).toBe(1);
  });

  it('serializes date filters using local date components', () => {
    component.filterForm.setValue({
      keyword: 'hel',
      isActive: true,
      passwordUpdatedFrom: new Date(2026, 0, 31),
      passwordUpdatedTo: new Date(2026, 6, 14)
    });
    component.search();

    expect(appUserServiceSpy.query).toHaveBeenCalledWith({
      keyword: 'hel',
      isActive: true,
      passwordUpdatedFrom: '2026-01-31',
      passwordUpdatedTo: '2026-07-14'
    });
    expect(sessionStorage.getItem('app-user-list-filters')).toContain('2026-01-31');
  });

  it('deletes a user after confirmation', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((config) => {
      config.accept?.();
      return confirmationService;
    });

    component.remove(users[0]);

    expect(appUserServiceSpy.delete).toHaveBeenCalledWith('helen');
  });
});
