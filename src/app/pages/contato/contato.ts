import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContatoService } from '../../services/contato-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contato',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './contato.html',
  styleUrl: './contato.css',
})
export class Contato {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly contatoService = inject(ContatoService);

  private readonly router = inject(Router);

  readonly form = this.formBuilder.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mensagem: ['', Validators.required],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.contatoService.criarContato(this.form.getRawValue()).subscribe({
      next: () => this.form.reset(),
      error: (erro) => console.error('Erro ao salvar contato:', erro),
    });
  }

  show(): void {
    this.router.navigate(['/showContato']);
  }
}
