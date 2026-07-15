import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
}

interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly navGroups: NavGroup[] = [
    {
      label: '系統管理 Admin',
      icon: 'pi pi-shield',
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
}
