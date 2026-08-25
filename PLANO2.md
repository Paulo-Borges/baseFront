# Plano 2: API .NET profissional e aula de concorrencia

Este documento continua o `PLANO.md` sem altera-lo. Ele transforma o CRUD de contatos em um laboratorio pratico para estudar APIs de alto volume, concorrencia, desempenho e escalabilidade.

## 1. Objetivo da aula

Ao final do projeto, voce devera conseguir:

- explicar a diferenca entre concorrencia, paralelismo e escalabilidade;
- implementar uma Web API ASP.NET Core com operacoes assincronas;
- testar a API sob varias requisicoes simultaneas;
- impedir perda silenciosa de atualizacoes com controle de concorrencia otimista;
- paginar e indexar consultas;
- entender o papel do pool de conexoes;
- proteger a API com rate limiting e timeouts;
- usar cache para leituras adequadas;
- mover tarefas demoradas para filas;
- executar varias instancias stateless da API;
- avaliar, com criterio, CQRS e Event Sourcing.

O objetivo nao e adicionar todas as tecnologias de uma vez. O objetivo e medir o comportamento do sistema, introduzir uma melhoria, medir novamente e entender qual problema aquela melhoria resolve.

## 2. Estado atual e pre-requisitos

### O que ja existe no frontend

O Angular atual ja possui:

- Angular 21 e componentes standalone;
- `provideHttpClient()` em `src/app/app.config.ts`;
- rotas para `/contato` e `/showContato`;
- formulario reativo para criar contatos;
- `ContatoService` com `GET` e `POST`;
- proxy para `https://localhost:7277`.

### O que precisa estar disponivel antes da aula

O backend foi criado em outra IDE. Para trabalhar com uma unica solucao durante a aula, abra a pasta da API no VS Code ou coloque o projeto backend ao lado do frontend, por exemplo:

```text
base/
  baseFront/
  baseBack/
    baseBack.API/
```

O backend deve ter, no minimo:

```text
baseBack.API/
  Controllers/
  DataContext/
  Models/
  Migrations/
  Program.cs
  appsettings.json
```

Antes de iniciar a etapa seguinte, confirme:

```bash
dotnet --info
dotnet build
dotnet ef database update
dotnet run
```

Depois, teste no Swagger:

```text
GET  /api/Contato
GET  /api/Contato/{id}
POST /api/Contato
```

O frontend nao acessa o banco. O fluxo correto continua sendo:

```text
Angular -> HTTP -> API ASP.NET Core -> EF Core -> Banco de dados
```

### Ajustes da base Angular antes dos testes

O teste inicial de `app.spec.ts` ainda espera `Hello, baseFront`, embora a aplicacao agora renderize o `router-outlet`. Esse teste deve verificar a criacao do componente ou a rota real.

Os testes do servico devem usar `HttpTestingController` para confirmar URL, metodo, corpo e resposta. Os testes dos componentes devem cobrir formulario invalido, sucesso e erro.

Se o compilador continuar indicando erro de `rootDir`, defina explicitamente o diretorio de origem nos dois arquivos:

```json
// tsconfig.app.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./out-tsc/app",
    "types": []
  }
}
```

Para `tsconfig.spec.json`, use tambem `"rootDir": "./src"`. Preserve os `include` e `exclude` existentes.

Validacao da base:

```bash
npm run build
npm test -- --watch=false
```

**Pronto quando:** API inicia, banco responde, frontend compila e os testes nao dependem de uma API real para testar o servico.

## 3. Modulo 1: CRUD assincrono funcionando

### Objetivo da aula

Implementar uma leitura real com DTO, EF Core assincrono, cancelamento, timeout e limite de requisicao. Ao final, voce devera saber exatamente o que acontece entre o cliente, a API, o ThreadPool e o banco.

### 3.1 Criar o DTO de resposta

Crie o arquivo `DTOs/ContatoResponse.cs` no backend:

```csharp
namespace baseBack.API.DTOs;

public sealed record ContatoResponse(
  int Id,
  string Nome,
  string Email,
  string Mensagem);
```

O record posicional cria o construtor com quatro argumentos usado pela consulta. O DTO impede que propriedades internas da entidade sejam expostas acidentalmente.

### 3.2 Implementar o GET assincrono

No controller, adicione `using baseBack.API.DTOs;` e substitua o GET antigo por:

