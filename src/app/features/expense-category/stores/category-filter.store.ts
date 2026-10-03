import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CategoryFilterStore {
  readonly searchTerm = signal('');

  reset(): void {
    this.searchTerm.set('');
  }
}
