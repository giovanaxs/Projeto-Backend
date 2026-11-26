USE api_financas;

-- =====================================
-- 1. USUÁRIOS DE DEMONSTRAÇÃO
-- Senha dos dois: Senha123
-- =====================================

INSERT IGNORE INTO usuarios (nome, email, cpf, senha_hash)
VALUES
(
    'Usuário Demonstração 1',
    'demo1@exemplo.com',
    '93541134780',
    '$2b$10$/zU6lqU.7XWRYkQz.wwG5uL.kZdIucB4uVUCp81/iuecI/fVNbCk.'
),
(
    'Usuário Demonstração 2',
    'demo2@exemplo.com',
    '11144477735',
    '$2b$10$/zU6lqU.7XWRYkQz.wwG5uL.kZdIucB4uVUCp81/iuecI/fVNbCk.'
);

-- =====================================
-- 2. CATEGORIAS DOS USUÁRIOS
-- =====================================

INSERT IGNORE INTO categorias (usuario_id, nome, tipo)
SELECT u.id, c.nome, c.tipo
FROM usuarios u
CROSS JOIN (
    SELECT 'Salário' AS nome, 'entrada' AS tipo
    UNION ALL SELECT 'Outras entradas', 'entrada'
    UNION ALL SELECT 'Alimentação', 'saida'
    UNION ALL SELECT 'Moradia', 'saida'
    UNION ALL SELECT 'Saúde', 'saida'
    UNION ALL SELECT 'Mobilidade', 'saida'
    UNION ALL SELECT 'Lazer', 'saida'
    UNION ALL SELECT 'Educação', 'saida'
    UNION ALL SELECT 'Outras saídas', 'saida'
) c
WHERE u.email IN ('demo1@exemplo.com', 'demo2@exemplo.com');

-- =====================================
-- 3. FONTES E DESTINOS
-- =====================================

INSERT IGNORE INTO fontes_destinos (usuario_id, nome, tipo)
SELECT id, 'Conta Demonstração', 'conta'
FROM usuarios
WHERE email = 'demo1@exemplo.com';

INSERT IGNORE INTO fontes_destinos
(usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
SELECT id, 'Cartão Demonstração', 'cartao_credito', 10, 17, 3000.00
FROM usuarios
WHERE email = 'demo1@exemplo.com';

INSERT IGNORE INTO fontes_destinos (usuario_id, nome, tipo)
SELECT id, 'Conta Demonstração 2', 'conta'
FROM usuarios
WHERE email = 'demo2@exemplo.com';

-- =====================================
-- 4. LANÇAMENTOS DE DEMONSTRAÇÃO
-- =====================================

-- Agosto: salário
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id)
SELECT u.id, 'entrada', 'Salário de agosto', 3500.00,
       '2026-08-15', '2026-08-15', c.id, f.id
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Salário'
  AND f.nome = 'Conta Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.usuario_id = u.id
        AND l.descricao = 'Salário de agosto'
  );

-- Agosto: alimentação
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id)
SELECT u.id, 'saida', 'Mercado de agosto', 450.00,
       '2026-08-18', '2026-08-18', c.id, f.id
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Alimentação'
  AND f.nome = 'Conta Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.usuario_id = u.id
        AND l.descricao = 'Mercado de agosto'
  );

-- Setembro: salário
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id)
SELECT u.id, 'entrada', 'Salário de setembro', 3500.00,
       '2026-09-15', '2026-09-15', c.id, f.id
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Salário'
  AND f.nome = 'Conta Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.usuario_id = u.id
        AND l.descricao = 'Salário de setembro'
  );

-- Outubro: salário
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id)
SELECT u.id, 'entrada', 'Salário de outubro', 3500.00,
       '2026-10-15', '2026-10-15', c.id, f.id
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Salário'
  AND f.nome = 'Conta Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.usuario_id = u.id
        AND l.descricao = 'Salário de outubro'
  );

-- =====================================
-- 5. COMPRA PARCELADA NO CARTÃO
-- Compra de R$ 100,00 em 3 parcelas
-- =====================================

-- Parcela 1
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id, parcela_atual,
 total_parcelas, grupo_parcelamento)
SELECT u.id, 'saida', 'Compra parcelada de demonstração',
       33.34, '2026-11-26', '2026-11-26',
       c.id, f.id, 1, 3,
       '11111111-1111-4111-8111-111111111111'
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Alimentação'
  AND f.nome = 'Cartão Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.grupo_parcelamento =
        '11111111-1111-4111-8111-111111111111'
        AND l.parcela_atual = 1
  );

-- Parcela 2
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id, parcela_atual,
 total_parcelas, grupo_parcelamento)
SELECT u.id, 'saida', 'Compra parcelada de demonstração',
       33.33, '2026-12-26', '2026-11-26',
       c.id, f.id, 2, 3,
       '11111111-1111-4111-8111-111111111111'
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Alimentação'
  AND f.nome = 'Cartão Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.grupo_parcelamento =
        '11111111-1111-4111-8111-111111111111'
        AND l.parcela_atual = 2
  );

-- Parcela 3
INSERT INTO lancamentos
(usuario_id, tipo, descricao, valor, data, data_compra,
 categoria_id, fonte_destino_id, parcela_atual,
 total_parcelas, grupo_parcelamento)
SELECT u.id, 'saida', 'Compra parcelada de demonstração',
       33.33, '2027-01-26', '2026-11-26',
       c.id, f.id, 3, 3,
       '11111111-1111-4111-8111-111111111111'
FROM usuarios u
JOIN categorias c ON c.usuario_id = u.id
JOIN fontes_destinos f ON f.usuario_id = u.id
WHERE u.email = 'demo1@exemplo.com'
  AND c.nome = 'Alimentação'
  AND f.nome = 'Cartão Demonstração'
  AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.grupo_parcelamento =
        '11111111-1111-4111-8111-111111111111'
        AND l.parcela_atual = 3
  );

