import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS, NavItem } from '../../../core/navigation/nav-items';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly collapsed = input<boolean>(false);
  readonly toggleCollapsed = output<void>();

  protected readonly mainItems = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((i) => i.section === 'main'),
  );
  protected readonly accountItems = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((i) => i.section === 'account'),
  );
}
