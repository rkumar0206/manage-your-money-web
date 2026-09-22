import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopVendorsComponent } from './top-vendors.component';

describe('TopVendors', () => {
  let component: TopVendorsComponent;
  let fixture: ComponentFixture<TopVendorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopVendorsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TopVendorsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
