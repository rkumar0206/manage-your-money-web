import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateGroupRequest,
  CreateSettlementRequest,
  CreateSplitExpenseRequest,
  GroupBalancesResponse,
  GroupMemberInput,
  GroupResponse,
  GroupSummaryResponse,
  SettlementResponse,
  SplitExpenseResponse,
  UpdateGroupRequest,
  UserSearchResponse,
} from '../models/splitwise.model';

@Injectable({ providedIn: 'root' })
export class SplitwiseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/split-expenses';
  private readonly userBaseUrl = '/api/v1/users';

  // --- Groups ---
  createGroup(request: CreateGroupRequest): Observable<GroupResponse> {
    return this.http.post<GroupResponse>(`${this.baseUrl}/groups`, request);
  }

  getGroups(): Observable<GroupSummaryResponse[]> {
    return this.http.get<GroupSummaryResponse[]>(`${this.baseUrl}/groups`);
  }

  getGroupDetails(groupId: number): Observable<GroupResponse> {
    return this.http.get<GroupResponse>(`${this.baseUrl}/groups/${groupId}`);
  }

  // --- Expenses ---
  addExpense(
    groupId: number,
    request: CreateSplitExpenseRequest,
  ): Observable<SplitExpenseResponse> {
    return this.http.post<SplitExpenseResponse>(
      `${this.baseUrl}/groups/${groupId}/expenses`,
      request,
    );
  }

  getExpenses(groupId: number): Observable<SplitExpenseResponse[]> {
    return this.http.get<SplitExpenseResponse[]>(`${this.baseUrl}/groups/${groupId}/expenses`);
  }

  // --- Balances ---
  getBalances(groupId: number): Observable<GroupBalancesResponse> {
    return this.http.get<GroupBalancesResponse>(`${this.baseUrl}/groups/${groupId}/balances`);
  }

  // --- Settlements ---
  addSettlement(groupId: number, request: CreateSettlementRequest): Observable<SettlementResponse> {
    return this.http.post<SettlementResponse>(
      `${this.baseUrl}/groups/${groupId}/settlements`,
      request,
    );
  }

  getSettlements(groupId: number): Observable<SettlementResponse[]> {
    return this.http.get<SettlementResponse[]>(`${this.baseUrl}/groups/${groupId}/settlements`);
  }

  deleteSettlement(groupId: number, settlementId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}/settlements/${settlementId}`);
  }

  // --- User Search (for adding friends) ---
  searchUsers(query: string): Observable<UserSearchResponse[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<UserSearchResponse[]>(`${this.userBaseUrl}/search`, { params });
  }

  updateGroup(groupId: number, request: UpdateGroupRequest): Observable<GroupResponse> {
    return this.http.put<GroupResponse>(`${this.baseUrl}/groups/${groupId}`, request);
  }

  deleteGroup(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}`);
  }

  // inside splitwise.service.ts
  addMembers(groupId: number, members: GroupMemberInput[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/members`, { members });
  }

  removeMember(groupId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}/members/${memberId}`);
  }

  updateExpense(
    groupId: number,
    expenseId: number,
    request: CreateSplitExpenseRequest,
  ): Observable<SplitExpenseResponse> {
    return this.http.put<SplitExpenseResponse>(
      `${this.baseUrl}/groups/${groupId}/expenses/${expenseId}`,
      request,
    );
  }

  deleteExpense(groupId: number, expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}/expenses/${expenseId}`);
  }
}
