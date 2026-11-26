
const pool = require('../database/connection');

async function listar(usuarioId, tipo) {
    let sql = `
        SELECT id, nome, tipo
        FROM categorias
        WHERE usuario_id = ?
    `;

    const parametros = [usuarioId];

    if (tipo) {
        sql += ' AND tipo = ?';
        parametros.push(tipo);
    }

    sql += ' ORDER BY nome';

    const [categorias] = await pool.execute(sql, parametros);

    return categorias;
}

async function buscarPorId(id, usuarioId) {
    const [categorias] = await pool.execute(
        `SELECT id, nome, tipo
         FROM categorias
         WHERE id = ? AND usuario_id = ?`,
        [id, usuarioId]
    );

    return categorias[0] || null;
}

async function criar(usuarioId, nome, tipo) {
    const [resultado] = await pool.execute(
        `INSERT INTO categorias (usuario_id, nome, tipo)
         VALUES (?, ?, ?)`,
        [usuarioId, nome, tipo]
    );

    return buscarPorId(resultado.insertId, usuarioId);
}

async function atualizar(id, usuarioId, nome, tipo) {
    await pool.execute(
        `UPDATE categorias
         SET nome = ?, tipo = ?
         WHERE id = ? AND usuario_id = ?`,
        [nome, tipo, id, usuarioId]
    );

    return buscarPorId(id, usuarioId);
}

async function excluir(id, usuarioId) {
    const [resultado] = await pool.execute(
        `DELETE FROM categorias
         WHERE id = ? AND usuario_id = ?`,
        [id, usuarioId]
    );

    return resultado.affectedRows > 0;
}

async function nomeExiste(usuarioId, nome, tipo, ignorarId = null) {
    let sql = `
        SELECT id
        FROM categorias
        WHERE usuario_id = ? AND nome = ? AND tipo = ?
    `;

    const parametros = [usuarioId, nome, tipo];

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
         WHERE categoria_id = ? AND usuario_id = ?
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
