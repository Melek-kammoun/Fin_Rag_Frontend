import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegulationHistoryComponent } from './admin-regulation-history';

describe('AdminRegulationHistoryComponent', () => {
  let component: AdminRegulationHistoryComponent;
  let fixture: ComponentFixture<AdminRegulationHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegulationHistoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegulationHistoryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
