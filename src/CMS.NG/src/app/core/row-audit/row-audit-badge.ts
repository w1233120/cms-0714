import { Component, Input, OnChanges, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RowAuditService } from './row-audit.service';
import { RowAuditEntry } from './row-audit.model';

// Reusable audit-history badge for a single record. Drop it in a detail/form toolbar with
// [tableName] and [pkid]: it fetches that record's RowAudit trail, shows the most recent
// change inline so it is visible without a click, and opens a dialog listing the full trail
// (newest first) when clicked. An unsaved record (no pkid) shows a neutral "no history" state.
@Component({
  selector: 'app-row-audit-badge',
  imports: [DatePipe, ButtonModule, DialogModule],
  templateUrl: './row-audit-badge.html',
  styleUrl: './row-audit-badge.scss'
})
export class RowAuditBadge implements OnChanges {
  private readonly rowAuditService = inject(RowAuditService);

  @Input() tableName = '';
  @Input() pkid: number | string = 0;

  entries: RowAuditEntry[] = [];
  loading = false;
  dialogVisible = false;

  // The trail is newest-first, so the first entry is the most recent change (null when empty).
  get latest(): RowAuditEntry | null {
    return this.entries[0] ?? null;
  }

  // Reload whenever the host binds a different record (or the record first becomes available).
  ngOnChanges(): void {
    this.load();
  }

  open(): void {
    this.dialogVisible = true;
  }

  private load(): void {
    // An unsaved record (no pkid yet) has no history to fetch.
    if (!this.tableName || !this.pkid) {
      this.entries = [];
      return;
    }

    this.loading = true;
    this.rowAuditService.getForRecord(this.tableName, this.pkid).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.loading = false;
      },
      error: () => {
        this.entries = [];
        this.loading = false;
      }
    });
  }
}
