import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataExportComponent } from './data-export.component';

describe('DataExport', () => {
  let component: DataExportComponent;
  let fixture: ComponentFixture<DataExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataExportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataExportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
