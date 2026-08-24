# Plano: Projeto .NET + Angular com Formulario e Banco de Dados

Este plano considera o backend .NET Web API separado do frontend Angular.

## Versoes e arquitetura

O frontend deste workspace usa **Angular 21.2.0**, conforme o `package.json`. Portanto, os exemplos Angular usam a API moderna de componentes standalone, sem `AppModule`.

O fluxo da aplicacao e:

```
Angular :4200  -->  proxy.conf.json  -->  .NET Web API :7xxx
                                                  |
                                           Entity Framework Core
                                                  |
                                             Banco de dados
```

Durante o desenvolvimento, o Angular chama URLs relativas como `/api/Contato`. O proxy encaminha essas requisicoes para a API .NET. Em producao, esse encaminhamento deve ser configurado no servidor web ou no gateway da aplicacao.

O Angular nao acessa o banco diretamente. A API e responsavel por validacao, regras de negocio e persistencia.

## O que backend e frontend compartilham

| Backend (.NET)                    | Frontend (Angular)        | O que representam |
| --------------------------------- | ------------------------- | ----------------- |
| Model/Entity `Contato`            | Interface `Contato`       | Formato dos dados |
| Controller                        | Service com `HttpClient`  | Contrato HTTP     |
| `AppDbContext`                    | Nao e exposto ao frontend | Acesso ao banco   |
| `IActionResult`/`ActionResult<T>` | `Observable<T>`           | Resposta da API   |
| `[Route("api/[controller]")]`     | `apiUrl = '/api/Contato'` | Mesmo caminho     |

---

## Passo 1 - Criar o projeto .NET Web API

```bash
dotnet new webapi -n baseBack.API
cd baseBack.API
```

O backend deve possuir, no minimo, estas pastas:

```
baseBack.API/
  Controllers/
  DataContext/
  Models/
  Migrations/
  Program.cs
  appsettings.json
```

---

## Passo 2 - Instalar o Entity Framework Core

Para SQL Server, instalar os pacotes:

```bash
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Microsoft.EntityFrameworkCore.Design
```

O provider `SqlServer` permite que o Entity Framework Core traduza as consultas LINQ para SQL Server. Se outro banco for escolhido, o provider correspondente deve substituir esse pacote.

---

## Passo 3 - Criar o Model

```csharp
// Models/Contato.cs
namespace baseBack.API.Models;

public class Contato
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
}
```

O `Id` deve ser configurado como chave primaria e, normalmente, como identidade/autoincremento pelo banco.

---

## Passo 4 - Criar o `AppDbContext`

```csharp
// DataContext/AppDbContext.cs
using baseBack.API.Models;
using Microsoft.EntityFrameworkCore;

namespace baseBack.API.DataContext;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Contato> Contatos => Set<Contato>();
}
```

O `AppDbContext` representa a sessao com o banco. Cada `DbSet` representa uma tabela ou conjunto de entidades. O Entity Framework Core acompanha as alteracoes e gera os comandos SQL quando `SaveChangesAsync()` e chamado.

---

## Passo 5 - Configurar a connection string e os servicos

Em `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=BaseContato;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

Em `Program.cs`:

```csharp
using baseBack.API.DataContext;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.MapControllers();

