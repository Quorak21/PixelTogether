import { TestBed } from '@angular/core/testing';
import { OnboardingModalComponent } from './onboarding-modal';

describe('OnboardingModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingModalComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OnboardingModalComponent);
    fixture.componentRef.setInput('open', true);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
