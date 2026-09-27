import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoveExpenseDialogComponent } from './move-expense-dialog.component';

describe('MoveExpenseDialog', () => {
  let component: MoveExpenseDialogComponent;
  let fixture: ComponentFixture<MoveExpenseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveExpenseDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveExpenseDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
