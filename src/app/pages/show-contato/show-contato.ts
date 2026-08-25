import { Component, inject } from '@angular/core';
import { ContatoService } from '../../contato-service';
import { ContatoModel } from '../../models/contatoModel';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-show-contato',
  imports: [AsyncPipe],
  templateUrl: './show-contato.html',
  styleUrl: './show-contato.css',
})
export class ShowContato {
  private readonly contatoService = inject(ContatoService);

  showContato$: Observable<ContatoModel[]> = this.contatoService.getContatos();
}
