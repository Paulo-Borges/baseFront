import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { of } from 'rxjs';
import { AuthManager } from '../../services/auth-manager';
import { Router } from '@angular/router';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const authManagerMock = {
    login: vi.fn().mockReturnValue(of({ token: '123', user: { nome: 'Teste' } })),
    logout: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(of(false)),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthManager, useValue: authManagerMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar um componente com sucesso', () => {
    expect(component).toBeTruthy();
  });
});
