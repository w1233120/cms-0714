import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppUserService } from '../app-user.service';
import { AppUserRequest } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AppRoleLookup } from '../../../core/lookups/lookup.model';

@Component({
  selector: 'app-app-user-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, CheckboxModule, MultiSelectModule, ToastModule],
  providers: [MessageService],
  templateUrl: './app-user-form.html',
  styleUrl: './app-user-form.scss'
})
export class AppUserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appUserService = inject(AppUserService);
  private readonly lookupService = inject(LookupService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  userId: string | null = null;
  roles: AppRoleLookup[] = [];

  // No password control: the backend seeds PasswordHash from SysConfig on create
  // and only the reset-password endpoint may change it.
  readonly form = this.fb.nonNullable.group({
    userId: ['', Validators.required],
    userName: ['', Validators.required],
    isActive: [true],
    roleIds: [[] as string[]]
  });

  get roleOptions(): { value: string; label: string }[] {
    return this.roles.map((r) => ({ value: r.roleId, label: `${r.roleName} (${r.roleId})` }));
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.userId;

    forkJoin({
      roles: this.lookupService.getAppRoles(),
      user: this.isEdit ? this.appUserService.getById(this.userId!) : of(null)
    }).subscribe(({ roles, user }) => {
      this.roles = roles;

      if (user) {
        this.form.patchValue({
          userId: user.userId,
          userName: user.userName,
          isActive: user.isActive,
          roleIds: user.roleIds
        });
        this.form.controls.userId.disable();
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: AppUserRequest = {
      userId: value.userId,
      userName: value.userName,
      isActive: value.isActive,
      roleIds: value.roleIds
    };

    const save$ = this.isEdit ? this.appUserService.update(request) : this.appUserService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/app-users', saved.userId]);
      },
      error: (err: HttpErrorResponse) => {
        const summary = err.status === 409 ? '使用者代碼已存在' : '儲存失敗';
        this.messageService.add({ severity: 'error', summary });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.userId) {
      this.router.navigate(['/app-users', this.userId]);
    } else {
      this.router.navigate(['/app-users']);
    }
  }
}
