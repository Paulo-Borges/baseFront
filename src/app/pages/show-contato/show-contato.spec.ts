import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShowContato } from './show-contato';
import { of } from 'rxjs';
import { ContatoService } from '../../services/contato-service';

describe('ShowContato', () => {
  let component: ShowContato;
  let fixture: ComponentFixture<ShowContato>;

  const mockContatoService = {
    getContatos: () => of([]), // Retorna um Observable com array vazio
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowContato],
      providers: [provideRouter([]), { provide: ContatoService, useValue: mockContatoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowContato);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar um componente com sucesso', () => {
    expect(component).toBeTruthy();
  });
});
