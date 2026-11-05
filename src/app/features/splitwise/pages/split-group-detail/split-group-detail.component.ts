import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import {
  GroupBalancesResponse,
  GroupResponse,
  SettlementResponse,
  SettlementTransaction,
  SplitExpenseResponse,
} from '../../models/splitwise.model';
import { AddExpenseDialogComponent } from '../../components/add-expense-dialog/add-expense-dialog.component';
import { EditGroupDialogComponent } from '../../components/edit-group-dialog/edit-group-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AddMemberDialogComponent } from '../../components/add-member-dialog/add-member-dialog.component';
import { SettleUpDialogComponent } from '../../components/settle-up-dialog/settle-up-dialog.component';
import { SplitReportModalComponent } from '../../components/split-report-modal/split-report-modal.component';

@Component({
  selector: 'app-split-group-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AddExpenseDialogComponent,
    EditGroupDialogComponent,
    ConfirmDialogComponent,
    AddMemberDialogComponent,
    SettleUpDialogComponent,
    SplitReportModalComponent,
  ],
  templateUrl: './split-group-detail.component.html',
  styleUrl: './split-group-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitGroupDetailComponent {
  private readonly splitwiseService = inject(SplitwiseService);
  private readonly router = inject(Router);
  private readonly eRef = inject(ElementRef);

  protected readonly isReportOpen = signal(false);

  protected readonly selectedMemberId = signal<number | null>(null);

  protected readonly expenseToEdit = signal<SplitExpenseResponse | null>(null);
  protected readonly expenseToDelete = signal<SplitExpenseResponse | null>(null);
  protected readonly isDeletingExpense = signal(false);

  protected readonly openExpenseMenuId = signal<number | null>(null);

  readonly id = input.required<string>();

  protected readonly group = signal<GroupResponse | null>(null);
  protected readonly balances = signal<GroupBalancesResponse | null>(null);
  protected readonly expenses = signal<SplitExpenseResponse[]>([]);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copySuccess = signal(false);
  protected readonly isAddMemberOpen = signal(false);

  // Dialog State
  protected readonly isAddExpenseOpen = signal(false);
  protected readonly isEditGroupOpen = signal(false);
  protected readonly isDeleteGroupOpen = signal(false);
  protected readonly isDeletingGroup = signal(false);

  // Menu State
  protected readonly menuOpen = signal(false);

  protected readonly settlements = signal<SettlementResponse[]>([]);
  protected readonly activeSettlement = signal<SettlementTransaction | null>(null);
  protected readonly settlementToDelete = signal<SettlementResponse | null>(null);
  protected readonly isDeletingSettlement = signal(false);

  // Permissions
  protected readonly isCreator = computed(() => {
    const g = this.group();
    // You'd ideally compare against the logged-in user ID here.
    // Assuming the backend returns `createdByUserId` in GroupResponse:
    return g?.createdByUserId === 1; // Replace 1 with AuthService.getUserId()
  });

  constructor() {
    effect(() => {
      const groupId = Number(this.id());
      if (groupId) this.loadData(groupId);
    });
  }

  // Update loadData to include settlements
  protected loadData(groupId: number): void {
    this.isLoading.set(true);
    forkJoin({
      group: this.splitwiseService.getGroupDetails(groupId),
      balances: this.splitwiseService.getBalances(groupId),
      expenses: this.splitwiseService.getExpenses(groupId),
      settlements: this.splitwiseService.getSettlements(groupId), // <-- NEW
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.group.set(res.group);
          this.balances.set(res.balances);
          this.expenses.set(res.expenses);
          this.settlements.set(res.settlements); // <-- NEW
        },
        error: () => this.errorMessage.set('Could not load group details.'),
      });
  }

  // --- Group Menu ---
  @HostListener('document:click', ['$event'])
  protected onClickOutside(e: MouseEvent) {
    if (!this.eRef.nativeElement.contains(e.target)) this.menuOpen.set(false);
  }

  protected toggleMenu(e: Event) {
    e.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  // --- Actions ---
  protected onGroupUpdated(): void {
    this.isEditGroupOpen.set(false);
    this.loadData(Number(this.id()));
  }

  protected confirmDeleteGroup(): void {
    this.isDeletingGroup.set(true);
    this.splitwiseService
      .deleteGroup(Number(this.id()))
      .pipe(finalize(() => this.isDeletingGroup.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/splits']),
        error: () => {
          this.isDeleteGroupOpen.set(false);
          alert('Failed to delete group.');
        },
      });
  }

  protected removeMember(memberId: number, name: string): void {
    if (
      !confirm(
        `Are you sure you want to remove ${name}? They must have ₹0 balance and no expenses.`,
      )
    )
      return;

    this.splitwiseService.removeMember(Number(this.id()), memberId).subscribe({
      next: () => this.loadData(Number(this.id())),
      error: (err) => alert(err?.error?.message || 'Cannot remove member.'),
    });
  }

  protected onExpenseSaved(): void {
    this.isAddExpenseOpen.set(false);
    this.loadData(Number(this.id())); // Refresh data
  }

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
      new Date(iso),
    );
  }

  // --- Share Feature ---
  protected copySummaryToClipboard(): void {
    const g = this.group();
    const b = this.balances();
    if (!g || !b) return;

    let text = `*${g.name} - Split Summary*\n\n`;

    text += `*Who owes whom:*\n`;
    if (b.suggestedSettlements.length === 0) {
      text += `Everyone is settled up! 🎉\n`;
    } else {
      b.suggestedSettlements.forEach((s) => {
        text += `• ${s.fromName} owes ${s.toName}: ${this.formatCurrency(s.amount)}\n`;
      });
    }

    text += `\n*Total Group Spend:* ${this.formatCurrency(g.members.length > 0 ? b.memberBalances.reduce((sum, m) => sum + (m.netBalance > 0 ? m.netBalance : 0), 0) : 0)}\n`; // Approximation
    text += `\n_Generated via Manage-Your-Money_`;

    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  protected readonly Number = Number;

  // --- Expense Menu Logic ---
  protected toggleExpenseMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openExpenseMenuId.update((cur) => (cur === id ? null : id));
  }

  @HostListener('document:click')
  protected closeMenus(): void {
    this.menuOpen.set(false); // group menu
    this.openExpenseMenuId.set(null); // expense menus
  }

  // --- Expense Actions ---
  protected editExpense(expense: SplitExpenseResponse): void {
    this.openExpenseMenuId.set(null);
    this.expenseToEdit.set(expense);
  }

  protected confirmDeleteExpense(): void {
    const exp = this.expenseToDelete();
    if (!exp) return;

    this.isDeletingExpense.set(true);
    this.splitwiseService
      .deleteExpense(Number(this.id()), exp.id)
      .pipe(finalize(() => this.isDeletingExpense.set(false)))
      .subscribe({
        next: () => {
          this.expenseToDelete.set(null);
          this.loadData(Number(this.id()));
        },
        error: () => alert('Failed to delete expense.'),
      });
  }

  // Add this computed property
  protected readonly existingUserIds = computed(() => {
    const g = this.group();
    if (!g) return new Set<number>();
    return new Set(g.members.map((m) => m.userId).filter((id) => id != null) as number[]);
  });

  // Add this handler
  protected onMembersAdded(): void {
    this.isAddMemberOpen.set(false);
    this.loadData(Number(this.id()));
  }

  // NEW: Derived filtered expenses
  protected readonly filteredExpenses = computed(() => {
    const memberId = this.selectedMemberId();
    const all = this.expenses();
    if (memberId == null) return all;
    return all.filter((e) => e.paidByMemberId === memberId);
  });

  // NEW: Helper to get the name for the header
  protected readonly selectedMemberName = computed(() => {
    const id = this.selectedMemberId();
    if (id == null) return '';
    return this.group()?.members.find((m) => m.id === id)?.name ?? '';
  });

  protected toggleMemberFilter(memberId: number): void {
    this.selectedMemberId.update((current) => (current === memberId ? null : memberId));
  }

  protected clearMemberFilter(): void {
    this.selectedMemberId.set(null);
  }

  protected readonly filteredTotal = computed(() => {
    return this.filteredExpenses().reduce((sum, exp) => sum + exp.amount, 0);
  });

  // Add delete method
  protected confirmDeleteSettlement(): void {
    const s = this.settlementToDelete();
    if (!s) return;
    this.isDeletingSettlement.set(true);

    this.splitwiseService
      .deleteSettlement(Number(this.id()), s.id)
      .pipe(finalize(() => this.isDeletingSettlement.set(false)))
      .subscribe({
        next: () => {
          this.settlementToDelete.set(null);
          this.loadData(Number(this.id()));
        },
        error: () => alert('Failed to delete settlement.'),
      });
  }
}
