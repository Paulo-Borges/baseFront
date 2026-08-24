import { Routes } from '@angular/router';
import { Contato } from './pages/contato/contato';

export const routes: Routes = [
  { path: '', redirectTo: 'contato', pathMatch: 'full' },
  { path: 'contato', component: Contato },
];
