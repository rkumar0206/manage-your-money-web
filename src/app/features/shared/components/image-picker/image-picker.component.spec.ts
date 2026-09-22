import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagePickerComponent } from './image-picker.component';

describe('ImagePicker', () => {
  let component: ImagePickerComponent;
  let fixture: ComponentFixture<ImagePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePickerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
