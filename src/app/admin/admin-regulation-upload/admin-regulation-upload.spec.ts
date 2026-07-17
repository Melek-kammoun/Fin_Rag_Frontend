import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegulationUpload } from './admin-regulation-upload';

describe('AdminRegulationUpload', () => {
  let component: AdminRegulationUpload;
  let fixture: ComponentFixture<AdminRegulationUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegulationUpload],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegulationUpload);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
