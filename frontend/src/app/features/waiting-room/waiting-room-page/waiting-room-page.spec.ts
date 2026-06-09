import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WaitingRoomPageComponent } from './waiting-room-page';

describe('WaitingRoomPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaitingRoomPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WaitingRoomPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
