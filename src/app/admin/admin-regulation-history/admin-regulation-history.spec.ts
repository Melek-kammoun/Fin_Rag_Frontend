import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegulationHistory } from './admin-regulation-history';

describe('AdminRegulationHistory', () => {
  let component: AdminRegulationHistory;
  let fixture: ComponentFixture<AdminRegulationHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegulationHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegulationHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
