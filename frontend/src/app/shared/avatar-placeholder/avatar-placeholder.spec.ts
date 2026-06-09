import { TestBed } from '@angular/core/testing';
import { AvatarPlaceholderComponent } from './avatar-placeholder';

describe('AvatarPlaceholderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPlaceholderComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AvatarPlaceholderComponent);
    fixture.componentRef.setInput('color', '#ef4444');
    expect(fixture.componentInstance).toBeTruthy();
  });
});
