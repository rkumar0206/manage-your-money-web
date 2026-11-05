import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitGroupDetailComponent } from './split-group-detail.component';

describe('SplitGroupDetailComponent', () => {
  let component: SplitGroupDetailComponent;
  let fixture: ComponentFixture<SplitGroupDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitGroupDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitGroupDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
