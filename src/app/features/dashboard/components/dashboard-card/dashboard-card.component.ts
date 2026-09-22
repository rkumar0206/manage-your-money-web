import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly isEmpty = input<boolean>(false);
  readonly emptyMessage = input<string>('No data for the selected period.');
  readonly minHeight = input<string>('');

  readonly retry = output<void>();
}
