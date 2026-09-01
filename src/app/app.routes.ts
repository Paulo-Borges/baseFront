import { Routes } from '@angular/router';
import { Contato } from './pages/contato/contato';
import { ShowContato } from './pages/show-contato/show-contato';
import { ShowPessoa } from './pages/show-pessoa/show-pessoa';

export const routes: Routes = [
  { path: '', redirectTo: 'showPessoa', pathMatch: 'full' },
  { path: 'contato', component: Contato },
  { path: 'showContato', component: ShowContato },
  { path: 'showPessoa', component: ShowPessoa },
];
