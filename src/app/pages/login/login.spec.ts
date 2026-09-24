import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Login } from './login';
import { of } from 'rxjs';
import { AuthManager } from '../../services/auth-manager';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const authManagerMock = {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(of(false)),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // Reinstancia os retornos padrão para cada teste
    authManagerMock.login.mockReturnValue(of({ token: '123', user: { nome: 'Teste' } }));
    authManagerMock.isAuthenticated.mockReturnValue(of(false));

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
  it('deve atualizar o email via ngModel quando o usuário digitar no input', async () => {
    const InputEL: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="email-input"]',
    );

    const email = 'aluno@teste.com';
    InputEL.value = email;
    InputEL.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.email).toBe(email);
  });

  it('deve renderizar a mensagem de erro no HTML quando a variável error estiver preenchida', () => {
    const errorMessagem = 'Credencias Invalidas';

    component.error = errorMessagem;
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="error-message"]',
    );
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain(errorMessagem);
  });

  it('deve desabilitar o botão e alterar o texto enquanto estiver carregando (isLoading)', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="submit-button"]',
    );
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Entrando...');
  });
});