app.Run();
```

Uma connection string nao deve conter credenciais reais versionadas no repositorio. Para desenvolvimento, usar User Secrets ou variaveis de ambiente quando necessario.

---

## Passo 6 - Criar a tabela com migrations

Na pasta do projeto da API:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

A migration registra a estrutura do banco no codigo. `database update` aplica essa estrutura ao banco configurado na connection string. Depois de alterar o Model, criar uma nova migration antes de atualizar o banco.

---

## Passo 7 - Criar o Controller conectado ao banco

```csharp
using baseBack.API.DataContext;
using baseBack.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace baseBack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContatoController : ControllerBase
{
    private readonly AppDbContext _context;

    public ContatoController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Contato>>> GetContatos()
    {
        var contatos = await _context.Contatos
            .AsNoTracking()
            .ToListAsync();

        return Ok(contatos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Contato>> GetContato(int id)
    {
        var contato = await _context.Contatos.FindAsync(id);

        if (contato is null)
        {
            return NotFound();
        }

        return Ok(contato);
    }

    [HttpPost]
    public async Task<ActionResult<Contato>> CreateContato(Contato contato)
    {
        _context.Contatos.Add(contato);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetContato),
            new { id = contato.Id },
            contato);
    }
}
```

### O que mudou em relacao ao controller anterior

- A lista estatica foi removida: os dados agora sao lidos e gravados no banco por meio do `AppDbContext`.
- `ToListAsync()` e `SaveChangesAsync()` mantem as operacoes de I/O assincronas.
- `AsNoTracking()` reduz o custo de consultas que apenas exibem dados.
- `GET /api/Contato/{id}` foi adicionado para consultar um contato especifico.
- `CreatedAtAction()` agora aponta para `GetContato`, uma rota que realmente recebe `id`.
- Com `[ApiController]`, o ASP.NET Core valida automaticamente o corpo e o ModelState basico.

Teste a API no Swagger antes de integrar o Angular:

```
GET  /api/Contato
GET  /api/Contato/1
POST /api/Contato
```

Exemplo de corpo para `POST`:

```json
{
  "nome": "Maria",
  "email": "maria@email.com",
  "mensagem": "Ola"
}
```

---

## Passo 8 - Configurar o frontend Angular 21

Este workspace ja esta em Angular 21.2.0. A estrutura atual usa componentes standalone, por isso nao deve ser criado um `AppModule`.

No `src/app/app.config.ts`, habilitar o `HttpClient`:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(), provideRouter(routes)],
};
```

`provideHttpClient()` substitui a configuracao baseada em `HttpClientModule` usada em projetos Angular antigos.

---

## Passo 9 - Configurar o proxy

Criar `proxy.conf.json` na raiz do Angular:

```json
{
  "/api": {
    "target": "https://localhost:7XXX",
    "secure": false,
    "changeOrigin": true
  }
}
```

Substitua `7XXX` pela porta HTTPS exibida ao executar `dotnet run`.

No `angular.json`, adicionar `options` dentro de `serve`:

```json
"serve": {
  "builder": "@angular/build:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  },
  "configurations": {
    "production": {
      "buildTarget": "baseFront:build:production"
    },
    "development": {
      "buildTarget": "baseFront:build:development"
    }
  },
  "defaultConfiguration": "development"
}
```

O proxy evita configurar a URL completa da API no navegador durante o desenvolvimento e evita problemas de CORS causados pela porta diferente.

---

## Passo 10 - Criar a interface e o service

```typescript
// src/app/models/contato.model.ts
export interface Contato {
  id?: number;
  nome: string;
  email: string;
  mensagem: string;
}
```

```typescript
// src/app/contato.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contato } from './models/contato.model';

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/Contato';

  getContatos(): Observable<Contato[]> {
    return this.http.get<Contato[]>(this.apiUrl);
  }

  getContato(id: number): Observable<Contato> {
    return this.http.get<Contato>(`${this.apiUrl}/${id}`);
  }

  criarContato(contato: Omit<Contato, 'id'>): Observable<Contato> {
    return this.http.post<Contato>(this.apiUrl, contato);
  }
}
```

`inject()` e `providedIn: 'root'` seguem o estilo standalone atual. `Omit<Contato, 'id'>` impede que o frontend precise enviar o identificador ao criar um contato, pois o banco deve gera-lo.

---

## Passo 11 - Criar o template `contato.html`

Crie o arquivo `src/app/contato.html` com o template do formulario:

```html
<main class="contato-page">
  <section class="contato-card" aria-labelledby="contato-titulo">
    <header>
      <p class="eyebrow">Fale conosco</p>
      <h1 id="contato-titulo">Envie uma mensagem</h1>
      <p>Preencha os campos abaixo. Nossa equipe entrara em contato em breve.</p>
    </header>

    <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
      <div class="field">
        <label for="nome">Nome</label>
        <input id="nome" type="text" formControlName="nome" autocomplete="name" required />
        @if (form.controls.nome.touched && form.controls.nome.invalid) {
        <small class="error">Informe seu nome.</small>
        }
      </div>

      <div class="field">
        <label for="email">E-mail</label>
        <input id="email" type="email" formControlName="email" autocomplete="email" required />
        @if (form.controls.email.touched && form.controls.email.hasError('required')) {
        <small class="error">Informe seu e-mail.</small>
        } @else if (form.controls.email.touched && form.controls.email.hasError('email')) {
        <small class="error">Informe um e-mail valido.</small>
        }
      </div>

      <div class="field">
        <label for="mensagem">Mensagem</label>
        <textarea id="mensagem" formControlName="mensagem" rows="6" required></textarea>
        @if (form.controls.mensagem.touched && form.controls.mensagem.invalid) {
        <small class="error">Informe uma mensagem.</small>
        }
      </div>

      <button type="submit" [disabled]="form.invalid">Enviar mensagem</button>
    </form>
  </section>
</main>
```

