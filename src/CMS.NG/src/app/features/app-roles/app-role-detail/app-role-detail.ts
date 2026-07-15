import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AppRoleService } from '../app-role.service';
import { AppRole } from '../app-role.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import { AppUserLookup } from '../../../core/lookups/lookup.model';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-app-role-detail',
  imports: [ButtonModule, RowAuditBadge],
  templateUrl: './app-role-detail.html',
  styleUrl: './app-role-detail.scss'
})
export class AppRoleDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appRoleService = inject(AppRoleService);
  private readonly lookupService = inject(LookupService);

  role: AppRole | null = null;
  userLabels: string[] = [];

  ngOnInit(): void {
    const roleId = this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      role: this.appRoleService.getById(roleId),
      users: this.lookupService.getAppUsers()
    }).subscribe(({ role, users }) => {
      this.role = role;
      this.userLabels = this.mapUserLabels(role.userIds, users);
    });
  }

  private mapUserLabels(userIds: string[], users: AppUserLookup[]): string[] {
    const byId = new Map(users.map((u) => [u.userId, u]));
    return userIds.map((id) => {
      const user = byId.get(id);
      return user ? `${user.userName} (${user.userId})` : id;
    });
  }

  edit(): void {
    if (this.role) {
      this.router.navigate(['/app-roles', this.role.roleId, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/app-roles']);
  }
}
