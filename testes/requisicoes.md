# Documentação de Requisições — API de Controle Financeiro

As requisições foram realizadas utilizando o Postman, com o objetivo de verificar o funcionamento das rotas, autenticação, validações e operações no banco de dados.

**Endereço base:**

```text
http://localhost:3000
```

## 1. Autenticação

### 1.1. Cadastro de usuário

**Método:** POST

**Rota:** `/auth/cadastro`

**Body (JSON):**

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "cpf": "52998224725",
  "senha": "Senha123"
}
```

**Resposta esperada:** 201 Created.

O sistema cadastra o usuário, armazena a senha utilizando bcrypt e cria suas categorias padrão e uma fonte de destino inicial.

### 1.2. Login

**Método:** POST

**Rota:** `/auth/login`

**Body (JSON):**

```json
{
  "email": "demo1@exemplo.com",
  "senha": "Senha123"
}
```

**Resposta esperada:** 200 OK.

Retorna os dados do usuário e o token JWT utilizado para acessar as rotas protegidas.

### 1.3. Consultar usuário autenticado

**Método:** GET

**Rota:** `/auth/me`

**Autenticação:** Bearer Token.

**Resposta esperada:** 200 OK.

Retorna os dados do usuário autenticado, sem expor a senha criptografada.

## 2. Categorias

As rotas de categorias exigem autenticação.

### 2.1. Listar categorias

**Método:** GET

**Rota:** `/categorias`

**Resposta esperada:** 200 OK.

Também é possível filtrar pelo tipo:

```text
GET /categorias?tipo=saida
```

### 2.2. Criar categoria

**Método:** POST

**Rota:** `/categorias`

**Body (JSON):**

```json
{
  "nome": "Viagens",
  "tipo": "saida"
}
```

**Resposta esperada:** 201 Created.

### 2.3. Atualizar categoria

**Método:** PUT

**Rota:** `/categorias/:id`

**Body (JSON):**

```json
{
  "nome": "Viagens e passeios",
  "tipo": "saida"
}
```

**Resposta esperada:** 200 OK.

### 2.4. Excluir categoria

**Método:** DELETE

**Rota:** `/categorias/:id`

**Resposta esperada:** 204 No Content.

Uma categoria vinculada a lançamentos não pode ser excluída.

## 3. Fontes e destinos

Todas as rotas exigem autenticação.

### 3.1. Listar fontes e destinos

**Método:** GET

**Rota:** `/fontes-destinos`

**Resposta esperada:** 200 OK.

### 3.2. Criar fonte ou destino

**Método:** POST

**Rota:** `/fontes-destinos`

**Exemplo de conta:**

```json
{
  "nome": "Minha conta",
  "tipo": "conta"
}
```

**Exemplo de cartão de crédito:**

```json
{
  "nome": "Cartão de crédito",
  "tipo": "cartao_credito",
  "dia_fechamento": 10,
  "dia_vencimento": 17,
  "limite": 3000
}
```

**Resposta esperada:** 201 Created.

### 3.3. Atualizar fonte ou destino

**Método:** PUT

**Rota:** `/fontes-destinos/:id`

**Body (JSON):**

```json
{
  "nome": "Conta atualizada",
  "tipo": "conta"
}
```

**Resposta esperada:** 200 OK.

### 3.4. Excluir fonte ou destino

**Método:** DELETE

**Rota:** `/fontes-destinos/:id`

**Resposta esperada:** 204 No Content.

Uma fonte ou destino vinculado a lançamentos não pode ser excluído.

## 4. Lançamentos financeiros

Todas as rotas exigem autenticação.

### 4.1. Listar lançamentos

**Método:** GET

**Rota:** `/lancamentos`

**Resposta esperada:** 200 OK.

A listagem permite filtros e paginação, e apresenta os totais de entradas, saídas e saldo do período.

### 4.2. Consultar lançamento por ID

**Método:** GET

**Rota:** `/lancamentos/:id`

**Resposta esperada:** 200 OK.

### 4.3. Criar lançamento

**Método:** POST

**Rota:** `/lancamentos`

**Exemplo de entrada:**

```json
{
  "tipo": "entrada",
  "descricao": "Salário",
  "valor": 3500,
  "data": "2026-11-15",
  "categoria_id": 1,
  "fonte_destino_id": 2
}
```

**Exemplo de saída parcelada no cartão:**

```json
{
  "tipo": "saida",
  "descricao": "Compra parcelada",
  "valor": 100,
  "data": "2026-11-26",
  "categoria_id": 3,
  "fonte_destino_id": 4,
  "total_parcelas": 3
}
```

**Resposta esperada:** 201 Created.

Nas compras parceladas, o sistema cria um lançamento para cada parcela, distribui os centavos corretamente e associa as parcelas por um identificador de grupo.

Os IDs de categoria e fonte/destino devem corresponder aos registros cadastrados para o usuário autenticado.

### 4.4. Atualizar lançamento

**Método:** PUT

**Rota:** `/lancamentos/:id`

**Resposta esperada:** 200 OK.

### 4.5. Excluir lançamento

**Método:** DELETE

**Rota:** `/lancamentos/:id`

**Resposta esperada:** 204 No Content.

Para excluir todas as parcelas de uma compra:

```text
DELETE /lancamentos/:id?todasParcelas=true
```

## 5. Relatórios financeiros

Todas as rotas exigem autenticação.

### 5.1. Relatório por categorias

**Método:** GET

**Rota:**

```text
/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30
```

Apresenta:

- Total de entradas.
- Total de saídas.
- Valores por categoria.
- Percentual de cada categoria.
- Comparação com o período anterior.

**Resposta esperada:** 200 OK.

### 5.2. Relatório por fontes e destinos

**Método:** GET

**Rota:**

```text
/relatorios/fontes-destinos?inicio=2026-08-01&fim=2026-10-31
```

Apresenta os totais de entradas e saídas por fonte ou destino e o saldo das contas.

**Resposta esperada:** 200 OK.

### 5.3. Relatório de faturas

**Método:** GET

**Rota:**

```text
/relatorios/faturas?meses=3
```

Apresenta:

- Cartões cadastrados.
- Faturas futuras.
- Datas de fechamento e vencimento.
- Compras e parcelas de cada fatura.
- Limite total.
- Limite utilizado.
- Limite disponível.

**Resposta esperada:** 200 OK.

O parâmetro `meses` permite definir a quantidade de meses consultados, de 1 a 12.

## 6. Validações e tratamento de erros

A API utiliza códigos HTTP para indicar o resultado das operações.

| Código | Significado | Exemplo |
|---|---|---|
| 200 | OK | Consulta ou atualização realizada |
| 201 | Created | Cadastro realizado |
| 204 | No Content | Exclusão realizada |
| 400 | Bad Request | Dados inválidos |
| 401 | Unauthorized | Token ausente ou inválido |
| 404 | Not Found | Registro não encontrado |
| 409 | Conflict | E-mail, CPF ou nome duplicado |
| 500 | Internal Server Error | Erro interno |

### 6.1. Testes de validações, isolamento (RF3) e segurança

#### 6.1.1. Cadastro com e-mail duplicado (letras maiúsculas)

**Método:** POST

**Rota:** `/auth/cadastro`

**Body (JSON):**

```json
{
  "nome": "Outro Usuário",
  "email": "DEMO1@EXEMPLO.COM",
  "cpf": "39053344705",
  "senha": "Senha123"
}
```

**Resposta esperada:** `409 Conflict` (o sistema normaliza o e-mail para minúsculas antes de verificar duplicidade).

#### 6.1.2. Cadastro com CPF duplicado (com pontuação)

**Método:** POST

**Rota:** `/auth/cadastro`

**Body (JSON):**

```json
{
  "nome": "Outro Usuário",
  "email": "novo@exemplo.com",
  "cpf": "111.444.777-35",
  "senha": "Senha123"
}
```

**Resposta esperada:** `409 Conflict` (o sistema remove pontos e traço do CPF antes de validar e consultar no banco).

#### 6.1.3. Requisição protegida sem token

**Método:** GET

**Rota:** `/lancamentos`

**Headers:** sem `Authorization: Bearer <token>`.

**Resposta esperada:** `401 Unauthorized`.

#### 6.1.4. Tentativa de consultar lançamento de outro usuário (RF3)

**Método:** GET

**Rota:** `/lancamentos/1` *(autenticado com o token do `demo2@exemplo.com`, tentando acessar um lançamento pertencente ao `demo1@exemplo.com`)*

**Resposta esperada:** `404 Not Found`.

#### 6.1.5. Tentativa de alterar lançamento de outro usuário (RF3)

**Método:** PUT

**Rota:** `/lancamentos/1` *(autenticado com o token do `demo2@exemplo.com`)*

**Body (JSON):**

```json
{
  "tipo": "saida",
  "descricao": "Tentativa indevida",
  "valor": 50,
  "data": "2026-11-26",
  "categoria_id": 10,
  "fonte_destino_id": 3
}
```

**Resposta esperada:** `404 Not Found`.

#### 6.1.6. Tentativa de excluir lançamento de outro usuário (RF3)

**Método:** DELETE

**Rota:** `/lancamentos/1` *(autenticado com o token do `demo2@exemplo.com`)*

**Resposta esperada:** `404 Not Found`.

#### 6.1.7. Tentativa de cadastrar saída usando categoria de entrada

**Método:** POST

**Rota:** `/lancamentos` *(autenticado com o token do `demo1@exemplo.com`, informando o ID da categoria `Salário`, que é do tipo `entrada`)*

**Body (JSON):**

```json
{
  "tipo": "saida",
  "descricao": "Despesa com categoria incompatível",
  "valor": 120,
  "data": "2026-11-26",
  "categoria_id": 1,
  "fonte_destino_id": 1
}
```

**Resposta esperada:** `400 Bad Request` (falha de validação por incompatibilidade entre o tipo do lançamento e o tipo da categoria).

## 7. Segurança

Durante os testes, foram consideradas as seguintes regras:

- Senhas armazenadas com bcrypt.
- Autenticação utilizando JWT.
- Proteção das rotas financeiras.
- Consultas filtradas pelo usuário autenticado.
- Não exposição da senha criptografada.
- Verificação de propriedade dos registros.
- Validação dos dados recebidos nas requisições.

## 8. Ferramenta utilizada

**Postman:** utilizado para executar as requisições HTTP, enviar dados em JSON, configurar o Bearer Token e verificar as respostas retornadas pela API.
