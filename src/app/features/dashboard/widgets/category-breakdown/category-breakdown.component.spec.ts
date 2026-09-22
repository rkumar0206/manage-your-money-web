import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryBreakdownComponent } from './category-breakdown.component';

describe('CategoryBreakdown', () => {
  let component: CategoryBreakdownComponent;
  let fixture: ComponentFixture<CategoryBreakdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBreakdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBreakdownComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
