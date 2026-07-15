import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Course, CourseQuery, CourseRequest } from '../course.model';
import { CourseService } from '../course.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import {
  CourseGroupLookup,
  PartnerLookup,
  PublishStatusLookup
} from '../../../core/lookups/lookup.model';
import { toIsoDate, parseIsoDate } from '../date.util';
import { Autofocus } from '../autofocus.directive';

const FILTERS_KEY = 'course-list-filters';
const SORT_KEY = 'course-list-sort';
const PAGE_KEY = 'course-list-page';

// Columns editable inline. 主代碼 (pkid), 原廠 (partnerName) and 課程群組
// (courseGroupDescription) are deliberately excluded — PK and FK-label columns stay read-only.
export type EditableField =
  | 'displayOrder'
  | 'courseId'
  | 'prodCourseId'
  | 'title'
  | 'publishStatusPkid'
  | 'scheduleOn'
  | 'scheduleOff'
  | 'hour'
  | 'listPrice'
  | 'learningCredit'
  | 'canRepeat';

const EDITABLE_FIELDS: ReadonlySet<string> = new Set<EditableField>([
  'displayOrder',
  'courseId',
  'prodCourseId',
  'title',
  'publishStatusPkid',
  'scheduleOn',
  'scheduleOff',
  'hour',
  'listPrice',
  'learningCredit',
  'canRepeat'
]);

