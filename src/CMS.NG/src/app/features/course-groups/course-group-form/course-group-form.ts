import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CourseGroupService } from '../course-group.service';
import { CourseGroupRequest } from '../course-group.model';

@Component({
  selector: 'app-course-group-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './course-group-form.html',
  styleUrl: './course-group-form.scss'
})
export class CourseGroupForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseGroupService = inject(CourseGroupService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  // pkid is IDENTITY, so it is never a form control — it is held here and folded into the request on save.
  pkid: number | null = null;

  readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = idParam !== null;

    if (!this.isEdit) {
      return;
    }

    this.pkid = Number(idParam);
    this.courseGroupService.getById(this.pkid).subscribe((courseGroup) => {
      this.form.patchValue({
        description: courseGroup.description
      });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CourseGroupRequest = {
      pkid: this.pkid ?? 0,
      description: value.description
    };

    const save$ = this.isEdit
      ? this.courseGroupService.update(request)
      : this.courseGroupService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/course-groups', saved.pkid]);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '儲存失敗' });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.pkid !== null) {
      this.router.navigate(['/course-groups', this.pkid]);
    } else {
      this.router.navigate(['/course-groups']);
    }
  }
}
