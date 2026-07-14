import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Partner, PartnerQuery } from '../partner.model';
import { PartnerService } from '../partner.service';

const FILTERS_KEY = 'partner-list-filters';
const SORT_KEY = 'partner-list-sort';
const PAGE_KEY = 'partner-list-page';

@Component({
  selector: 'app-partner-list',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './partner-list.html',
  styleUrl: './partner-list.scss'
})
export class PartnerList implements OnInit {
  private readonly partnerService = inject(PartnerService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  partners: Partner[] = [];
  filterVisible = false;
  sortField = 'displayOrder';
  sortOrder = 1;
  first = 0;
  rows = 20;

  readonly filterForm = this.fb.nonNullable.group({
    keyword: ['']
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

    const query: PartnerQuery = {
      keyword: filters.keyword || null
    };

    this.partnerService.query(query).subscribe((partners) => {
      this.partners = partners;
    });

    this.filterVisible = false;
  }

  resetFilters(): void {
    this.filterForm.reset({ keyword: '' });
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
    this.router.navigate(['/partners/new']);
  }

  view(partner: Partner): void {
    this.router.navigate(['/partners', partner.pkid]);
  }

  edit(partner: Partner): void {
    this.router.navigate(['/partners', partner.pkid, 'edit']);
  }

  remove(partner: Partner): void {
    this.confirmationService.confirm({
      message: `確定要刪除主代碼 <b>${partner.pkid}</b>「${partner.name}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.partnerService.delete(partner.pkid).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '刪除成功',
            detail: `合作廠商 ${partner.name} 已刪除`
          });
          this.search();
        });
      }
    });
  }
}
