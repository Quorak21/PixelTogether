import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JoinRoomModalComponent } from './join-room-modal';

describe('JoinRoomModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinRoomModalComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(JoinRoomModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