O atributo `[formGroup]="form"` conecta o HTML ao formulario criado no componente TypeScript. Cada `formControlName` deve ter o mesmo nome de um controle definido no `FormBuilder`: `nome`, `email` e `mensagem`.

`(ngSubmit)="enviar()"` chama o metodo do componente quando o usuario envia o formulario. Os blocos `@if` usam a sintaxe moderna de controle de fluxo do Angular 17+ para mostrar mensagens de validacao somente depois que o campo foi visitado.

O atributo `novalidate` deixa a validacao sob responsabilidade do Reactive Forms. Os atributos `required`, `type="email"` e `autocomplete` continuam ajudando acessibilidade, teclado e preenchimento automatico.

O botao fica desabilitado enquanto o formulario e invalido. No componente, `markAllAsTouched()` continua sendo importante para revelar os erros caso o envio seja acionado por outro fluxo.

O componente tambem pode receber um arquivo `contato.css` pelo `styleUrls` ou pelo `styleUrl` do decorator para estilizar `.contato-page`, `.contato-card`, `.field`, `.error` e o botao.

---

## Passo 12 - Criar o formulario standalone

```typescript
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContatoService } from './contato.service';

@Component({
  selector: 'app-contato',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contato.html',
})
export class ContatoComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly contatoService = inject(ContatoService);

  readonly form = this.formBuilder.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mensagem: ['', Validators.required],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.contatoService.criarContato(this.form.getRawValue()).subscribe({
      next: () => this.form.reset(),
      error: (erro) => console.error('Erro ao salvar contato:', erro),
    });
  }
}
```

O `ReactiveFormsModule` habilita o formulario reativo. `NonNullableFormBuilder` evita valores `null` nos campos e `markAllAsTouched()` permite mostrar os erros de validacao ao usuario.

---

## Passo 13 - Configurar a rota e a tela

Em `app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { ContatoComponent } from './contato.component';

export const routes: Routes = [
  {
    path: 'contato',
    component: ContatoComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'contato',
  },
];
```

O `app.html` deve deixar o `<router-outlet />` como ponto de renderizacao das paginas. O HTML padrao gerado pelo Angular pode ser substituido pela tela de contato.

---

## Ordem de desenvolvimento e verificacao

```text
1. Criar o Model e o AppDbContext
2. Configurar connection string e EF Core no Program.cs
3. Criar migration e atualizar o banco
4. Testar GET e POST no Swagger
5. Habilitar provideHttpClient() no Angular
6. Configurar proxy.conf.json e angular.json
7. Criar interface, service e componente standalone
8. Configurar a rota /contato
9. Executar a API com dotnet run
10. Executar o Angular com npm start
11. Enviar um contato pelo formulario
12. Confirmar o registro no banco e consultar GET /api/Contato
```

Comandos principais:

```bash
# Backend
dotnet run

# Frontend
npm start

# Validacao do frontend
npm run build
npm test
```

## Ajustes necessarios neste workspace

- O projeto ja e Angular 21.2.0, entao os exemplos devem seguir standalone e `provideHttpClient()`.
- O `app.config.ts` precisa registrar `provideHttpClient()`.
- O `angular.json` precisa apontar para `proxy.conf.json`.
- O `app.routes.ts` ainda esta vazio e precisa registrar a rota de contato.
- O `app.html` ainda contem a tela padrao do Angular e deve ser substituido pela tela do formulario.
- O teste inicial de `app.spec.ts` espera `Hello, baseFront`; ele deve ser atualizado quando a tela padrao for removida.
- O backend precisa existir em um projeto separado com `AppDbContext`, connection string, migrations e controller.

## Referencias

| O que consultar       | Local                                           |
| --------------------- | ----------------------------------------------- |
| Configuracao Angular  | `src/app/app.config.ts`                         |
| Rotas Angular         | `src/app/app.routes.ts`                         |
| Versao do Angular     | `package.json`                                  |
| Controller .NET       | `baseBack.API/Controllers/ContatoController.cs` |
| Contexto do banco     | `baseBack.API/DataContext/AppDbContext.cs`      |
| Configuracao do banco | `baseBack.API/appsettings.json`                 |
