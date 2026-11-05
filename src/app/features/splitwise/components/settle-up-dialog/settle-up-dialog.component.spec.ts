import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettleUpDialogComponent } from './settle-up-dialog.component';

describe('SettleUpDialogComponent', () => {
  let component: SettleUpDialogComponent;
  let fixture: ComponentFixture<SettleUpDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettleUpDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettleUpDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
