import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppRole, AppRoleQuery } from '../app-role.model';
import { AppRoleService } from '../app-role.service';

const FILTERS_KEY = 'app-role-list-filters';
const SORT_KEY = 'app-role-list-sort';
const PAGE_KEY = 'app-role-list-page';

@Component({
  selector: 'app-app-role-list',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app-role-list.html',
  styleUrl: './app-role-list.scss'
})
export class AppRoleList implements OnInit {
  private readonly appRoleService = inject(AppRoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  roles: AppRole[] = [];
  filterVisible = false;
  sortField = 'roleId';
  sortOrder = 1;
  first = 0;
  rows = 20;

  readonly filterForm = this.fb.nonNullable.group({
    keyword: [''],
    permissionLevel: [null as number | null]
  });

  ngOnInit(): void {
    this.restoreState();
    this.search();
  }

  private restoreState(): void {
    const savedFilters = sessionStorage.getItem(FILTERS_KEY);
    if (savedFilters) {
      this.filterForm.patchValue(JSON.parse(savedFilters));
    }

    const savedSort = sessionStorage.getItem(SORT_KEY);
    if (savedSort) {
      const { sortField, sortOrder } = JSON.parse(savedSort);
      this.sortField = sortField;
      this.sortOrder = sortOrder;
    }

    const savedPage = sessionStorage.getItem(PAGE_KEY);
    if (savedPage) {
      const { first, rows } = JSON.parse(savedPage);
      this.first = first;
      this.rows = rows;
    }
  }

  search(): void {
    const filters = this.filterForm.getRawValue();
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));

    const query: AppRoleQuery = {
      keyword: filters.keyword || null,
      permissionLevel: filters.permissionLevel ?? null
    };

    this.appRoleService.query(query).subscribe((roles) => {
      this.roles = roles;
    });

    this.filterVisible = false;
  }

  resetFilters(): void {
    this.filterForm.reset({ keyword: '', permissionLevel: null });
    this.search();
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField = event.field;
    this.sortOrder = event.order;
    sessionStorage.setItem(SORT_KEY, JSON.stringify({ sortField: this.sortField, sortOrder: this.sortOrder }));
  }

  onPage(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
    sessionStorage.setItem(PAGE_KEY, JSON.stringify({ first: this.first, rows: this.rows }));
  }

  addNew(): void {
    this.router.navigate(['/app-roles/new']);
  }

  view(role: AppRole): void {
    this.router.navigate(['/app-roles', role.roleId]);
  }

  edit(role: AppRole): void {
    this.router.navigate(['/app-roles', role.roleId, 'edit']);
  }

  remove(role: AppRole): void {
    this.confirmationService.confirm({
      message: `確定要刪除主代碼 <b>${role.pkid}</b>「${role.roleId}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.appRoleService.delete(role.roleId).subscribe(() => {
          this.messageService.add({ severity: 'success', summary: '刪除成功', detail: `角色 ${role.roleId} 已刪除` });
          this.search();
        });
      }
    });
  }
}
