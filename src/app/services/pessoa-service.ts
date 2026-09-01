import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PessoaModel } from '../models/pessoaModel';

@Injectable({
  providedIn: 'root',
})
export class PessoaService {
  private readonly apiUrl = '/api/Pessoa';
  private readonly http = inject(HttpClient);

  getPessoas() {
    return this.http.get<PessoaModel[]>(this.apiUrl);
  }

  getPessoa(id: number) {
    return this.http.get<PessoaModel>(`${this.apiUrl}/${id}`);
  }

  cadastrarPessoa(pessoa: Omit<PessoaModel, 'id'>) {
    return this.http.post<PessoaModel>(this.apiUrl, pessoa);
  }
}
