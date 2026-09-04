import { Routes } from '@angular/router';
import { Contato } from './pages/contato/contato';
import { ShowContato } from './pages/show-contato/show-contato';
import { ShowPessoa } from './pages/show-pessoa/show-pessoa';
import { roleGuard } from './guards/role-guard';
import { authGuard } from './guards/auth-guard';
import { Login } from './pages/login/login';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  { path: '', redirectTo: 'showPessoa', pathMatch: 'full' },
  {
    path: 'login',
    component: Login,
    title: 'Login',
  },
  { path: 'contato', canActivate: [authGuard], component: Contato },
  { path: 'showContato', canActivate: [roleGuard('admin')], component: ShowContato },
  { path: 'showPessoa', canActivate: [roleGuard('admin')], component: ShowPessoa },
  { path: '**', redirectTo: 'not-found', pathMatch: 'full' },
  { path: 'not-found', component: NotFound },
];
