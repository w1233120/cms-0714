import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CourseGroupService } from '../course-group.service';
import { CourseGroup } from '../course-group.model';

@Component({
  selector: 'app-course-group-detail',
  imports: [ButtonModule],
  templateUrl: './course-group-detail.html',
  styleUrl: './course-group-detail.scss'
})
export class CourseGroupDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseGroupService = inject(CourseGroupService);

  courseGroup: CourseGroup | null = null;

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));

    this.courseGroupService.getById(pkid).subscribe((courseGroup) => {
      this.courseGroup = courseGroup;
    });
  }

  edit(): void {
    if (this.courseGroup) {
      this.router.navigate(['/course-groups', this.courseGroup.pkid, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/course-groups']);
  }
}
