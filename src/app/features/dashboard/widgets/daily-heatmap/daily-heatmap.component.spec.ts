import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyHeatmapComponent } from './daily-heatmap.component';

describe('DailyHeatmap', () => {
  let component: DailyHeatmapComponent;
  let fixture: ComponentFixture<DailyHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyHeatmapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyHeatmapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
