import { TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card';

describe('PlayerCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PlayerCardComponent);
    fixture.componentRef.setInput('player', {
      socketId: 'abc',
      pseudo: 'Test',
      avatarColor: '#ef4444',
      role: 'player',
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