```csharp
[HttpGet]
public async Task<ActionResult<IEnumerable<ContatoResponse>>> Get(CancellationToken cancellationToken)
{
    var contatos = await _context.Contatos
        .AsNoTracking()
        .Select(contato => new ContatoResponse(
            contato.Id,
            contato.Nome,
            contato.Email,
            contato.Mensagem))
        .ToListAsync(cancellationToken);

    return Ok(contatos);
  }
```

O `CancellationToken` representa o cancelamento da requisicao HTTP. O `ToListAsync` recebe o token e pode interromper uma consulta que deixou de ter um consumidor. `AsNoTracking` e adequado porque este endpoint apenas le dados. `Select` transforma a entidade em DTO ainda na consulta.

Nao use `.Result`, `.Wait()` ou `Thread.Sleep` em I/O. `async` nao torna o banco mais rapido; ele evita ocupar uma thread enquanto a aplicacao aguarda o banco.

### 3.3 DTO de entrada e validacao

Crie tambem `DTOs/CreateContatoRequest.cs`:

```csharp
public sealed record CreateContatoRequest(
    string Nome,
    string Email,
    string Mensagem);

public sealed record ContatoResponse(
    int Id,
    string Nome,
    string Email,
    string Mensagem);
```

No controller, receba o DTO em vez da entidade:

```csharp
[HttpPost]
public async Task<ActionResult<ContatoResponse>> Create(
  CreateContatoRequest request,
  CancellationToken cancellationToken)
{
  var contato = new Contato
  {
    Nome = request.Nome,
    Email = request.Email,
    Mensagem = request.Mensagem
  };

  _context.Contatos.Add(contato);
  await _context.SaveChangesAsync(cancellationToken);

  var response = new ContatoResponse(
    contato.Id,
    contato.Nome,
    contato.Email,
    contato.Mensagem);

  return CreatedAtAction(nameof(GetContato), new { id = contato.Id }, response);
}
```

Adicione `[Required]`, `[EmailAddress]`, `[StringLength]` ou validadores equivalentes ao DTO. Com `[ApiController]`, dados invalidos retornam `400 Bad Request` antes de executar a regra de persistencia.

### 3.4 Endpoint demorado para demonstrar cancelamento

Adicione temporariamente:

```csharp
[HttpGet("demorado")]
public async Task<IActionResult> Demorado(
  CancellationToken cancellationToken)
{
  await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
  return Ok(new { mensagem = "Operacao concluida" });
}
```

Abra `GET /api/Contato/demorado` no Swagger e cancele a requisicao. O cancelamento nao e um erro de negocio: ele informa que continuar o trabalho nao e mais necessario.

### 3.5 Configurar timeout do comando SQL

No `Program.cs`, substitua o registro do contexto por:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
  options.UseSqlServer(
    builder.Configuration.GetConnectionString("DefaultConnection"),
    sqlOptions => sqlOptions.CommandTimeout(30)));
```

O banco cancelara o comando depois de 30 segundos. Isso nao define o tempo total da requisicao HTTP. Um timeout muito pequeno pode interromper consultas legitimas; escolha o valor observando metricas.

### 3.6 Limitar o corpo da requisicao

Antes de `builder.Build()` no `Program.cs`:

```csharp
builder.WebHost.ConfigureKestrel(options =>
{
  options.Limits.MaxRequestBodySize = 1 * 1024 * 1024;
});
```

Esse exemplo limita o corpo a 1 MB. Para um endpoint especifico, use `[RequestSizeLimit(1 * 1024 * 1024)]`. O limite protege memoria, CPU e largura de banda contra payloads desnecessariamente grandes.

### 3.7 Comparar bloqueio com async

Adicione temporariamente ao controller:

```csharp
[HttpGet("bloqueante")]
public IActionResult Bloqueante()
{
  Thread.Sleep(TimeSpan.FromSeconds(2));
  return Ok(new { mensagem = "Operacao bloqueante concluida" });
}

[HttpGet("assincrono")]
public async Task<IActionResult> Assincrono(
  CancellationToken cancellationToken)
{
  await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
  return Ok(new { mensagem = "Operacao assincrona concluida" });
}
```

`Thread.Sleep` mantem uma thread ocupada. `Task.Delay` registra a continuacao e permite que a thread seja usada em outra tarefa durante a espera. O endpoint assincrono nao e necessariamente mais rapido para uma unica requisicao; ele escala melhor quando muitas requisicoes aguardam I/O.

### 3.8 Executar e medir

1. Inicie o backend com `dotnet run`.
2. Teste os endpoints no Swagger.
3. Cancele `demorado` antes dos 30 segundos.
4. Envie 50 requisicoes simultaneas para `bloqueante`.
5. Repita para `assincrono`.
6. Registre p95, erros, CPU e threads.

Exemplo de `carga.js` para k6:

```javascript
import http from 'k6/http';

