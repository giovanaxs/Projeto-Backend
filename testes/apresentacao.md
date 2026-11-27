Parte 1 — Cadastro e Unicidade (201 e 409)
1. Cadastrar um usuário novo → 201 Created
POST http://localhost:3000/auth/cadastro
Body → raw → JSON:
json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "cpf": "52998224725",
  "senha": "Senha123"
}
2. Mesmo e-mail em MAIÚSCULAS → 409 Conflict
POST http://localhost:3000/auth/cadastro
Body → raw → JSON:
json
{
  "nome": "Outra Pessoa",
  "email": "MARIA@EMAIL.COM",
  "cpf": "39053344705",
  "senha": "Senha123"
}
3. Mesmo CPF com pontuação → 409 Conflict
POST http://localhost:3000/auth/cadastro
Body → raw → JSON:
json
{
  "nome": "Outra Pessoa",
  "email": "outra@email.com",
  "cpf": "529.982.247-25",
  "senha": "Senha123"
}
Parte 2 — Login, Proteção (401) e Isolamento (404)
4. Login com demo2 → 200 OK
POST http://localhost:3000/auth/login
Body → raw → JSON:
json
{
  "email": "demo2@exemplo.com",
  "senha": "Senha123"
}
Copie o token da resposta.
5. Requisição protegida SEM token → 401 Unauthorized
GET http://localhost:3000/lancamentos
Authorization: No Auth → Send
6. Ler lançamento de outro usuário → 404 Not Found
GET http://localhost:3000/lancamentos/1
Authorization → Bearer Token: cole o token do demo2 → Send
7. Alterar lançamento de outro usuário → 404 Not Found
PUT http://localhost:3000/lancamentos/1 (com o token do demo2)
Body → raw → JSON:
json
{
  "tipo": "saida",
  "descricao": "Tentativa indevida",
  "valor": 50,
  "data": "2026-11-26",
  "categoria_id": 5,
  "fonte_destino_id": 3
}
8. Excluir lançamento de outro usuário → 404 Not Found
DELETE http://localhost:3000/lancamentos/1 (com o token do demo2) → Send


# CRUD categorias, fontes/destinos e lançamentos, incluindo uma compra parcelada no cartão e uma validação que falha

1.1. Cadastrar categoria

POST http://localhost:3000/categorias

{
  "nome": "Compras",
  "tipo": "saida"
}

1.2. Listar categorias

GET http://localhost:3000/categorias

1.3. Filtrar categorias por tipo

GET http://localhost:3000/categorias?tipo=saida

1.4. Atualizar categoria

PUT http://localhost:3000/categorias/ID_CATEGORIA

{
  "nome": "Compras pessoais",
  "tipo": "saida"
}

1.5. Excluir categoria

DELETE http://localhost:3000/categorias/ID_CATEGORIA

2. CRUD — Fontes e destinos

2.1. Cadastrar cartão de crédito

POST http://localhost:3000/fontes-destinos

{
  "nome": "Cartão de crédito",
  "tipo": "cartao_credito",
  "dia_fechamento": 10,
  "dia_vencimento": 17,
  "limite": 3000
}

2.2. Listar fontes e destinos

GET http://localhost:3000/fontes-destinos

2.3. Filtrar cartões de crédito

GET http://localhost:3000/fontes-destinos?tipo=cartao_credito

2.4. Atualizar cartão

PUT http://localhost:3000/fontes-destinos/ID_CARTAO

{
  "nome": "Cartão principal",
  "tipo": "cartao_credito",
  "dia_fechamento": 10,
  "dia_vencimento": 17,
  "limite": 3500
}

2.5. Excluir fonte ou destino

DELETE http://localhost:3000/fontes-destinos/ID_FONTE_DESTINO

3. CRUD — Lançamentos
*pegar ID de categoria e fonte-destinos

3.1. Cadastrar compra parcelada

POST http://localhost:3000/lancamentos

{
  "tipo": "saida",
  "descricao": "Compra de notebook",
  "valor": 2400,
  "data": "2026-11-27",
  "categoria_id": ID_CATEGORIA_SAIDA,
  "fonte_destino_id": ID_CARTAO,
  "total_parcelas": 6
}

Resultado esperado: seis parcelas de R$ 400,00, associadas ao mesmo grupo de compra.

3.2. Listar lançamentos

GET http://localhost:3000/lancamentos

3.3. Filtrar lançamentos por período

GET http://localhost:3000/lancamentos?inicio=2026-11-01&fim=2026-11-30

3.4. Consultar lançamento específico

GET http://localhost:3000/lancamentos/ID_LANCAMENTO

3.5. Atualizar lançamento

PUT http://localhost:3000/lancamentos/ID_LANCAMENTO

{
  "tipo": "saida",
  "descricao": "Compra de notebook atualizada",
  "valor": 2400,
  "data": "2026-11-27",
  "categoria_id": ID_CATEGORIA_SAIDA,
  "fonte_destino_id": ID_CARTAO
}

3.6. Excluir lançamento

DELETE http://localhost:3000/lancamentos/ID_LANCAMENTO

Excluir todas as parcelas de uma compra:

DELETE http://localhost:3000/lancamentos/ID_LANCAMENTO?todasParcelas=true

4. Validação — Categoria incompatível

Tentativa de cadastrar uma saída utilizando uma categoria de entrada.

POST http://localhost:3000/lancamentos

{
  "tipo": "saida",
  "descricao": "Teste de validação",
  "valor": 100,
  "data": "2026-11-27",
  "categoria_id": ID_CATEGORIA_ENTRADA,
  "fonte_destino_id": ID_CARTAO,
  "total_parcelas": 1
}

Resultado esperado: HTTP 400 — categoria incompatível com o tipo do lançamento.

5. Relatório por categoria

GET http://localhost:3000/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30

6. Relatório por fonte/destino

GET http://localhost:3000/relatorios/fontes-destinos?inicio=2026-11-01&fim=2026-11-30

7. Previsão de faturas

Consultar previsão para seis meses:

GET http://localhost:3000/relatorios/faturas?meses=6

Verificar no retorno:

Cartão utilizado.

Limite total.

Limite utilizado.

Limite disponível.

Data de fechamento.

Data de vencimento.

Lançamentos de cada fatura.

Valor de cada fatura.

Localizar a compra: Compra de notebook.

Conferir em quais faturas aparecem as seis parcelas de R$ 400,00.