import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitReportModalComponent } from './split-report-modal.component';

describe('SplitReportModalComponent', () => {
  let component: SplitReportModalComponent;
  let fixture: ComponentFixture<SplitReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitReportModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitReportModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
