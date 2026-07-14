import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PartnerService } from '../partner.service';
import { Partner } from '../partner.model';

@Component({
  selector: 'app-partner-detail',
  imports: [ButtonModule],
  templateUrl: './partner-detail.html',
  styleUrl: './partner-detail.scss'
})
export class PartnerDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly partnerService = inject(PartnerService);

  partner: Partner | null = null;

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));

    this.partnerService.getById(pkid).subscribe((partner) => {
      this.partner = partner;
    });
  }

  edit(): void {
    if (this.partner) {
      this.router.navigate(['/partners', this.partner.pkid, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/partners']);
  }
}
