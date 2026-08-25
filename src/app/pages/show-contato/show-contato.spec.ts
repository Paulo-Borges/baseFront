import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowContato } from './show-contato';

describe('ShowContato', () => {
  let component: ShowContato;
  let fixture: ComponentFixture<ShowContato>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowContato],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowContato);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