export const options = { vus: 50, duration: '10s' };

export default function () {
  http.get('https://localhost:7277/api/Contato/assincrono');
}
```

Execute com `k6 run carga.js` e repita alterando a URL para `bloqueante`. Nao espere os mesmos numeros em todos os computadores; compare a tendencia sob carga.

### O que este modulo prova

I/O assincrono e importante para banco, HTTP, arquivos e filas. Ele nao acelera calculo pesado de CPU e nao resolve conflitos de dados. Concorrencia, timeout, limite de payload e cancelamento controlam recursos diferentes.

**Pronto quando:** DTOs, validacao, `Task`, `CancellationToken`, timeout SQL e limite HTTP estao funcionando; o exercicio foi executado e os resultados foram registrados.

## 4. Modulo 2: testes de integracao

Testes unitarios verificam uma classe isoladamente. Testes de integracao verificam o caminho real entre API, banco e contrato HTTP.

Cubra pelo menos:

- `POST` valido retorna `201 Created`;
- `POST` invalido retorna `400 Bad Request`;
- `GET` inexistente retorna `404 Not Found`;
- `GET` paginado retorna metadados corretos;
- banco recebe o registro criado;
- duas requisicoes simultaneas nao corrompem dados.

Use um banco de teste isolado. Para uma aula simples, SQLite pode ser suficiente, desde que as diferencas de concorrencia em relacao ao SQL Server sejam explicadas. Para validar `rowversion` e comportamento real do SQL Server, prefira SQL Server local ou containerizado.

O teste deve iniciar a API em um ambiente controlado e usar `HttpClient`, em vez de chamar diretamente o controller.

**Pronto quando:** existe pelo menos um teste HTTP ponta a ponta para cada contrato importante e os testes nao dependem de dados criados manualmente.

### Aula pratica: como criar o primeiro teste de integracao

1. Crie um projeto `baseBack.API.Tests` e adicione referencia ao projeto da API.
2. Instale `Microsoft.AspNetCore.Mvc.Testing` e o framework de testes escolhido.
3. Crie uma `WebApplicationFactory` para iniciar a API em ambiente de teste.
4. Substitua o banco por uma base isolada ou SQL Server temporario.
5. Crie um `HttpClient` pela factory e chame a rota real.
6. Valide status HTTP, JSON e persistencia no banco.

Exemplo:

```csharp
[Fact]
public async Task Post_valido_deve_retornar_created()
{
  using var client = factory.CreateClient();
  var response = await client.PostAsJsonAsync("/api/Contato", new
  {
    nome = "Maria",
    email = "maria@email.com",
    mensagem = "Ola"
  });

  Assert.Equal(HttpStatusCode.Created, response.StatusCode);
}
```

Depois crie testes para `400`, `404`, paginacao e concorrencia. SQLite pode ser usado para o CRUD inicial, mas `rowversion` deve ser validado no SQL Server, pois os bancos nao possuem exatamente o mesmo comportamento.

## 5. Modulo 3: duas escritas concorrentes

### Cenario didatico

1. Cliente A le o contato na versao 5.
2. Cliente B le o mesmo contato na versao 5.
3. Cliente A salva uma alteracao.
4. Cliente B tenta salvar usando os dados antigos.

Sem controle de concorrencia, a alteracao de B pode sobrescrever silenciosamente a de A. Esse e o problema chamado lost update.

O teste deve iniciar duas tarefas com o mesmo estado inicial, sincroniza-las para que ambas leiam antes de salvar e verificar o resultado.

### Aula pratica: reproduzir o lost update

1. Crie um contato no banco.
2. Faca o cliente A ler o contato.
3. Faca o cliente B ler o mesmo contato antes de A salvar.
4. Envie duas atualizacoes usando esses estados antigos.
5. Compare o estado final com as duas respostas.

Exemplo simplificado:

```csharp
var contatoA = await clientA.GetFromJsonAsync<ContatoResponse>(url);
var contatoB = await clientB.GetFromJsonAsync<ContatoResponse>(url);

