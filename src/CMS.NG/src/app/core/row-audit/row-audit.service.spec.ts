import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { RowAuditService } from './row-audit.service';
import { RowAuditEntry } from './row-audit.model';

describe('RowAuditService', () => {
  let service: RowAuditService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/rowaudit`;

  const trail: RowAuditEntry[] = [
    { dateTime: '2026-06-04T14:30:00', userName: 'alice', actionType: 'Update', actionDesc: 'Title' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RowAuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getForRecord issues GET filtered by tableName and pkid', () => {
    service.getForRecord('Course', 123).subscribe((result) => expect(result).toEqual(trail));

    const req = httpMock.expectOne((r) => r.url === baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('tableName')).toBe('Course');
    expect(req.request.params.get('pkid')).toBe('123');
    req.flush(trail);
  });
});
