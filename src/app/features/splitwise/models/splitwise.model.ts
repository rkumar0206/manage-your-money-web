export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

// --- Requests ---
export interface CreateGroupRequest {
  name: string;
  description?: string;
  members: GroupMemberInput[];
}

export interface GroupMemberInput {
  userId?: number | null;
  name: string;
}

export interface CreateSplitExpenseRequest {
  description: string;
  amount: number;
  paidByMemberId: number;
  expenseDate: string; // ISO string
  splitType: SplitType;
  shares: SplitShareRequest[];
}

export interface SplitShareRequest {
  memberId: number;
  amount?: number; // null for EQUAL, amount for EXACT, percentage for PERCENTAGE
}

export interface CreateSettlementRequest {
  paidByMemberId: number;
  paidToMemberId: number;
  amount: number;
  settlementDate: string;
}

// --- Responses ---
export interface MemberDto {
  id: number;
  userId: number | null;
  name: string;
  isCreator: boolean;
}

export interface GroupResponse {
  id: number;
  name: string;
  description: string;
  createdByUserId: number;
  createdByUsername: string;
  created: string;
  members: MemberDto[];
}

export interface GroupSummaryResponse {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  totalSpent: number;
  userNetBalance: number;
}

export interface ShareDto {
  memberId: number;
  memberName: string;
  amount: number;
}

export interface SplitExpenseResponse {
  id: number;
  description: string;
  amount: number;
  paidByMemberId: number;
  paidByMemberName: string;
  expenseDate: string;
  shares: ShareDto[];
}

export interface MemberBalance {
  memberId: number;
  name: string;
  netBalance: number;
}

export interface SettlementTransaction {
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
}

export interface GroupBalancesResponse {
  groupId: number;
  memberBalances: MemberBalance[];
  suggestedSettlements: SettlementTransaction[];
}

export interface SettlementResponse {
  id: number;
  paidByMemberId: number;
  paidByMemberName: string;
  paidToMemberId: number;
  paidToMemberName: string;
  amount: number;
  settlementDate: string;
}

export interface UserSearchResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

export interface UpdateGroupRequest {
  name: string;
  description?: string;
}
