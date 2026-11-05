import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GroupBalancesResponse,
  GroupResponse,
  SettlementResponse,
  SplitExpenseResponse,
} from '../../models/splitwise.model';

@Component({
  selector: 'app-split-report-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './split-report-modal.component.html',
  styleUrl: './split-report-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitReportModalComponent {
  // Inputs
  readonly group = input.required<GroupResponse>();
  readonly balances = input.required<GroupBalancesResponse>();
  readonly expenses = input.required<SplitExpenseResponse[]>();
  readonly settlements = input.required<SettlementResponse[]>();

  readonly closed = output<void>();

  protected readonly copySuccess = signal(false);

  // Calculate total spent for the report header
  protected readonly totalSpent = computed(() =>
    this.expenses().reduce((sum, e) => sum + e.amount, 0),
  );

  protected readonly generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  protected printReport(): void {
    window.print();
  }

  protected copyTextSummary(): void {
    const g = this.group();
    const b = this.balances();
    if (!g || !b) return;

    let text = `*${g.name} - Split Summary*\n\n`;

    text += `*Who owes whom:*\n`;
    if (b.suggestedSettlements.length === 0) {
      text += `Everyone is settled up! 🎉\n`;
    } else {
      b.suggestedSettlements.forEach((s) => {
        text += `• ${s.fromName} owes ${s.toName}: ₹${s.amount}\n`;
      });
    }

    text += `\n*Total Group Spend:* ₹${this.totalSpent().toFixed(2)}\n`;
    text += `\n_Generated via Manage-Your-Money_`;

    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
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
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }
}
