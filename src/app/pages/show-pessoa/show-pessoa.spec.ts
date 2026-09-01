import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowPessoa } from './show-pessoa';

describe('ShowPessoa', () => {
  let component: ShowPessoa;
  let fixture: ComponentFixture<ShowPessoa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowPessoa],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowPessoa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
