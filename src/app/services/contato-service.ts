import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ContatoModel } from '../models/contatoModel';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/Contato';

  getContatos() {
    return this.http.get<ContatoModel[]>('/api/App');
    // return this.http.get<ContatoModel[]>(this.apiUrl);
  }

  getContato(id: number) {
    return this.http.get<ContatoModel>(`/api/App/${id}`);
    // return this.http.get<ContatoModel>(`${this.apiUrl}/${id}`);
  }

  criarContato(contato: Omit<ContatoModel, 'id'>): Observable<ContatoModel> {
    return this.http.post<ContatoModel>('/api/App', contato);
    // return this.http.post<ContatoModel>(this.apiUrl, contato);
  }
}
