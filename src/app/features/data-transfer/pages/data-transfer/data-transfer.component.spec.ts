import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTransferComponent } from './data-transfer.component';

describe('DataTransfer', () => {
  let component: DataTransferComponent;
  let fixture: ComponentFixture<DataTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTransferComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTransferComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
