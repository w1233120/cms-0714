import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { RowAuditEntry } from './row-audit.model';

@Injectable({ providedIn: 'root' })
export class RowAuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rowaudit`;

  // A single record's full audit trail, newest first. tableName + pkid identify the record;
  // pkid is sent as a string so it works for both numeric pkids and string keys.
  getForRecord(tableName: string, pkid: number | string): Observable<RowAuditEntry[]> {
    const params = new HttpParams().set('tableName', tableName).set('pkid', String(pkid));
    return this.http.get<RowAuditEntry[]>(this.baseUrl, { params });
  }
}
