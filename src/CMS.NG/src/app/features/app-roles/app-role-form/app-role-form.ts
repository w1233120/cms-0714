import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppRoleService } from '../app-role.service';
import { AppRoleRequest } from '../app-role.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AppUserLookup } from '../../../core/lookups/lookup.model';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-app-role-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, MultiSelectModule, ToastModule, RowAuditBadge],
  providers: [MessageService],
  templateUrl: './app-role-form.html',
  styleUrl: './app-role-form.scss'
})
export class AppRoleForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appRoleService = inject(AppRoleService);
  private readonly lookupService = inject(LookupService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  roleId: string | null = null;
  // The record's numeric pkid (the value RowAudit is keyed by), captured on load for the
  // audit-history badge. The role itself is addressed by roleId elsewhere.
  pkid: number | null = null;
  users: AppUserLookup[] = [];

  readonly form = this.fb.nonNullable.group({
    roleId: ['', Validators.required],
    roleName: ['', Validators.required],
    permissionLevel: [100, Validators.required],
    description: [''],
    userIds: [[] as string[]]
  });

  get userOptions(): { value: string; label: string }[] {
    return this.users.map((u) => ({ value: u.userId, label: `${u.userName} (${u.userId})` }));
  }

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.roleId;

    forkJoin({
      users: this.lookupService.getAppUsers(),
      role: this.isEdit ? this.appRoleService.getById(this.roleId!) : of(null)
    }).subscribe(({ users, role }) => {
      this.users = users;

      if (role) {
        this.pkid = role.pkid;
        this.form.patchValue({
          roleId: role.roleId,
          roleName: role.roleName,
          permissionLevel: role.permissionLevel,
          description: role.description ?? '',
          userIds: role.userIds
        });
        this.form.controls.roleId.disable();
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: AppRoleRequest = {
      roleId: value.roleId,
      roleName: value.roleName,
      permissionLevel: value.permissionLevel,
      description: value.description || null,
      userIds: value.userIds
    };

    const save$ = this.isEdit ? this.appRoleService.update(request) : this.appRoleService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/app-roles', saved.roleId]);
      },
      error: (err: HttpErrorResponse) => {
        const summary = err.status === 409 ? '角色代碼已存在' : '儲存失敗';
        this.messageService.add({ severity: 'error', summary });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.roleId) {
      this.router.navigate(['/app-roles', this.roleId]);
    } else {
      this.router.navigate(['/app-roles']);
    }
  }
}
