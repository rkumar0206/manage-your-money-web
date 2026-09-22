import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpiRowComponent } from './kpi-row.component';

describe('KpiRow', () => {
  let component: KpiRowComponent;
  let fixture: ComponentFixture<KpiRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KpiRowComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
