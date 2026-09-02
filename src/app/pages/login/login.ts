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
  isLoading = false;

  private readonly _authManager = inject(AuthManager);
  private readonly _router = inject(Router);

  login(): void {
    this.isLoading = true;
    this.error = '';
    this._authManager.login(this.email).subscribe({
      next: () => {
        this._router.navigate(['/home']);
      },
      error: () => {
        this.error = 'Email inválido';
        this.isLoading = false;
      },
    });
  }
}
