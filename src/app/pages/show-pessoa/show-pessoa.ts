import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PessoaService } from '../../services/pessoa-service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { PessoaModel } from '../../models/pessoaModel';

@Component({
  selector: 'app-show-pessoa',
  imports: [AsyncPipe],
  templateUrl: './show-pessoa.html',
  styleUrl: './show-pessoa.css',
})
export class ShowPessoa {
  private readonly pessoaService = inject(PessoaService);
  private readonly router = inject(Router);

  showPessoa$: Observable<PessoaModel[]> = this.pessoaService.getPessoas();

  inicio(): void {
    this.router.navigate(['/contato']);
  }
}
