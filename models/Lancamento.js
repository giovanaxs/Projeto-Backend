const pool = require('../database/connection');
const { adicionarMeses } = require('../utils/faturas');

async function listar(usuarioId, filtros) {
  let sql = `
    SELECT
      l.id,
      l.tipo,
      l.descricao,
      l.valor,
      l.data,
      l.categoria_id,
      c.nome AS categoria,
      l.fonte_destino_id,
      f.nome AS fonte_destino,
      l.parcela_atual,
      l.total_parcelas,
      l.grupo_parcelamento
    FROM lancamentos l
    INNER JOIN categorias c ON c.id = l.categoria_id
    INNER JOIN fontes_destinos f ON f.id = l.fonte_destino_id
    WHERE l.usuario_id = ?
  `;

  const valores = [usuarioId];

  if (filtros.tipo) {
    sql += ' AND l.tipo = ?';
    valores.push(filtros.tipo);
  }

  if (filtros.categoria_id) {
    sql += ' AND l.categoria_id = ?';
    valores.push(filtros.categoria_id);
  }

  if (filtros.fonte_destino_id) {
    sql += ' AND l.fonte_destino_id = ?';
    valores.push(filtros.fonte_destino_id);
  }

  if (filtros.inicio) {
    sql += ' AND l.data >= ?';
    valores.push(filtros.inicio);
  }

  if (filtros.fim) {
    sql += ' AND l.data <= ?';
    valores.push(filtros.fim);
  }

  sql += ' ORDER BY l.data DESC, l.id DESC';

  const pagina = Number(filtros.pagina) || 1;
  const limite = 20;
  const deslocamento = (pagina - 1) * limite;

  sql += ' LIMIT ? OFFSET ?';
  valores.push(limite, deslocamento);

  const [linhas] = await pool.execute(sql, valores);
  return linhas;
}

async function buscarPorId(id, usuarioId) {
  const [linhas] = await pool.execute(
    `SELECT * FROM lancamentos
     WHERE id = ? AND usuario_id = ?`,
    [id, usuarioId]
  );

  return linhas[0] || null;
}


async function criar(usuarioId, dados) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const totalParcelas = dados.total_parcelas || 1;
    const grupo = totalParcelas > 1
      ? require('crypto').randomUUID()
      : null;

    // Converte o valor para centavos para evitar erros de arredondamento
    const valorCentavos = Math.round(Number(dados.valor) * 100);
    const valorBase = Math.floor(valorCentavos / totalParcelas);
    const resto = valorCentavos % totalParcelas;

    const ids = [];

    for (let i = 0; i < totalParcelas; i++) {
      const valorParcela = valorBase + (i === 0 ? resto : 0);

      const [resultado] = await conexao.execute(
        `INSERT INTO lancamentos
            (usuario_id, tipo, descricao, valor, data, data_compra,
            categoria_id, fonte_destino_id, parcela_atual,
            total_parcelas, grupo_parcelamento)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            usuarioId,
            dados.tipo,
            dados.descricao,
            (valorParcela / 100).toFixed(2),
            adicionarMeses(dados.data, i),
            dados.data,
            dados.categoria_id,
            dados.fonte_destino_id,
            i + 1,
            totalParcelas,
            grupo
        ]
        );

      ids.push(resultado.insertId);
    }

    await conexao.commit();

    const lancamentos = [];

    for (const id of ids) {
      const [linhas] = await pool.execute(
        'SELECT * FROM lancamentos WHERE id = ? AND usuario_id = ?',
        [id, usuarioId]
      );

      lancamentos.push(linhas[0]);
    }

    return totalParcelas === 1 ? lancamentos[0] : lancamentos;

  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}


async function atualizar(id, usuarioId, dados) {
  await pool.execute(
    `UPDATE lancamentos
     SET tipo = ?, descricao = ?, valor = ?, data = ?,
         categoria_id = ?, fonte_destino_id = ?
     WHERE id = ? AND usuario_id = ?`,
    [
      dados.tipo,
      dados.descricao,
      dados.valor,
      dados.data,
      dados.categoria_id,
      dados.fonte_destino_id,
      id,
      usuarioId
    ]
  );

  return buscarPorId(id, usuarioId);
}


async function excluir(id, usuarioId, todasParcelas = false) {
  if (todasParcelas) {
    const lancamento = await buscarPorId(id, usuarioId);

    if (!lancamento) {
      return false;
    }

    if (lancamento.grupo_parcelamento) {
      const [resultado] = await pool.execute(
        `DELETE FROM lancamentos
         WHERE grupo_parcelamento = ?
         AND usuario_id = ?`,
        [lancamento.grupo_parcelamento, usuarioId]
      );

      return resultado.affectedRows > 0;
    }
  }

  const [resultado] = await pool.execute(
    'DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );

  return resultado.affectedRows > 0;
}


async function validarCategoria(categoriaId, usuarioId, tipo) {
  const [linhas] = await pool.execute(
    `SELECT id FROM categorias
     WHERE id = ? AND usuario_id = ? AND tipo = ?`,
    [categoriaId, usuarioId, tipo]
  );

  return linhas.length > 0;
}

async function validarFonteDestino(fonteDestinoId, usuarioId) {
  const [linhas] = await pool.execute(
    `SELECT id, tipo FROM fontes_destinos
     WHERE id = ? AND usuario_id = ?`,
    [fonteDestinoId, usuarioId]
  );

  return linhas[0] || null;
}

async function resumo(usuarioId, inicio, fim) {
  const [linhas] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS total_entradas,
       COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicio, fim]
  );

  const entradas = Number(linhas[0].total_entradas);
  const saidas = Number(linhas[0].total_saidas);

  return {
    total_entradas: entradas,
    total_saidas: saidas,
    saldo: entradas - saidas
  };
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  excluir,
  validarCategoria,
  validarFonteDestino,
  resumo
};
