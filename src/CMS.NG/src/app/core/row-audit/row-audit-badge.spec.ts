import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { RowAuditBadge } from './row-audit-badge';
import { RowAuditService } from './row-audit.service';
import { RowAuditEntry } from './row-audit.model';

describe('RowAuditBadge', () => {
  let component: RowAuditBadge;
  let fixture: ComponentFixture<RowAuditBadge>;
  let rowAuditServiceSpy: jasmine.SpyObj<RowAuditService>;

  // Newest first, as the endpoint returns them.
  const trail: RowAuditEntry[] = [
    { dateTime: '2026-06-04T14:30:00', userName: 'alice', actionType: 'Update', actionDesc: 'Title' },
    { dateTime: '2026-06-01T09:00:00', userName: 'bob', actionType: 'Insert', actionDesc: 'AI-101' }
  ];

  async function setup(entries: RowAuditEntry[]): Promise<void> {
    rowAuditServiceSpy = jasmine.createSpyObj('RowAuditService', ['getForRecord']);
    rowAuditServiceSpy.getForRecord.and.returnValue(of(entries));

    await TestBed.configureTestingModule({
      imports: [RowAuditBadge],
      providers: [
        provideNoopAnimations(),
        { provide: RowAuditService, useValue: rowAuditServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RowAuditBadge);
    component = fixture.componentInstance;
    // Binding the inputs triggers ngOnChanges → the history fetch.
    fixture.componentRef.setInput('tableName', 'Course');
    fixture.componentRef.setInput('pkid', 123);
    fixture.detectChanges();
  }

  function badgeSummary(): string {
    const host = fixture.nativeElement as HTMLElement;
    return host.querySelector('.row-audit-badge__summary')?.textContent?.trim() ?? '';
  }

  it('fetches this record history on load using tableName and pkid', async () => {
    await setup(trail);

    expect(rowAuditServiceSpy.getForRecord).toHaveBeenCalledWith('Course', 123);
  });

  it('shows the most recent audit record inline on the badge', async () => {
    await setup(trail);

    expect(component.latest).toEqual(trail[0]);
    const summary = badgeSummary();
    expect(summary).toContain('Update');
    expect(summary).toContain('alice');
    // The formatted timestamp of the newest change is shown.
    expect(summary).toContain('2026/06/04');
  });

  it('opens a dialog listing the full trail newest first when clicked', async () => {
    await setup(trail);

    component.open();
    fixture.detectChanges();

    expect(component.dialogVisible).toBeTrue();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.row-audit-table tbody tr');
    expect(rows.length).toBe(2);
    // Newest first: the first row is alice's Update.
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('Update');
    expect(rows[1].textContent).toContain('bob');
  });

  it('renders a neutral no-history state when there is no history', async () => {
    await setup([]);

    expect(component.latest).toBeNull();
    expect(badgeSummary()).toContain('no history');

    component.open();
    fixture.detectChanges();

    const empty = (fixture.nativeElement as HTMLElement).querySelector('.row-audit-empty');
    expect(empty?.textContent).toContain('no history yet');
  });
});
