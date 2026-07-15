import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppUserService } from '../app-user.service';
import { AppUser } from '../app-user.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AppRoleLookup } from '../../../core/lookups/lookup.model';
import { AuthService } from '../../../core/auth/auth.service';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-app-user-detail',
  imports: [DatePipe, ButtonModule, ConfirmDialogModule, ToastModule, RowAuditBadge],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app-user-detail.html',
  styleUrl: './app-user-detail.scss'
})
export class AppUserDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appUserService = inject(AppUserService);
  private readonly lookupService = inject(LookupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  // Public so the template can gate the Admin-only "reset password" button on auth.isAdmin().
  readonly auth = inject(AuthService);

  user: AppUser | null = null;
  roleLabels: string[] = [];

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id')!;
    this.load(userId);
  }

  private load(userId: string): void {
    forkJoin({
      user: this.appUserService.getById(userId),
      roles: this.lookupService.getAppRoles()
    }).subscribe(({ user, roles }) => {
      this.user = user;
      this.roleLabels = this.mapRoleLabels(user.roleIds, roles);
    });
  }

  private mapRoleLabels(roleIds: string[], roles: AppRoleLookup[]): string[] {
    const byId = new Map(roles.map((r) => [r.roleId, r]));
    return roleIds.map((id) => {
      const role = byId.get(id);
      return role ? `${role.roleName} (${role.roleId})` : id;
    });
  }

  resetPassword(): void {
    if (!this.user) {
      return;
    }

    const userId = this.user.userId;
    this.confirmationService.confirm({
      message: `確定要將使用者「${userId}」的密碼重設為系統預設密碼？`,
      header: '重設密碼確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.appUserService.resetPassword(userId).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '重設成功',
            detail: `使用者 ${userId} 的密碼已重設為預設密碼`
          });
          this.load(userId);
        });
      }
    });
  }

  edit(): void {
    if (this.user) {
      this.router.navigate(['/app-users', this.user.userId, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/app-users']);
  }
}
