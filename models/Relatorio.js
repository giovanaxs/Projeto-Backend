const pool = require('../database/connection');
const { calcularFatura } = require('../utils/faturas');


async function faturas(usuarioId, meses = 3) {
  const [cartoes] = await pool.execute(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite
     FROM fontes_destinos
     WHERE usuario_id = ? AND tipo = 'cartao_credito'`,
    [usuarioId]
  );

  const hoje = new Date();
  const hojeISO = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, '0'),
    String(hoje.getDate()).padStart(2, '0')
  ].join('-');

  // Calcula a data limite sem problemas em meses com menos dias
  const diaHoje = hoje.getDate();
  const dataLimite = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + meses,
    1
  );
  const ultimoDia = new Date(
    dataLimite.getFullYear(),
    dataLimite.getMonth() + 1,
    0
  ).getDate();

  dataLimite.setDate(Math.min(diaHoje, ultimoDia));

  const limiteDataISO = [
    dataLimite.getFullYear(),
    String(dataLimite.getMonth() + 1).padStart(2, '0'),
    String(dataLimite.getDate()).padStart(2, '0')
  ].join('-');

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
    let limiteUtilizado = 0;

    for (const lancamento of lancamentos) {
      const datas = calcularFatura(
        lancamento.data,
        cartao.dia_fechamento,
        cartao.dia_vencimento
      );

      const valor = Number(lancamento.valor);

      // Soma todas as parcelas com vencimento futuro
      if (datas.vencimento >= hojeISO) {
        limiteUtilizado += valor;
      }

      // Exibe somente as faturas dentro do período solicitado
      if (
        datas.vencimento < hojeISO ||
        datas.vencimento > limiteDataISO
      ) {
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

    const limiteTotal = Number(cartao.limite);

    resultado.push({
      cartao: cartao.nome,
      cartao_id: cartao.id,
      limite_total: limiteTotal,
      limite_utilizado: Number(limiteUtilizado.toFixed(2)),
      limite_disponivel: Number(
        (limiteTotal - limiteUtilizado).toFixed(2)
      ),
      faturas: faturasCartao
    });
  }

  return resultado;
}




async function categorias(usuarioId, inicio, fim) {
  // Calcula o período anterior com a mesma duração
  const dataInicio = new Date(`${inicio}T00:00:00Z`);
  const dataFim = new Date(`${fim}T00:00:00Z`);

  const duracao = Math.round(
    (dataFim - dataInicio) / (1000 * 60 * 60 * 24)
  ) + 1;

  const dataFimAnterior = new Date(dataInicio);
  dataFimAnterior.setUTCDate(dataFimAnterior.getUTCDate() - 1);

  const dataInicioAnterior = new Date(dataFimAnterior);
  dataInicioAnterior.setUTCDate(
    dataInicioAnterior.getUTCDate() - duracao + 1
  );

  const formatarData = (data) => data.toISOString().slice(0, 10);

  const inicioAnterior = formatarData(dataInicioAnterior);
  const fimAnterior = formatarData(dataFimAnterior);

  // Dados das categorias no período atual
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

  // Totais do período atual
  const [totais] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS total_entradas,
       COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicio, fim]
  );

  // Totais por categoria no período anterior
  const [linhasAnteriores] = await pool.execute(
    `SELECT
       categoria_id,
       COALESCE(SUM(valor), 0) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?
     GROUP BY categoria_id`,
    [usuarioId, inicioAnterior, fimAnterior]
  );

  // Totais gerais do período anterior
  const [totaisAnteriores] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS total_entradas,
       COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicioAnterior, fimAnterior]
  );

  const totalEntradas = Number(totais[0].total_entradas);
  const totalSaidas = Number(totais[0].total_saidas);

  const totalEntradasAnterior = Number(
    totaisAnteriores[0].total_entradas
  );
  const totalSaidasAnterior = Number(
    totaisAnteriores[0].total_saidas
  );

  // Calcula a variação percentual
  const calcularVariacao = (atual, anterior) => {
    if (anterior === 0) {
      return atual === 0 ? 0 : null;
    }

    return Number(
      (((atual - anterior) / anterior) * 100).toFixed(2)
    );
  };

  const categoriasFormatadas = linhas.map((linha) => {
    const total = Number(linha.total);

    const categoriaAnterior = linhasAnteriores.find(
      (item) => item.categoria_id === linha.categoria_id
    );

    const totalAnterior = categoriaAnterior
      ? Number(categoriaAnterior.total)
      : 0;

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
        : 0,
      total_periodo_anterior: totalAnterior,
      variacao_percentual: calcularVariacao(total, totalAnterior)
    };
  });

  return {
    periodo: { inicio, fim },
    periodo_anterior: {
      inicio: inicioAnterior,
      fim: fimAnterior
    },
    total_entradas: totalEntradas,
    total_saidas: totalSaidas,
    comparacao_periodo_anterior: {
      total_entradas: totalEntradasAnterior,
      total_saidas: totalSaidasAnterior,
      variacao_entradas: calcularVariacao(
        totalEntradas,
        totalEntradasAnterior
      ),
      variacao_saidas: calcularVariacao(
        totalSaidas,
        totalSaidasAnterior
      )
    },
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
