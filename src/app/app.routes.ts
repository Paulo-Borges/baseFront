import { Routes } from '@angular/router';
import { Contato } from './pages/contato/contato';
import { ShowContato } from './pages/show-contato/show-contato';

export const routes: Routes = [
  { path: '', redirectTo: 'contato', pathMatch: 'full' },
  { path: 'contato', component: Contato },
  { path: 'showContato', component: ShowContato },
];
