import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DateRangePreset,
  Expense,
  ExpenseCreateRequest,
  ExpenseSearchRequest,
  ExpenseUpdateRequest,
  SpringPage,
} from '../models/expense.model';

const PAGE_SIZE = 50;
const DEFAULT_SORT = 'modified,desc';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/expenses';

  // ---------------------------------------------------------------------------
  // Search + aggregate
  // ---------------------------------------------------------------------------

  /**
   * POST /api/v1/expenses/search?page=&size=&sort=
   * Empty criteria `{}` returns all expenses for the current user.
   */
  search(
    criteria: ExpenseSearchRequest,
    page = 0,
    size = PAGE_SIZE,
    sort = DEFAULT_SORT,
  ): Observable<SpringPage<Expense>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);

    return this.http.post<SpringPage<Expense>>(`${this.baseUrl}/search`, criteria, { params });
  }

  /**
   * POST /api/v1/expenses/search/total
   * Returns the aggregate amount for the same criteria.
   */
  searchTotal(criteria: ExpenseSearchRequest): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}/search/total`, criteria);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  getById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.baseUrl}/${id}`);
  }

  create(payload: ExpenseCreateRequest): Observable<Expense> {
    return this.http.post<Expense>(this.baseUrl, payload);
  }

  update(id: number, payload: ExpenseUpdateRequest): Observable<Expense> {
    return this.http.put<Expense>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ---------------------------------------------------------------------------
  // Meta
  // ---------------------------------------------------------------------------

  distinctPaymentMethods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/payment-methods`);
  }

  getTotalAmountSpentByUserId(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/total`);
  }

  getTotalAmountSpentByCategoryId(categoryId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/total/by-category/${categoryId}`);
  }
}
