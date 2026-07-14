import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PartnerService } from '../partner.service';
import { PartnerRequest } from '../partner.model';

@Component({
  selector: 'app-partner-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './partner-form.html',
  styleUrl: './partner-form.scss'
})
export class PartnerForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly partnerService = inject(PartnerService);
  private readonly messageService = inject(MessageService);

  isEdit = false;
  // pkid is IDENTITY, so it is never a form control — it is held here and folded into the request on save.
  pkid: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    appKey: ['', Validators.required],
    nameOnPartnerMenu: ['', Validators.required],
    nameOnCourseDetailPage: ['', Validators.required],
    displayOrder: [0, Validators.required],
    imageFilename: [null as string | null]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = idParam !== null;

    if (!this.isEdit) {
      return;
    }

    this.pkid = Number(idParam);
    this.partnerService.getById(this.pkid).subscribe((partner) => {
      this.form.patchValue({
        name: partner.name,
        appKey: partner.appKey,
        nameOnPartnerMenu: partner.nameOnPartnerMenu,
        nameOnCourseDetailPage: partner.nameOnCourseDetailPage,
        displayOrder: partner.displayOrder,
        imageFilename: partner.imageFilename ?? null
      });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: PartnerRequest = {
      pkid: this.pkid ?? 0,
      name: value.name,
      appKey: value.appKey,
      nameOnPartnerMenu: value.nameOnPartnerMenu,
      nameOnCourseDetailPage: value.nameOnCourseDetailPage,
      displayOrder: value.displayOrder,
      imageFilename: value.imageFilename || null
    };

    const save$ = this.isEdit ? this.partnerService.update(request) : this.partnerService.create(request);

    save$.subscribe({
      next: (saved) => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.router.navigate(['/partners', saved.pkid]);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '儲存失敗' });
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.pkid !== null) {
      this.router.navigate(['/partners', this.pkid]);
    } else {
      this.router.navigate(['/partners']);
    }
  }
}
