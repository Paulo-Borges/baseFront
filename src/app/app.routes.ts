import { Routes } from '@angular/router';
import { Contato } from './pages/contato/contato';
import { ShowContato } from './pages/show-contato/show-contato';
import { ShowPessoa } from './pages/show-pessoa/show-pessoa';
import { roleGuard } from './guards/role-guard';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'showPessoa', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Login',
  },
  { path: 'contato', canActivate: [authGuard], component: Contato },
  { path: 'showContato', canActivate: [roleGuard('admin')], component: ShowContato },
  { path: 'showPessoa', canActivate: [roleGuard('admin')], component: ShowPessoa },
];
