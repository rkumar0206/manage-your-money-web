import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataTransferService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /**
   * Triggers an async export. Backend responds 202 Accepted immediately;
   * the actual file is emailed to the given address once ready.
   */
  requestExport(email: string): Observable<void> {
    const params = new HttpParams().set('email', email);
    return this.http.post<void>(`${this.baseUrl}/export`, null, { params });
  }

  /**
   * Uploads a backup file. Multipart/form-data — Angular sets the boundary
   * automatically when the body is a FormData instance.
   */
  importData(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<void>(`${this.baseUrl}/import`, formData);
  }
}
