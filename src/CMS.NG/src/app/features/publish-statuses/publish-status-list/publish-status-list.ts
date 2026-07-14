import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PublishStatus, PublishStatusQuery } from '../publish-status.model';
import { PublishStatusService } from '../publish-status.service';

const FILTERS_KEY = 'publish-status-list-filters';
const SORT_KEY = 'publish-status-list-sort';
const PAGE_KEY = 'publish-status-list-page';

@Component({
  selector: 'app-publish-status-list',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './publish-status-list.html',
  styleUrl: './publish-status-list.scss'
})
export class PublishStatusList implements OnInit {
  private readonly publishStatusService = inject(PublishStatusService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  statuses: PublishStatus[] = [];
  filterVisible = false;
  sortField = 'pkid';
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
    isDraft: [null as boolean | null],
    isPublished: [null as boolean | null],
    isDiscontinued: [null as boolean | null]
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

    const query: PublishStatusQuery = {
      keyword: filters.keyword || null,
      isDraft: filters.isDraft ?? null,
      isPublished: filters.isPublished ?? null,
      isDiscontinued: filters.isDiscontinued ?? null
    };

    this.publishStatusService.query(query).subscribe((statuses) => {
      this.statuses = statuses;
    });

    this.filterVisible = false;
  }

  resetFilters(): void {
    this.filterForm.reset({ keyword: '', isDraft: null, isPublished: null, isDiscontinued: null });
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
    this.router.navigate(['/publish-statuses/new']);
  }

  view(status: PublishStatus): void {
    this.router.navigate(['/publish-statuses', status.pkid]);
  }

  edit(status: PublishStatus): void {
    this.router.navigate(['/publish-statuses', status.pkid, 'edit']);
  }

  remove(status: PublishStatus): void {
    this.confirmationService.confirm({
      message: `確定要刪除主代碼 <b>${status.pkid}</b>「${status.description}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.publishStatusService.delete(status.pkid).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '刪除成功',
            detail: `發布狀態 ${status.description} 已刪除`
          });
          this.search();
        });
      }
    });
  }
}
