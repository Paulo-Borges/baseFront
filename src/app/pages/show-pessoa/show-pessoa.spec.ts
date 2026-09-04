import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShowPessoa } from './show-pessoa';
import { of } from 'rxjs';
import { PessoaService } from '../../services/pessoa-service';

describe('ShowPessoa', () => {
  let component: ShowPessoa;
  let fixture: ComponentFixture<ShowPessoa>;

  const mockPessoaService = {
    getPessoas: () => of([]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowPessoa],
      providers: [provideRouter([]), { provide: PessoaService, useValue: mockPessoaService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowPessoa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar um componente com sucesso', () => {
    expect(component).toBeTruthy();
  });
});
