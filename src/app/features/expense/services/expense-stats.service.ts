import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryBreakdownResponseDTO,
  CategoryMonthlyStatsResponseDTO,
  CategoryStatsResponseDTO,
  DailyStatsResponseDTO,
  DateRangePreset,
  DayOfWeekStatsResponseDTO,
  ExpenseSummaryResponseDTO,
  PaymentMethodDistributionResponseDTO,
  TopVendorsResponseDTO,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseStatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/expenses/stats';

  // ---------------------------------------------------------------------------
  // Category detail page
  // ---------------------------------------------------------------------------

  getCategoryTotalForDateRange(
    categoryId: number,
    dateRangePreset: DateRangePreset,
    paymentMethods?: string[],
  ): Observable<CategoryStatsResponseDTO> {
    let params = new HttpParams()
      .set('categoryId', categoryId)
      .set('dateRangePreset', dateRangePreset);

    if (paymentMethods?.length) {
      for (const pm of paymentMethods) params = params.append('paymentMethods', pm);
    }

    return this.http.get<CategoryStatsResponseDTO>(`${this.baseUrl}/category-total`, { params });
  }

  getMonthlyTotalsForYear(
    year: number,
    categoryId?: number,
    paymentMethods?: string[],
  ): Observable<CategoryMonthlyStatsResponseDTO> {
    let params = new HttpParams().set('year', year);

    if (categoryId != null) params = params.set('categoryId', categoryId);
    if (paymentMethods?.length) {
      for (const pm of paymentMethods) params = params.append('paymentMethods', pm);
    }

    return this.http.get<CategoryMonthlyStatsResponseDTO>(`${this.baseUrl}/monthly`, { params });
  }

  // ---------------------------------------------------------------------------
  // Dashboard widgets
  // ---------------------------------------------------------------------------

  getCategoryBreakdown(
    dateRangePreset: DateRangePreset = 'ALL_TIME',
    topN?: number,
  ): Observable<CategoryBreakdownResponseDTO> {
    let params = new HttpParams().set('dateRangePreset', dateRangePreset);
    if (topN != null && topN > 0) params = params.set('topN', topN);

    return this.http.get<CategoryBreakdownResponseDTO>(`${this.baseUrl}/category-breakdown`, {
      params,
    });
  }

  getPaymentMethodDistribution(
    dateRangePreset: DateRangePreset = 'ALL_TIME',
  ): Observable<PaymentMethodDistributionResponseDTO> {
    const params = new HttpParams().set('dateRangePreset', dateRangePreset);
    return this.http.get<PaymentMethodDistributionResponseDTO>(`${this.baseUrl}/payment-methods`, {
      params,
    });
  }

  getDayOfWeekStats(
    dateRangePreset: DateRangePreset = 'ALL_TIME',
  ): Observable<DayOfWeekStatsResponseDTO> {
    const params = new HttpParams().set('dateRangePreset', dateRangePreset);
    return this.http.get<DayOfWeekStatsResponseDTO>(`${this.baseUrl}/day-of-week`, { params });
  }

  getTopVendors(
    dateRangePreset: DateRangePreset = 'ALL_TIME',
    limit = 5,
  ): Observable<TopVendorsResponseDTO> {
    const params = new HttpParams().set('dateRangePreset', dateRangePreset).set('limit', limit);
    return this.http.get<TopVendorsResponseDTO>(`${this.baseUrl}/top-vendors`, { params });
  }

  // ---------------------------------------------------------------------------
  // KPI summary
  // ---------------------------------------------------------------------------

  getSummary(dateRangePreset: DateRangePreset = 'ALL_TIME'): Observable<ExpenseSummaryResponseDTO> {
    const params = new HttpParams().set('dateRangePreset', dateRangePreset);
    return this.http.get<ExpenseSummaryResponseDTO>(`${this.baseUrl}/summary`, { params });
  }

  // ---------------------------------------------------------------------------
  // Daily heatmap
  // ---------------------------------------------------------------------------

  getDailyStats(year: number): Observable<DailyStatsResponseDTO> {
    const params = new HttpParams().set('year', year);
    return this.http.get<DailyStatsResponseDTO>(`${this.baseUrl}/daily`, { params });
  }
}
