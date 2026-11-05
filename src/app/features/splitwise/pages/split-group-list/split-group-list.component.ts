import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import { GroupSummaryResponse } from '../../models/splitwise.model';

@Component({
  selector: 'app-split-group-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './split-group-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitGroupListComponent {
  private readonly splitwiseService = inject(SplitwiseService);
  private readonly router = inject(Router);

  protected readonly groups = signal<GroupSummaryResponse[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadGroups();
  }

  protected loadGroups(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.splitwiseService
      .getGroups()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.groups.set(data ?? []),
        error: () => this.errorMessage.set('Could not load split groups.'),
      });
  }

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  protected goToGroup(id: number): void {
    console.log('Navigating to group:', id); // Add this to verify the click registers
    this.router.navigate(['/splits', id]);
  }
}
