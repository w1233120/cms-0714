import { Component, Input, OnChanges, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import QRCode from 'qrcode';

// QR code for a course's public detail URL, shown in the 基本資料 card.
// Encodes https://www.uuu.com.tw/Course/Show/{pkid}/{CourseId}; the title is the CourseId.
@Component({
  selector: 'app-course-qr-code',
  imports: [ButtonModule],
  templateUrl: './course-qr-code.html',
  styleUrl: './course-qr-code.scss'
})
export class CourseQrCode implements OnChanges {
  private readonly document = inject(DOCUMENT);

  private static readonly BASE_URL = 'https://www.uuu.com.tw/Course/Show';

  @Input() pkid = 0;
  @Input() courseId = '';

  // The generated QR image as a PNG data URL — used both for display and for download.
  qrDataUrl = '';

  // The URL the QR code encodes.
  get targetUrl(): string {
    return `${CourseQrCode.BASE_URL}/${this.pkid}/${this.courseId}`;
  }

  // Displayed above the QR image.
  get title(): string {
    return this.courseId;
  }

  ngOnChanges(): void {
    void this.generate();
  }

  async generate(): Promise<void> {
    if (!this.pkid || !this.courseId) {
      this.qrDataUrl = '';
      return;
    }

    try {
      this.qrDataUrl = await QRCode.toDataURL(this.targetUrl, { width: 220, margin: 1 });
    } catch {
      this.qrDataUrl = '';
    }
  }

  // Save the generated QR image to a file named after the CourseId.
  download(): void {
    if (!this.qrDataUrl) {
      return;
    }

    const link = this.document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.courseId}.png`;
    link.click();
  }
}
