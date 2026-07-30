import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegulationUploadComponent } from './admin-regulation-upload';

describe('AdminRegulationUploadComponent', () => {
  let component: AdminRegulationUploadComponent;
  let fixture: ComponentFixture<AdminRegulationUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegulationUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegulationUploadComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
