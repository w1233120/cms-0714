import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CourseService } from '../course.service';
import { Course } from '../course.model';
import { CourseQrCode } from '../course-qr-code/course-qr-code';
import { RowAuditBadge } from '../../../core/row-audit/row-audit-badge';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, ButtonModule, CourseQrCode, RowAuditBadge],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss'
})
export class CourseDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseService);

  course: Course | null = null;

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));

    this.courseService.getById(pkid).subscribe((course) => {
      this.course = course;
    });
  }

  edit(): void {
    if (this.course) {
      this.router.navigate(['/courses', this.course.pkid, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/courses']);
  }
}
