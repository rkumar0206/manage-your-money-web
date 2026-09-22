import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UnsplashUrls } from '../models/image.model';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/images/search';

  search(keyword: string, page = 1, limit = 10): Observable<UnsplashUrls[]> {
    const params = new HttpParams().set('keyword', keyword).set('page', page).set('limit', limit);

    return this.http.get<UnsplashUrls[]>(this.baseUrl, { params });
  }
}
