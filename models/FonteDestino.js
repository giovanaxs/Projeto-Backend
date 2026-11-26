const pool = require('../database/connection');

async function listar(usuarioId, tipo) {
    let sql = `
        SELECT id, nome, tipo, dia_fechamento,
               dia_vencimento, limite
        FROM fontes_destinos
        WHERE usuario_id = ?
    `;

    const parametros = [usuarioId];

    if (tipo) {
        sql += ' AND tipo = ?';
        parametros.push(tipo);
    }

    sql += ' ORDER BY nome';

    const [resultado] = await pool.execute(sql, parametros);

    return resultado;
}

async function buscarPorId(id, usuarioId) {
    const [resultado] = await pool.execute(
        `SELECT id, nome, tipo, dia_fechamento,
                dia_vencimento, limite
         FROM fontes_destinos
         WHERE id = ? AND usuario_id = ?`,
        [id, usuarioId]
    );

    return resultado[0] || null;
}

async function criar(usuarioId, dados) {
    const {
        nome,
        tipo,
        dia_fechamento,
        dia_vencimento,
        limite
    } = dados;

    const [resultado] = await pool.execute(
        `INSERT INTO fontes_destinos
         (usuario_id, nome, tipo, dia_fechamento,
          dia_vencimento, limite)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            usuarioId,
            nome,
            tipo,
            dia_fechamento ?? null,
            dia_vencimento ?? null,
            limite ?? null
        ]
    );

    return buscarPorId(resultado.insertId, usuarioId);
}

async function atualizar(id, usuarioId, dados) {
    const {
        nome,
        tipo,
        dia_fechamento,
        dia_vencimento,
        limite
    } = dados;

    await pool.execute(
        `UPDATE fontes_destinos
         SET nome = ?, tipo = ?, dia_fechamento = ?,
             dia_vencimento = ?, limite = ?
         WHERE id = ? AND usuario_id = ?`,
        [
            nome,
            tipo,
            dia_fechamento ?? null,
            dia_vencimento ?? null,
            limite ?? null,
            id,
            usuarioId
        ]
    );

    return buscarPorId(id, usuarioId);
}

async function excluir(id, usuarioId) {
    const [resultado] = await pool.execute(
        `DELETE FROM fontes_destinos
         WHERE id = ? AND usuario_id = ?`,
        [id, usuarioId]
    );

    return resultado.affectedRows > 0;
}

async function nomeExiste(usuarioId, nome, ignorarId = null) {
    let sql = `
        SELECT id
        FROM fontes_destinos
        WHERE usuario_id = ? AND nome = ?
    `;

    const parametros = [usuarioId, nome];

    if (ignorarId !== null) {
        sql += ' AND id != ?';
        parametros.push(ignorarId);
    }

    const [resultado] = await pool.execute(sql, parametros);

    return resultado.length > 0;
}

async function possuiLancamentos(id, usuarioId) {
    const [resultado] = await pool.execute(
        `SELECT id
         FROM lancamentos
         WHERE fonte_destino_id = ? AND usuario_id = ?
         LIMIT 1`,
        [id, usuarioId]
    );

    return resultado.length > 0;
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir,
    nomeExiste,
    possuiLancamentos
};
