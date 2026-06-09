import { TestBed } from '@angular/core/testing';
import { StartConfirmModalComponent } from './start-confirm-modal';

describe('StartConfirmModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartConfirmModalComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(StartConfirmModalComponent);
    fixture.componentRef.setInput('open', false);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
