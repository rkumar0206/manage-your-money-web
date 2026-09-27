import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyExpenseDialogComponent } from './copy-expense-dialog.component';

describe('CopyExpenseDialog', () => {
  let component: CopyExpenseDialogComponent;
  let fixture: ComponentFixture<CopyExpenseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyExpenseDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CopyExpenseDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
