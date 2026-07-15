import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PublishStatusService } from '../publish-status.service';
import { PublishStatusRequest } from '../publish-status.model';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-publish-status-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, CheckboxModule, ToastModule, RowAuditBadge],
  providers: [MessageService],
  templateUrl: './publish-status-form.html',
  styleUrl: './publish-status-form.scss'
})
export class PublishStatusForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishStatusService = inject(PublishStatusService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  pkid: number | null = null;

  readonly form = this.fb.nonNullable.group({
    pkid: [null as number | null, Validators.required],
    description: ['', Validators.required],
    isDraft: [false],
    isPublished: [false],
    isDiscontinued: [false]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = idParam !== null;

    if (!this.isEdit) {
      return;
    }

    this.pkid = Number(idParam);
    this.publishStatusService.getById(this.pkid).subscribe((status) => {
      this.form.patchValue({
        pkid: status.pkid,
        description: status.description,
        isDraft: status.isDraft,
        isPublished: status.isPublished,
        isDiscontinued: status.isDiscontinued
      });
      this.form.controls.pkid.disable();
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: PublishStatusRequest = {
      pkid: value.pkid!,
      description: value.description,
      isDraft: value.isDraft,
      isPublished: value.isPublished,
      isDiscontinued: value.isDiscontinued
    };

    const save$ = this.isEdit
      ? this.publishStatusService.update(request)
      : this.publishStatusService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/publish-statuses', saved.pkid]);
      },
      error: (err: HttpErrorResponse) => {
        const summary = err.status === 409 ? '主代碼已存在' : '儲存失敗';
        this.messageService.add({ severity: 'error', summary });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.pkid !== null) {
      this.router.navigate(['/publish-statuses', this.pkid]);
    } else {
      this.router.navigate(['/publish-statuses']);
    }
  }
}