var tarefaA = clientA.PutAsJsonAsync(url, requestA);
var tarefaB = clientB.PutAsJsonAsync(url, requestB);
var respostas = await Task.WhenAll(tarefaA, tarefaB);
```

`Task.WhenAll` sobrepoe as tarefas, mas o teste precisa garantir que A e B leram a mesma versao antes das escritas. Sem controle de concorrencia, as duas respostas podem ser `200` e uma alteracao pode desaparecer. Esse comportamento e o lost update.

Nao confunda:

- varias requisicoes sendo executadas ao mesmo tempo;
- varias requisicoes alterando o mesmo registro;
- varias instancias da API;
- paralelismo de CPU.

Cada caso exige uma estrategia diferente.

## 6. Modulo 4: optimistic locking com rowversion

### Modelo

No SQL Server, adicione uma coluna de versao:

```csharp
public byte[] RowVersion { get; set; } = [];
```

Configure no `OnModelCreating`:

```csharp
modelBuilder.Entity<Contato>()
    .Property(contato => contato.RowVersion)
    .IsRowVersion();
```

Inclua a versao no DTO de leitura e exija a versao esperada na alteracao. O EF Core gera uma condicao equivalente a:

```sql
UPDATE Contatos
SET Nome = @nome
WHERE Id = @id AND RowVersion = @versaoEsperada
```

Se nenhuma linha for alterada, houve conflito. Capture `DbUpdateConcurrencyException` e responda `409 Conflict`, de preferencia com `ProblemDetails` explicando que o recurso foi alterado.

### Quando usar

Locks otimistas funcionam bem quando conflitos sao possiveis, mas nao constantes. O cliente pode recarregar o recurso, mostrar a diferenca e tentar novamente.

Nao use um lock em memoria como solucao para varias instancias: cada processo teria um lock diferente.

### Idempotencia

Para criacoes e comandos repetidos, aceite uma `Idempotency-Key`. Armazene a chave, o resultado e a identidade da operacao com uma constraint unica. Uma repeticao deve retornar o mesmo resultado ou uma resposta claramente equivalente, sem criar duplicatas.

**Pronto quando:** o teste com duas escritas produz um `409 Conflict` previsivel e nenhuma alteracao e perdida silenciosamente.

### Aula pratica: implementar a protecao

1. Adicione `RowVersion` a entidade.
2. Configure `.IsRowVersion()` no `OnModelCreating`.
3. Crie a migration e execute `dotnet ef database update`.
4. Inclua a versao no DTO de leitura, transportando-a como Base64 se necessario.
5. Receba a versao esperada no DTO de atualizacao.
6. Capture `DbUpdateConcurrencyException`.
7. Retorne `409 Conflict` com `ProblemDetails`.

O EF Core inclui a versao na clausula `WHERE` do `UPDATE`. Se outra requisicao ja salvou uma versao nova, nenhuma linha e alterada e o conflito e detectado. Um lock em memoria nao resolve varias instancias, porque cada processo teria um lock diferente.

## 7. Modulo 5: paginacao, filtros e indices

Nunca retorne uma tabela inteira por padrao:

```text
GET /api/contatos?page=1&pageSize=20&email=empresa.com&sort=-id
```

Limite `pageSize` no servidor, valide valores negativos e defina uma ordenacao deterministica. Uma resposta possivel:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 125,
  "totalPages": 7
}
```

Use `Select` para buscar somente as colunas necessarias e `AsNoTracking` em leituras. Crie indices baseados nos filtros e na ordenacao reais; indice demais tambem prejudica escritas e ocupa armazenamento.

Analise o plano de execucao do banco. Nao conclua que um indice ajudou apenas porque a consulta parece mais rapida em uma execucao isolada.

**Pronto quando:** a API limita o tamanho da resposta, tem consulta parametrizada, possui indice justificado e o teste mede latencia com poucos e muitos registros.

### Aula pratica: construir a consulta paginada

1. Receba `page` e `pageSize` com valores padrao.
2. Rejeite pagina menor que 1 e limite o `pageSize` no servidor.
3. Aplique filtros antes de `Skip` e `Take`.
4. Defina ordenacao deterministica, como `Id` crescente ou decrescente.
5. Use `Select` para retornar somente as colunas necessarias.
6. Use `AsNoTracking` em leituras.
7. Crie indices somente para filtros e ordenacoes comprovadamente usados.
8. Analise o plano de execucao antes e depois do indice.

Uma resposta pode conter `items`, `page`, `pageSize`, `totalItems` e `totalPages`. Para tabelas muito grandes, estude keyset pagination como alternativa a `Skip` e `Take` em paginas profundas.

## 8. Modulo 6: connection pooling

