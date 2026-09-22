import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyTrendComponent } from './monthly-trend.component';

describe('MonthlyTrend', () => {
  let component: MonthlyTrendComponent;
  let fixture: ComponentFixture<MonthlyTrendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyTrendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonthlyTrendComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
