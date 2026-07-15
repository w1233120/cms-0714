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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppUserService } from '../app-user.service';
import { AppUserRequest } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AppRoleLookup } from '../../../core/lookups/lookup.model';
import { AuthService } from '../../../core/auth/auth.service';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-app-user-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    MultiSelectModule,
    ToastModule,
    ConfirmDialogModule,
    RowAuditBadge
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app-user-form.html',
  styleUrl: './app-user-form.scss'
})
export class AppUserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appUserService = inject(AppUserService);
  private readonly lookupService = inject(LookupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  // Public so the template can gate the Admin-only "reset password" button on auth.isAdmin().
  readonly auth = inject(AuthService);

  isEdit = false;
  userId: string | null = null;
  // The record's numeric pkid (the value RowAudit is keyed by), captured on load for the
  // audit-history badge. The user itself is addressed by userId elsewhere.
  pkid: number | null = null;
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
        this.pkid = user.pkid;
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

  // Admin-only: reset the edited user's password back to the system default. The client
  // sends only the UserId — no password or hash is ever sent or received. The backend also
  // enforces the Admin role (403 otherwise), so this button is a convenience, not the gate.
  resetPassword(): void {
    if (!this.userId) {
      return;
    }

    const userId = this.userId;
    this.confirmationService.confirm({
      message: `確定要將使用者「${userId}」的密碼重設為系統預設密碼？`,
      header: '重設密碼確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.appUserService.resetPassword(userId).subscribe({
          next: () =>
            this.messageService.add({
              severity: 'success',
              summary: '重設成功',
              detail: `使用者 ${userId} 的密碼已重設為預設密碼`
            }),
          error: () => this.messageService.add({ severity: 'error', summary: '重設失敗' })
        });
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