O pool reutiliza conexoes fisicas com o banco. O `DbContext` deve ter escopo por requisicao e ser descartado ao final dela. Nao crie um singleton de `DbContext`.

Investigue:

- tamanho minimo e maximo do pool;
- tempo de espera por conexao;
- timeout de comando;
- quantidade de conexoes abertas;
- consultas lentas mantendo conexoes ocupadas;
- transacoes abertas durante chamadas externas.

O pool nao e infinito. Aumentar seu tamanho sem capacidade no banco pode apenas transferir o gargalo e piorar a situacao.

**Experimento:** execute carga crescente e observe latencia, erros de timeout, CPU do banco e conexoes em uso. Compare o efeito de uma consulta lenta com o efeito de um pool pequeno.

### Aula pratica: observar o pool

1. Execute a API com o `DbContext` registrado como scoped.
2. Envie carga crescente e registre p95, timeouts e conexoes em uso.
3. Simule uma consulta lenta controlada.
4. Reduza o tamanho maximo do pool na connection string, se o provider permitir.
5. Repita a carga e observe a espera por conexao.
6. Aumente gradualmente e compare com a capacidade do banco.

O pool reutiliza conexoes fisicas, mas nao e infinito. Aumentar seu tamanho sem capacidade no banco apenas desloca o gargalo. Nunca mantenha transacao aberta enquanto chama um servico externo.

## 9. Modulo 7: rate limiting e resiliencia

Use o rate limiting nativo do ASP.NET Core para proteger endpoints sensiveis. Escolha a chave adequada: usuario autenticado, tenant, API key ou IP. IP sozinho pode ser injusto em redes compartilhadas.

Responda excesso de limite com `429 Too Many Requests` e, quando aplicavel, `Retry-After`.

Adicione limites diferentes para:

- leitura publica;
- criacao de contatos;
- endpoints administrativos;
- operacoes caras.

Combine com:

- timeout de requisicao e de dependencias;
- retry somente para falhas transientes e operacoes idempotentes;
- circuit breaker para dependencias indisponiveis;
- health checks;
- logs estruturados com correlation id.

Retry sem limite pode multiplicar a carga durante uma falha. Circuit breaker e rate limiting tratam problemas diferentes: um protege a capacidade; o outro evita insistir em uma dependencia quebrada.

**Pronto quando:** o teste ultrapassa o limite e recebe `429`, os headers sao coerentes e a API nao cria trabalho ilimitado durante falhas.

### Aula pratica: configurar e testar rate limiting

1. Registre `AddRateLimiter(...)` no `Program.cs`.
2. Crie uma politica nomeada para leitura ou criacao.
3. Registre `app.UseRateLimiter()` antes dos controllers.
4. Associe a politica ao endpoint.
5. Configure resposta `429 Too Many Requests` e `Retry-After` quando adequado.
6. Envie requisicoes acima do limite com Postman ou k6.
7. Confirme que as requisicoes rejeitadas nao chegam ao banco.

Exemplo minimo para o `Program.cs`:

```csharp
builder.Services.AddRateLimiter(options =>
{
  options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
  options.AddFixedWindowLimiter("contatos", limiterOptions =>
  {
    limiterOptions.PermitLimit = 5;
    limiterOptions.Window = TimeSpan.FromSeconds(10);
    limiterOptions.QueueLimit = 0;
  });
});

var app = builder.Build();
app.UseRateLimiter();
```

No controller, associe a politica com `[EnableRateLimiting("contatos")]`. Esse limite e apenas didatico; em producao, escolha a janela, a chave e a politica com base no perfil real dos clientes.

Comece com limite pequeno para observar o comportamento. Depois escolha a chave correta: usuario, tenant, API key ou IP. Rate limiting protege capacidade; timeout, retry e circuit breaker resolvem problemas diferentes.

## 10. Modulo 8: cache

Comece com cache de leitura e meca uma consulta repetida antes e depois. Para uma unica instancia, `IMemoryCache` pode demonstrar o conceito. Para varias instancias, use Redis ou outro cache distribuido.

Defina explicitamente:

- chave do cache;
- tempo de expiracao;
- politica de invalidacao;
- comportamento quando o cache falha;
- risco de dados obsoletos;
- protecao contra varias requisicoes preenchendo a mesma chave.

Depois de criar ou alterar um contato, invalide as chaves afetadas. Nao use cache para mascarar uma consulta incorreta ou sem indice.

Cache HTTP tambem pode usar `ETag` e `Cache-Control`. Em uma API com dados que mudam, esses headers precisam refletir a politica de consistencia desejada.

