import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppUser, AppUserQuery } from '../app-user.model';
import { AppUserService } from '../app-user.service';

const FILTERS_KEY = 'app-user-list-filters';
const SORT_KEY = 'app-user-list-sort';
const PAGE_KEY = 'app-user-list-page';

@Component({
  selector: 'app-app-user-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app-user-list.html',
  styleUrl: './app-user-list.scss'
})
export class AppUserList implements OnInit {
  private readonly appUserService = inject(AppUserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  users: AppUser[] = [];
  filterVisible = false;
  sortField = 'userId';
  sortOrder = 1;
  first = 0;
  rows = 20;

  readonly flagOptions = [
    { value: null, label: '全部' },
    { value: true, label: '是' },
    { value: false, label: '否' }
  ];

  readonly filterForm = this.fb.nonNullable.group({
    keyword: [''],
    isActive: [null as boolean | null],
    passwordUpdatedFrom: [null as Date | null],
    passwordUpdatedTo: [null as Date | null]
  });

  ngOnInit(): void {
    this.restoreState();
    this.search();
  }

  private restoreState(): void {
    const savedFilters = sessionStorage.getItem(FILTERS_KEY);
    if (savedFilters) {
      const { keyword, isActive, passwordUpdatedFrom, passwordUpdatedTo } = JSON.parse(savedFilters);
      this.filterForm.patchValue({
        keyword,
        isActive,
        passwordUpdatedFrom: passwordUpdatedFrom ? new Date(passwordUpdatedFrom) : null,
        passwordUpdatedTo: passwordUpdatedTo ? new Date(passwordUpdatedTo) : null
      });
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

    const query: AppUserQuery = {
      keyword: filters.keyword || null,
      isActive: filters.isActive ?? null,
      passwordUpdatedFrom: toIso(filters.passwordUpdatedFrom),
      passwordUpdatedTo: toIso(filters.passwordUpdatedTo)
    };

    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ ...filters, ...query }));

    this.appUserService.query(query).subscribe((users) => {
      this.users = users;
    });

    this.filterVisible = false;
  }

  resetFilters(): void {
    this.filterForm.reset({
      keyword: '',
      isActive: null,
      passwordUpdatedFrom: null,
      passwordUpdatedTo: null
    });
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
    this.router.navigate(['/app-users/new']);
  }

  view(user: AppUser): void {
    this.router.navigate(['/app-users', user.userId]);
  }

  edit(user: AppUser): void {
    this.router.navigate(['/app-users', user.userId, 'edit']);
  }

  remove(user: AppUser): void {
    this.confirmationService.confirm({
      message: `確定要刪除主代碼 <b>${user.pkid}</b>「${user.userId}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.appUserService.delete(user.userId).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '刪除成功',
            detail: `使用者 ${user.userId} 已刪除`
          });
          this.search();
        });
      }
    });
  }
}

// Local date components — never toISOString(), which shifts to UTC.
function toIso(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
