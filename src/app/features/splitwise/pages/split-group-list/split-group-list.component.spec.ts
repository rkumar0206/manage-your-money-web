import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitGroupListComponent } from './split-group-list.component';

describe('SplitGroupListComponent', () => {
  let component: SplitGroupListComponent;
  let fixture: ComponentFixture<SplitGroupListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitGroupListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitGroupListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