**Pronto quando:** o teste mostra menos consultas ao banco, a invalidação funciona e o sistema continua correto quando o cache expira ou fica indisponivel.

### Aula pratica: implementar cache de leitura

1. Escolha uma consulta frequente, como a lista de contatos.
2. Meça consultas ao banco sem cache.
3. Registre `AddMemoryCache()` no `Program.cs`.
4. Injete `IMemoryCache` no servico de leitura.
5. Defina chave e expiracao.
6. Invalide a chave depois de criar ou alterar um contato.
7. Repita a carga e compare latencia e leituras ao banco.
8. Para varias instancias, substitua por Redis ou outro cache distribuido.

Exemplo de cache em memoria:

```csharp
public async Task<IReadOnlyList<ContatoResponse>> ListarAsync(
  CancellationToken cancellationToken)
{
  const string chave = "contatos:lista";

  if (_cache.TryGetValue(chave, out IReadOnlyList<ContatoResponse>? salvo))
    return salvo;

  var contatos = await _context.Contatos
    .AsNoTracking()
    .Select(contato => new ContatoResponse(
      contato.Id, contato.Nome, contato.Email, contato.Mensagem))
    .ToListAsync(cancellationToken);

  _cache.Set(chave, contatos, TimeSpan.FromSeconds(30));
  return contatos;
}
```

Depois de um POST ou PUT, remova a chave com `_cache.Remove("contatos:lista")`. Em varias instancias, esse cache local pode produzir respostas diferentes; use cache distribuido para compartilhar o valor.

Teste expiracao, cache indisponivel e varias requisicoes preenchendo a mesma chave. Cache nao corrige consulta sem indice e pode entregar dado antigo; a politica de consistencia precisa ser documentada.

## 11. Modulo 9: filas e processamento assincrono

Use fila quando o trabalho puder ser concluido depois da resposta HTTP, por exemplo envio de e-mail ou notificacao.

```text
POST /contatos
  -> valida e persiste o comando
  -> publica mensagem
  -> retorna 202 Accepted ou 201 Created conforme o contrato
Worker
  -> consome mensagem
  -> executa trabalho
  -> confirma ou envia para dead-letter
```

A mensagem deve ter identificador e ser processada de forma idempotente. O worker precisa de retry com backoff, limite de tentativas e dead-letter queue.

Nao coloque na fila uma operacao que o usuario espera ver concluida imediatamente sem definir como consultar o status. Nesse caso, use um recurso de processamento, como `GET /operacoes/{id}`.

Para desenvolvimento, pode-se iniciar com uma fila em memoria apenas para visualizar o fluxo. Para comportamento real entre instancias, use um broker duravel, como Azure Service Bus, RabbitMQ ou outro escolhido pelo projeto.

### Aula pratica: criar fila e worker

1. Escolha uma tarefa que nao precisa terminar antes da resposta, como notificacao.
2. Defina uma mensagem com identificador unico.
3. Persista o contato e publique a mensagem conforme a garantia necessaria.
4. Crie um `BackgroundService` ou worker consumidor.
5. Torne o processamento idempotente.
6. Configure retry com backoff e limite de tentativas.
7. Envie falhas permanentes para dead-letter queue.
8. Se necessario, crie `GET /operacoes/{id}` para consultar progresso.

Exemplo didatico de worker em memoria:

```csharp
public sealed class NotificacaoWorker(
  Channel<NotificacaoMensagem> fila,
  ILogger<NotificacaoWorker> logger) : BackgroundService
{
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    await foreach (var mensagem in fila.Reader.ReadAllAsync(stoppingToken))
    {
      logger.LogInformation("Processando {Id}", mensagem.Id);
      await ProcessarAsync(mensagem, stoppingToken);
    }
  }
}
```

Registre `AddHostedService<NotificacaoWorker>()` e a fila como singleton. Essa fila perde mensagens quando o processo para; ela serve somente para aprender o fluxo. Depois substitua-a por um broker duravel e mantenha retry, idempotencia e dead-letter.

Uma fila em memoria serve apenas para a demonstracao local. Para varias instancias ou mensagens que nao podem ser perdidas, use um broker duravel. Avalie o padrao outbox quando persistencia e publicacao precisarem ser coordenadas.

## 12. Modulo 10: escalonamento horizontal

Execute duas ou mais instancias da API atras de um load balancer. A API precisa ser stateless:

