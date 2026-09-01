import { Component, inject } from '@angular/core';
import { ContatoService } from '../../services/contato-service';
import { ContatoModel } from '../../models/contatoModel';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-show-contato',
  imports: [AsyncPipe],
  templateUrl: './show-contato.html',
  styleUrl: './show-contato.css',
})
export class ShowContato {
  private readonly contatoService = inject(ContatoService);
  private readonly router = inject(Router);

  showContato$: Observable<ContatoModel[]> = this.contatoService.getContatos();

  inicio(): void {
    this.router.navigate(['/showPessoa']);
  }
}
