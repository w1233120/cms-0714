import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PublishStatusService } from '../publish-status.service';
import { PublishStatus } from '../publish-status.model';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-publish-status-detail',
  imports: [ButtonModule, RowAuditBadge],
  templateUrl: './publish-status-detail.html',
  styleUrl: './publish-status-detail.scss'
})
export class PublishStatusDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishStatusService = inject(PublishStatusService);

  status: PublishStatus | null = null;

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));

    this.publishStatusService.getById(pkid).subscribe((status) => {
      this.status = status;
    });
  }

  edit(): void {
    if (this.status) {
      this.router.navigate(['/publish-statuses', this.status.pkid, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/publish-statuses']);
  }
}
