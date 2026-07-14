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
import { CourseGroup, CourseGroupQuery } from '../course-group.model';
import { CourseGroupService } from '../course-group.service';

const FILTERS_KEY = 'course-group-list-filters';
const SORT_KEY = 'course-group-list-sort';
const PAGE_KEY = 'course-group-list-page';

@Component({
  selector: 'app-course-group-list',
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
  templateUrl: './course-group-list.html',
  styleUrl: './course-group-list.scss'
})
export class CourseGroupList implements OnInit {
  private readonly courseGroupService = inject(CourseGroupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  courseGroups: CourseGroup[] = [];
  filterVisible = false;
  sortField = 'pkid';
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

    const query: CourseGroupQuery = {
      keyword: filters.keyword || null
    };

    this.courseGroupService.query(query).subscribe((courseGroups) => {
      this.courseGroups = courseGroups;
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
    this.router.navigate(['/course-groups/new']);
  }

  view(courseGroup: CourseGroup): void {
    this.router.navigate(['/course-groups', courseGroup.pkid]);
  }

  edit(courseGroup: CourseGroup): void {
    this.router.navigate(['/course-groups', courseGroup.pkid, 'edit']);
  }

  remove(courseGroup: CourseGroup): void {
    this.confirmationService.confirm({
      // FK_Course_CourseGroup cascades, so the courses in this group go with it — say so.
      message:
        `確定要刪除主代碼 <b>${courseGroup.pkid}</b>「${courseGroup.description}」？` +
        '<br>該群組底下的課程將一併刪除。',
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.courseGroupService.delete(courseGroup.pkid).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '刪除成功',
            detail: `課程群組 ${courseGroup.description} 已刪除`
          });
          this.search();
        });
      }
    });
  }
}