- nao guardar sessao somente em memoria local;
- nao depender de arquivo local;
- compartilhar cache quando necessario;
- externalizar tarefas e estado;
- responder health checks;
- tratar graceful shutdown.

O banco continua sendo um recurso compartilhado. Escalar a API nao significa que o banco, o pool ou uma dependencia externa escalam automaticamente.

Teste desligando uma instancia durante carga e observe se as outras continuam atendendo. Verifique tambem duplicidade de mensagens, afinidade de sessao e distribuicao de requisicoes.

### Aula pratica: executar duas instancias

1. Inicie a API em duas portas diferentes.
2. Coloque um proxy ou load balancer na frente.
3. Envie requisicoes e confirme a distribuicao.
4. Desligue uma instancia durante a carga.
5. Confirme que a outra continua atendendo.
6. Verifique que sessao, cache e filas nao dependem da memoria local.

O banco, o pool e as dependencias externas continuam sendo recursos compartilhados. Health checks devem diferenciar processo vivo de aplicacao pronta.

## 13. Modulo 11: observabilidade

Sem medicao, nao existe argumento tecnico para dizer que a API ficou melhor.

Registre e acompanhe:

- throughput, por exemplo requisicoes por segundo;
- latencia p50, p95 e p99;
- taxa de erros por endpoint;
- respostas `409`, `429` e `5xx`;
- CPU e memoria;
- tempo de consulta ao banco;
- conexoes em uso e aguardando;
- tamanho da fila e idade da mensagem mais antiga;
- acertos e erros do cache.

Use logs estruturados, metricas e tracing distribuido. Nunca grave senha, token, connection string ou dados pessoais desnecessarios nos logs.

### Aula pratica: criar uma linha de base

Antes de otimizar, registre o mesmo cenario de carga com RPS, p50, p95, p99, erros, CPU, memoria, tempo de SQL, conexoes, cache e fila. Adicione correlation id aos logs para acompanhar uma requisicao entre Angular, API e banco. Depois de cada mudanca, repita o mesmo cenario.

## 14. Modulo 12: teste de carga

Crie um cenario inicial com:

- maioria de `GET` paginado;
- uma parcela menor de `POST`;
- alguns conflitos concorrentes;
- limite de requisicoes conhecido;
- banco com massa de dados realista.

Registre uma linha de base antes das melhorias. Depois compare cada experimento:

```text
Versao       RPS       p95       Erros       CPU API       CPU banco
Inicial      ...       ...       ...         ...           ...
Com indice   ...       ...       ...         ...           ...
Com cache    ...       ...       ...         ...           ...
```

Ferramentas possiveis: k6, NBomber, JMeter ou bombardier. Comece em ambiente local e nunca execute carga destrutiva contra producao sem autorizacao e limites definidos.

### Execucao do experimento

Comece com poucos usuarios virtuais e aumente gradualmente. Misture GET paginado, POST e conflitos no mesmo teste somente depois de medir cada caso isoladamente. Pare quando o ambiente atingir o limite definido e registre os resultados para comparar uma mudanca por vez.

## 15. CQRS: quando introduzir

CQRS separa comandos, que alteram estado, de queries, que leem estado. O CRUD atual pode continuar usando um banco e uma aplicacao; a separacao pode ser apenas de handlers e modelos.

Introduza CQRS quando houver necessidade real de:

- modelos de leitura diferentes do modelo de escrita;
- escalas muito diferentes entre leitura e escrita;
- regras de comando complexas;
- read model especializado;
- evolucao independente dos dois fluxos.

Nao introduza CQRS apenas para deixar a arquitetura mais sofisticada. Para o projeto de contatos, ele sera inicialmente um exercicio de desenho e, somente depois, uma implementacao pequena e justificada.

### Exercicio pratico

Separe `CriarContatoCommand` de `ListarContatosQuery` em handlers diferentes, mantendo o mesmo banco. Compare a clareza antes e depois. Se nao houver ganho real, documente a decisao de manter o CRUD simples.

## 16. Event Sourcing: quando introduzir

Event Sourcing grava eventos imutaveis, como `ContatoCriado` e `ContatoAtualizado`, em vez de tratar apenas a tabela atual como historico.

Ele pode ser adequado quando auditoria, historico completo, reconstruibilidade e integracao orientada a eventos forem requisitos centrais. Tambem traz custos:

- eventos precisam ser versionados;
- o estado pode exigir projections;
- consultas ficam mais complexas;
- consistencia pode ser eventual;
- corrigir eventos exige disciplina;
- armazenamento e operacao ficam maiores.

