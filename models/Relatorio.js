const pool = require('../database/connection');
const { calcularFatura } = require('../utils/faturas');

async function faturas(usuarioId, meses = 3) {
  // Busca os cartões de crédito do usuário
  const [cartoes] = await pool.execute(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite
     FROM fontes_destinos
     WHERE usuario_id = ? AND tipo = 'cartao_credito'`,
    [usuarioId]
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteData = new Date(hoje);
  limiteData.setMonth(limiteData.getMonth() + meses);

  const resultado = [];

  for (const cartao of cartoes) {
    const [lancamentos] = await pool.execute(
      `SELECT id, descricao, valor, data, data_compra,
              parcela_atual, total_parcelas
       FROM lancamentos
       WHERE usuario_id = ?
         AND fonte_destino_id = ?
         AND tipo = 'saida'
       ORDER BY data ASC`,
      [usuarioId, cartao.id]
    );

    const faturasMap = new Map();

    for (const lancamento of lancamentos) {
      const datas = calcularFatura(
        lancamento.data,
        cartao.dia_fechamento,
        cartao.dia_vencimento
      );

      const vencimento = new Date(`${datas.vencimento}T00:00:00Z`);

      if (vencimento < hoje || vencimento > limiteData) {
        continue;
      }

      const chave = datas.fechamento;

      if (!faturasMap.has(chave)) {
        faturasMap.set(chave, {
          fechamento: datas.fechamento,
          vencimento: datas.vencimento,
          itens: [],
          total: 0
        });
      }

      const fatura = faturasMap.get(chave);
      const valor = Number(lancamento.valor);

      fatura.itens.push({
        id: lancamento.id,
        descricao: lancamento.descricao,
        valor,
        data_compra: lancamento.data_compra,
        parcela_atual: lancamento.parcela_atual,
        total_parcelas: lancamento.total_parcelas
      });

      fatura.total += valor;
    }

    const faturasCartao = Array.from(faturasMap.values())
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    const utilizado = faturasCartao.reduce(
      (soma, fatura) => soma + fatura.total,
      0
    );

    const limiteTotal = Number(cartao.limite);

    resultado.push({
      cartao: cartao.nome,
      cartao_id: cartao.id,
      limite_total: limiteTotal,
      limite_utilizado: utilizado,
      limite_disponivel: limiteTotal - utilizado,
      faturas: faturasCartao
    });
  }

  return resultado;
}


async function categorias(usuarioId, inicio, fim) {
  const [linhas] = await pool.execute(
    `SELECT
       c.id AS categoria_id,
       c.nome AS categoria,
       c.tipo,
       COALESCE(SUM(l.valor), 0) AS total
     FROM categorias c
     LEFT JOIN lancamentos l
       ON l.categoria_id = c.id
       AND l.usuario_id = c.usuario_id
       AND l.data BETWEEN ? AND ?
     WHERE c.usuario_id = ?
     GROUP BY c.id, c.nome, c.tipo
     ORDER BY total DESC`,
    [inicio, fim, usuarioId]
  );

  const [totais] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS total_entradas,
       COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicio, fim]
  );

  const totalEntradas = Number(totais[0].total_entradas);
  const totalSaidas = Number(totais[0].total_saidas);

  const categoriasFormatadas = linhas.map((linha) => {
    const total = Number(linha.total);
    const totalTipo = linha.tipo === 'entrada'
      ? totalEntradas
      : totalSaidas;

    return {
      categoria_id: linha.categoria_id,
      categoria: linha.categoria,
      tipo: linha.tipo,
      total,
      percentual: totalTipo > 0
        ? Number(((total / totalTipo) * 100).toFixed(2))
        : 0
    };
  });

  return {
    periodo: { inicio, fim },
    total_entradas: totalEntradas,
    total_saidas: totalSaidas,
    categorias: categoriasFormatadas
  };
}

async function fontesDestinos(usuarioId, inicio, fim) {
  const [linhas] = await pool.execute(
    `SELECT
       fd.id AS fonte_destino_id,
       fd.nome,
       fd.tipo,
       COALESCE(SUM(
         CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END
       ), 0) AS total_entradas,
       COALESCE(SUM(
         CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END
       ), 0) AS total_saidas
     FROM fontes_destinos fd
     LEFT JOIN lancamentos l
       ON l.fonte_destino_id = fd.id
       AND l.usuario_id = fd.usuario_id
       AND l.data BETWEEN ? AND ?
     WHERE fd.usuario_id = ?
     GROUP BY fd.id, fd.nome, fd.tipo
     ORDER BY fd.nome`,
    [inicio, fim, usuarioId]
  );

  return linhas.map((linha) => {
    const entradas = Number(linha.total_entradas);
    const saidas = Number(linha.total_saidas);

    return {
      fonte_destino_id: linha.fonte_destino_id,
      nome: linha.nome,
      tipo: linha.tipo,
      total_entradas: entradas,
      total_saidas: saidas,
      saldo: linha.tipo === 'conta' ? entradas - saidas : null
    };
  });
}

module.exports = {
  faturas,
  categorias,
  fontesDestinos
};
