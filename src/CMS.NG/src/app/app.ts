import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
}

interface NavGroup {
  label: string;
  icon: string;
  adminOnly?: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);

  private readonly navGroups: NavGroup[] = [
    {
      label: '系統管理 Admin',
      icon: 'pi pi-shield',
      adminOnly: true,
      items: [
        { label: '使用者 AppUser', route: '/app-users' },
        { label: '角色 AppRole', route: '/app-roles' },
        { label: '發布狀態 PublishStatus', route: '/publish-statuses' }
      ]
    },
    {
      label: '課程管理 Course',
      icon: 'pi pi-book',
      items: [
        { label: '課程 Course', route: '/courses' },
        { label: '合作廠商 Partner', route: '/partners' },
        { label: '課程群組 CourseGroup', route: '/course-groups' }
      ]
    },
    {
      label: '首頁 Home',
      icon: 'pi pi-home',
      items: [{ label: '上稿作業 FeaturedPromoItem', route: '/featured-promo-items' }]
    }
  ];

  // The 系統管理 Admin group is shown only to users whose token carries the "Admin" role.
  protected readonly visibleNavGroups = computed(() =>
    this.navGroups.filter((group) => !group.adminOnly || this.auth.isAdmin())
  );

  protected readonly expandedGroups = signal(new Set(this.navGroups.map((g) => g.label)));
  protected readonly sidebarCollapsed = signal(false);

  protected isExpanded(label: string): boolean {
    return this.expandedGroups().has(label);
  }

  protected toggleGroup(label: string): void {
    const next = new Set(this.expandedGroups());
    next.has(label) ? next.delete(label) : next.add(label);
    this.expandedGroups.set(next);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