@Component({
  selector: 'app-course-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    DatePickerModule,
    ConfirmDialogModule,
    ToastModule,
    Autofocus
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss'
})
export class CourseList implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly lookupService = inject(LookupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  courses: Course[] = [];
  partners: PartnerLookup[] = [];
  courseGroups: CourseGroupLookup[] = [];
  publishStatuses: PublishStatusLookup[] = [];

  filterVisible = false;
  sortField = 'displayOrder';
  sortOrder = 1;
  first = 0;
  rows = 20;

  // Inline-edit state: which cell is open, the editor's working value, and any inline error.
  // editValue is intentionally `any` — one field backs editors of every type (text/number/date/select/checkbox).
  editing: { pkid: number; field: EditableField } | null = null;
  editValue: any = null;
  editError: string | null = null;
  private saving = false;

  readonly flagOptions = [
    { value: null, label: '全部' },
    { value: true, label: '是' },
    { value: false, label: '否' }
  ];

  readonly filterForm = this.fb.nonNullable.group({
    keyword: [''],
    partnerPkid: [null as number | null],
    courseGroupPkid: [null as number | null],
    publishStatusPkid: [null as number | null],
    scheduleOnFrom: [null as Date | null],
    scheduleOnTo: [null as Date | null],
    scheduleOffFrom: [null as Date | null],
    scheduleOffTo: [null as Date | null],
    canRepeat: [null as boolean | null]
  });

  get partnerOptions(): { value: number; label: string }[] {
    return this.partners.map((p) => ({ value: p.pkid, label: p.name }));
  }

  get courseGroupOptions(): { value: number; label: string }[] {
    return this.courseGroups.map((g) => ({ value: g.pkid, label: g.description }));
  }

  get publishStatusOptions(): { value: number; label: string }[] {
    return this.publishStatuses.map((s) => ({ value: s.pkid, label: s.description }));
  }

  ngOnInit(): void {
    // Filters depend on lookups (dropdown values), so restore after they resolve.
    forkJoin({
      partners: this.lookupService.getPartners(),
      courseGroups: this.lookupService.getCourseGroups(),
      publishStatuses: this.lookupService.getPublishStatuses()
    }).subscribe(({ partners, courseGroups, publishStatuses }) => {
      this.partners = partners;
      this.courseGroups = courseGroups;
      this.publishStatuses = publishStatuses;
      this.restoreState();
      this.search();
    });
  }

  private restoreState(): void {
    const savedFilters = sessionStorage.getItem(FILTERS_KEY);
    if (savedFilters) {
      const f = JSON.parse(savedFilters);
      this.filterForm.patchValue({
        keyword: f.keyword ?? '',
        partnerPkid: f.partnerPkid ?? null,
        courseGroupPkid: f.courseGroupPkid ?? null,
        publishStatusPkid: f.publishStatusPkid ?? null,
        scheduleOnFrom: parseIsoDate(f.scheduleOnFrom),
        scheduleOnTo: parseIsoDate(f.scheduleOnTo),
        scheduleOffFrom: parseIsoDate(f.scheduleOffFrom),
        scheduleOffTo: parseIsoDate(f.scheduleOffTo),
        canRepeat: f.canRepeat ?? null
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
    this.cancelEdit();
    const filters = this.filterForm.getRawValue();

    const query: CourseQuery = {
      keyword: filters.keyword || null,
      partnerPkid: filters.partnerPkid ?? null,
      courseGroupPkid: filters.courseGroupPkid ?? null,
      publishStatusPkid: filters.publishStatusPkid ?? null,
      scheduleOnFrom: toIsoDate(filters.scheduleOnFrom),
      scheduleOnTo: toIsoDate(filters.scheduleOnTo),
      scheduleOffFrom: toIsoDate(filters.scheduleOffFrom),
      scheduleOffTo: toIsoDate(filters.scheduleOffTo),
      canRepeat: filters.canRepeat ?? null
    };

    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ ...filters, ...query }));

    this.courseService.query(query).subscribe((courses) => {
      this.courses = courses;
    });

    this.filterVisible = false;
  }

  resetFilters(): void {
    this.filterForm.reset({
      keyword: '',
      partnerPkid: null,
      courseGroupPkid: null,
      publishStatusPkid: null,
      scheduleOnFrom: null,
      scheduleOnTo: null,
      scheduleOffFrom: null,
      scheduleOffTo: null,
      canRepeat: null
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

  // ---- Inline editing -------------------------------------------------------

  isEditable(field: string): boolean {
    return EDITABLE_FIELDS.has(field);
  }

  isEditing(course: Course, field: EditableField): boolean {
    return this.editing !== null && this.editing.pkid === course.pkid && this.editing.field === field;
  }

  // Double-click handler. Read-only columns pass an ineligible field and are ignored.
  startEdit(course: Course, field: string): void {
    if (!this.isEditable(field)) {
      return;
    }

    const key = field as EditableField;
    this.editing = { pkid: course.pkid, field: key };
    this.editError = null;

    if (key === 'scheduleOn') {
      this.editValue = parseIsoDate(course.scheduleOn);
    } else if (key === 'scheduleOff') {
      this.editValue = parseIsoDate(course.scheduleOff);
    } else {
      this.editValue = course[key] as string | number | boolean;
    }
  }

  cancelEdit(): void {
    this.editing = null;
    this.editError = null;
  }

  // Called on editor blur / change. Validates, then persists via the update endpoint.
  commit(course: Course, field: EditableField): void {
    if (!this.isEditing(course, field) || this.saving) {
      return;
    }

    const error = this.validate(field, this.editValue, course);
    if (error) {
      // Keep the cell in edit mode and show the inline error; do not call the server.
      this.editError = error;
      return;
    }

    const request = this.toRequest(course);
    this.applyEdit(request, field, this.editValue);

    this.saving = true;
    this.courseService.update(request).subscribe({
      next: (updated) => {
        this.courses = this.courses.map((c) => (c.pkid === course.pkid ? updated : c));
        this.editing = null;
        this.editError = null;
        this.saving = false;
      },
      error: () => {
        // Revert: the row was never mutated, so exit edit mode showing the previous value.
        this.editing = null;
        this.editError = null;
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: '儲存失敗，已還原' });
      }
    });
  }

  private validate(field: EditableField, value: unknown, course: Course): string | null {
    switch (field) {
      case 'title':
      case 'courseId':
      case 'prodCourseId':
        return typeof value === 'string' && value.trim().length > 0 ? null : '此欄位為必填';

      case 'displayOrder':
        return typeof value === 'number' && Number.isFinite(value) ? null : '請輸入有效數字';

      case 'hour':
      case 'listPrice':
      case 'learningCredit':
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? null : '請輸入非負數字';

      case 'publishStatusPkid':
        return value === null || value === undefined ? '請選擇上架狀態' : null;

      case 'scheduleOn': {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
          return '請輸入有效日期';
        }
        const off = parseIsoDate(course.scheduleOff);
        return off && value > off ? '上架日期不可晚於下架日期' : null;
      }

      case 'scheduleOff': {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
          return '請輸入有效日期';
        }
        const on = parseIsoDate(course.scheduleOn);
        return on && value < on ? '下架日期不可早於上架日期' : null;
      }

      case 'canRepeat':
        return null;
    }
  }

  private applyEdit(request: CourseRequest, field: EditableField, value: unknown): void {
    if (field === 'scheduleOn') {
      request.scheduleOn = toIsoDate(value as Date)!;
    } else if (field === 'scheduleOff') {
      request.scheduleOff = toIsoDate(value as Date)!;
    } else {
      (request as unknown as Record<string, unknown>)[field] = value;
    }
  }

  private toRequest(course: Course): CourseRequest {
    return {
      pkid: course.pkid,
      title: course.title,
      officialTitle: course.officialTitle ?? null,
      courseId: course.courseId,
      prodCourseId: course.prodCourseId,
      friendlyUrl: course.friendlyUrl,
      displayOrder: course.displayOrder,
      partnerPkid: course.partnerPkid,
      courseGroupPkid: course.courseGroupPkid ?? null,
      publishStatusPkid: course.publishStatusPkid,
      scheduleOn: course.scheduleOn,
      scheduleOff: course.scheduleOff,
      hour: course.hour,
      listPrice: course.listPrice,
      learningCredit: course.learningCredit,
      material: course.material ?? null,
      objective: course.objective ?? null,
      target: course.target ?? null,
      prerequisites: course.prerequisites ?? null,
      outline: course.outline ?? null,
      towardCertOrExam: course.towardCertOrExam ?? null,
      note: course.note ?? null,
      otherInfo: course.otherInfo ?? null,
      canRepeat: course.canRepeat
    };
  }

  // ---- Row actions ----------------------------------------------------------

  addNew(): void {
    this.router.navigate(['/courses/new']);
  }

  view(course: Course): void {
    this.router.navigate(['/courses', course.pkid]);
  }

  edit(course: Course): void {
    this.router.navigate(['/courses', course.pkid, 'edit']);
  }

  remove(course: Course): void {
    this.confirmationService.confirm({
      message: `確定要刪除主代碼 <b>${course.pkid}</b>「${course.courseId}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.courseService.delete(course.pkid).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: '刪除成功',
            detail: `課程 ${course.courseId} 已刪除`
          });
          this.search();
        });
      }
    });
  }
}
