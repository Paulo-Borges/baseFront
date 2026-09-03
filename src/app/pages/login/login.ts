import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthManager } from '../../services/auth-manager';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  error = '';
  password = '';
  isLoading = false;

  private readonly _authManager = inject(AuthManager);
  private readonly _router = inject(Router);

  login(): void {
    if (!this.email || !this.password) {
      this.error = 'Preencha todos os campos.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this._authManager.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Redireciona com base no perfil do usuário retornado pelo backend .NET
        if (response.user.role === 'admin') {
          this._router.navigate(['/showPessoa']);
        } else {
          this._router.navigate(['/contato']);
        }

        // Redireciona com base no perfil do usuário retornado pelo backend .NET
        if (response.user.role === 'user') {
          this._router.navigate(['/contato']);
        } else {
          this._router.navigate(['/showPessoa']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        // Captura a mensagem tratada enviada pela API .NET (ex: 401 Unauthorized)
        this.error = err.error?.message || 'E-mail ou senha inválidos.';
      },
    });
  }
}
