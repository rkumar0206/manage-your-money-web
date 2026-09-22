import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Expense } from '../../../expense/models/expense.model';
import { ExpenseService } from '../../../expense/services/expense.service';
import { DashboardCardComponent } from '../../components/dashboard-card/dashboard-card.component';

@Component({
  selector: 'app-recent-expenses',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardCardComponent],
  templateUrl: './recent-expenses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentExpensesComponent {
  private readonly expenseService = inject(ExpenseService);

  protected readonly expenses = signal<Expense[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      untracked(() => this.load());
    });
  }

  protected reload(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.expenseService
      .search({}, 0, 5, 'created,desc')
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.expenses.set(res.content ?? []),
        error: () => this.errorMessage.set('Could not load recent expenses.'),
      });
  }

  protected formatCurrency(v: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(d);
  }
}
