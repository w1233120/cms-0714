import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CourseService } from '../course.service';
import { CourseRequest } from '../course.model';
import { LookupService } from '../../../core/lookups/lookup.service';
import {
  CourseGroupLookup,
  PartnerLookup,
  PublishStatusLookup
} from '../../../core/lookups/lookup.model';
import { toIsoDate, parseIsoDate } from '../date.util';

@Component({
  selector: 'app-course-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './course-form.html',
  styleUrl: './course-form.scss'
})
export class CourseForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseService);
  private readonly lookupService = inject(LookupService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  // pkid is IDENTITY — held here and folded into the request on save.
  pkid: number | null = null;

  partners: PartnerLookup[] = [];
  courseGroups: CourseGroupLookup[] = [];
  publishStatuses: PublishStatusLookup[] = [];

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    officialTitle: [null as string | null],
    courseId: ['', Validators.required],
    prodCourseId: ['', Validators.required],
    friendlyUrl: ['', Validators.required],
    displayOrder: [0, Validators.required],
    partnerPkid: [null as number | null, Validators.required],
    courseGroupPkid: [null as number | null],
    publishStatusPkid: [null as number | null, Validators.required],
    scheduleOn: [null as Date | null, Validators.required],
    scheduleOff: [null as Date | null, Validators.required],
    hour: [0, Validators.required],
    listPrice: [0, Validators.required],
    learningCredit: [0, Validators.required],
    material: [null as string | null],
    objective: [null as string | null],
    target: [null as string | null],
    prerequisites: [null as string | null],
    outline: [null as string | null],
    towardCertOrExam: [null as string | null],
    note: [null as string | null],
    otherInfo: [null as string | null],
    canRepeat: [false]
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
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = idParam !== null;
    this.pkid = this.isEdit ? Number(idParam) : null;

    forkJoin({
      partners: this.lookupService.getPartners(),
      courseGroups: this.lookupService.getCourseGroups(),
      publishStatuses: this.lookupService.getPublishStatuses(),
      course: this.isEdit ? this.courseService.getById(this.pkid!) : of(null)
    }).subscribe(({ partners, courseGroups, publishStatuses, course }) => {
      this.partners = partners;
      this.courseGroups = courseGroups;
      this.publishStatuses = publishStatuses;

      if (course) {
        this.form.patchValue({
          title: course.title,
          officialTitle: course.officialTitle ?? null,
          courseId: course.courseId,
          prodCourseId: course.prodCourseId,
          friendlyUrl: course.friendlyUrl,
          displayOrder: course.displayOrder,
          partnerPkid: course.partnerPkid,
          courseGroupPkid: course.courseGroupPkid ?? null,
          publishStatusPkid: course.publishStatusPkid,
          scheduleOn: parseIsoDate(course.scheduleOn),
          scheduleOff: parseIsoDate(course.scheduleOff),
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
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CourseRequest = {
      pkid: this.pkid ?? 0,
      title: value.title,
      officialTitle: value.officialTitle || null,
      courseId: value.courseId,
      prodCourseId: value.prodCourseId,
      friendlyUrl: value.friendlyUrl,
      displayOrder: value.displayOrder,
      partnerPkid: value.partnerPkid!,
      courseGroupPkid: value.courseGroupPkid ?? null,
      publishStatusPkid: value.publishStatusPkid!,
      scheduleOn: toIsoDate(value.scheduleOn)!,
      scheduleOff: toIsoDate(value.scheduleOff)!,
      hour: value.hour,
      listPrice: value.listPrice,
      learningCredit: value.learningCredit,
      material: value.material || null,
      objective: value.objective || null,
      target: value.target || null,
      prerequisites: value.prerequisites || null,
      outline: value.outline || null,
      towardCertOrExam: value.towardCertOrExam || null,
      note: value.note || null,
      otherInfo: value.otherInfo || null,
      canRepeat: value.canRepeat
    };

    const save$ = this.isEdit ? this.courseService.update(request) : this.courseService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/courses', saved.pkid]);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '儲存失敗' });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.pkid !== null) {
      this.router.navigate(['/courses', this.pkid]);
    } else {
      this.router.navigate(['/courses']);
    }
  }
}