O CRUD de contatos nao precisa de Event Sourcing para resolver alto volume. A aula deve mostrar essa decisao arquitetural e explicar por que a solucao mais simples e preferivel neste momento.

### Exercicio pratico

Desenhe `ContatoCriado`, `ContatoAtualizado`, uma projection e um replay. Liste os custos de versionar eventos, reconstruir estado e lidar com consistencia eventual. Nao substitua o CRUD: o objetivo e justificar a decisao arquitetural.

## 17. Onde entram virtual threads

Virtual threads sao um recurso do Java, nao do .NET. Elas permitem muitas tarefas bloqueantes de I/O com custo menor de threads tradicionais.

Para este projeto C#/.NET, o foco equivalente e:

- `async`/`await`;
- APIs de I/O assincronas;
- ThreadPool;
- cancelamento;
- limites de concorrencia;
- pool de conexoes.

Virtual threads nao resolvem conflitos de dados, banco saturado, falta de indices ou duplicidade. Na entrevista, explique que a tecnologia depende da plataforma e que o principio geral e evitar bloqueio e controlar recursos.

### Exercicio de comparacao

Implemente a mesma espera de I/O com `Thread.Sleep` e `Task.Delay`. Execute carga concorrente e observe a ocupacao de threads. Explique que virtual threads sao uma tecnologia Java; neste backend C#/.NET, o equivalente pratico e I/O assincrono com cancelamento e controle de recursos.

## 18. Ordem oficial de execucao

Execute as etapas nesta ordem e marque cada uma somente apos validar:

```text
1. Confirmar backend, banco, Swagger e proxy
2. Corrigir build e testes basicos do Angular
3. Garantir CRUD assincrono com DTOs e cancelamento
4. Criar testes de integracao
5. Medir duas escritas concorrentes sem protecao
6. Implementar rowversion e retornar 409 Conflict
7. Adicionar idempotencia para comandos repetidos
8. Implementar paginacao, filtros, projecao e indices
9. Medir connection pooling e timeouts
10. Configurar rate limiting e resiliencia
11. Adicionar cache de leitura e invalidacao
12. Mover trabalho demorado para fila e worker
13. Executar varias instancias stateless
14. Instrumentar logs, metricas e tracing
15. Repetir teste de carga e comparar resultados
16. Avaliar CQRS e Event Sourcing como decisoes, nao como obrigacao
```

## 19. Criterio final de pronto

O projeto estara pronto para apresentar em uma entrevista quando voce conseguir demonstrar:

1. uma requisicao normal funcionando;
2. o problema de lost update reproduzido por teste;
3. o mesmo teste retornando `409 Conflict` com optimistic locking;
4. uma listagem paginada com indice justificado;
5. rate limiting retornando `429`;
6. cache reduzindo leituras repetidas sem dados incorretos;
7. fila processando uma tarefa fora da requisicao;
8. duas instancias atendendo sem estado local;
9. metricas antes e depois das alteracoes;
10. uma explicacao clara de por que CQRS, Event Sourcing e virtual threads nao foram aplicados automaticamente.

## 20. Resposta final para treinar

> Eu comecaria medindo o gargalo e identificando se a concorrencia esta em leituras, escritas do mesmo recurso, dependencias externas ou processamento demorado. No .NET, usaria I/O assincrono com `async`/`await`, cancelamento e limites de timeout. Para escritas concorrentes, usaria transacoes, constraints, idempotencia e optimistic locking com `rowversion`, retornando `409 Conflict` em caso de conflito.
>
> Para leituras de alto volume, usaria consultas projetadas, indices, paginacao e cache distribuido quando apropriado. Protegeria a API com rate limiting, health checks, observabilidade e circuit breaker. Operacoes demoradas seriam delegadas a filas e workers idempotentes. Se necessario, escalaria horizontalmente instancias stateless atras de um load balancer, cuidando do banco, do pool de conexoes e das dependencias.
>
> Eu validaria a solucao com testes de integracao, testes concorrentes e teste de carga, acompanhando p95, p99, taxa de erros, conexoes e consumo de recursos. CQRS e Event Sourcing seriam considerados apenas se os requisitos justificassem a complexidade. Virtual threads nao seriam aplicaveis diretamente porque este projeto usa .NET; aqui o equivalente pratico e o modelo assincrono da plataforma.

Essa resposta mostra que voce sabe escolher a tecnica de acordo com o problema, em vez de apenas listar palavras-chave.
