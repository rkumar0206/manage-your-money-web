import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  CategoryName,
  CategoryNameResponse,
  ExpenseCategory,
  ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdateRequest,
  SpringPage,
} from '../models/expense-category.model';

const PAGE_SIZE = 50;
const DEFAULT_SORT = 'modified,desc';

@Injectable({ providedIn: 'root' })
export class ExpenseCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/expense-categories';

  /**
   * Returns the first page of categories, unwrapped from Spring's `Page<T>`
   * envelope. `size` defaults to 50 — plenty for a personal finance app.
   */
  list(page = 0, size = PAGE_SIZE, sort = DEFAULT_SORT): Observable<ExpenseCategory[]> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);

    return this.http
      .get<SpringPage<ExpenseCategory>>(this.baseUrl, { params })
      .pipe(map((res) => res.content ?? []));
  }

  getById(id: number): Observable<ExpenseCategory> {
    return this.http.get<ExpenseCategory>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create is idempotent by name on the backend:
   *  - 201 → newly created
   *  - 200 → a category with the same name already existed and was returned
   * Both cases return the category; the status code is informational only.
   */
  create(payload: ExpenseCategoryCreateRequest): Observable<ExpenseCategory> {
    return this.http.post<ExpenseCategory>(this.baseUrl, payload);
  }

  update(id: number, payload: ExpenseCategoryUpdateRequest): Observable<ExpenseCategory> {
    return this.http.put<ExpenseCategory>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  search(
    name: string,
    page = 0,
    size = PAGE_SIZE,
    sort = DEFAULT_SORT,
  ): Observable<ExpenseCategory[]> {
    const params = new HttpParams()
      .set('name', name)
      .set('page', page)
      .set('size', size)
      .set('sort', sort);

    return this.http
      .get<SpringPage<ExpenseCategory>>(`${this.baseUrl}/search`, { params })
      .pipe(map((res) => res.content ?? []));
  }

  getNames(): Observable<CategoryName[]> {
    return this.http
      .get<CategoryNameResponse>(`${this.baseUrl}/names`)
      .pipe(map((res) => res.categories ?? []));
  }
}
