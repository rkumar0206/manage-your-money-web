import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitGroupFormComponent } from './split-group-form.component';

describe('SplitGroupFormComponent', () => {
  let component: SplitGroupFormComponent;
  let fixture: ComponentFixture<SplitGroupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitGroupFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitGroupFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
