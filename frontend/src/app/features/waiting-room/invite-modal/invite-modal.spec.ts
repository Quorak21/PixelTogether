import { TestBed } from '@angular/core/testing';
import { InviteModalComponent } from './invite-modal';

describe('InviteModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteModalComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InviteModalComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('roomCode', 'ABC123');
    fixture.componentRef.setInput('roomUrl', 'http://localhost:4200/room/ABC123');
    expect(fixture.componentInstance).toBeTruthy();
  });
});
