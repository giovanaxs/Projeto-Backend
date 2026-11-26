const pool = require('../database/connection');
const bcrypt = require('bcrypt');

async function cadastrar({ nome, email, cpf, senha }) {
    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();

        // Verifica se o e-mail já está cadastrado
        const [emailExistente] = await conexao.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (emailExistente.length > 0) {
            const erro = new Error('E-mail já cadastrado.');
            erro.status = 409;
            erro.campo = 'email';
            throw erro;
        }

        // Verifica se o CPF já está cadastrado
        const [cpfExistente] = await conexao.execute(
            'SELECT id FROM usuarios WHERE cpf = ?',
            [cpf]
        );

        if (cpfExistente.length > 0) {
            const erro = new Error('CPF já cadastrado.');
            erro.status = 409;
            erro.campo = 'cpf';
            throw erro;
        }

        // Criptografa a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o usuário
        const [resultado] = await conexao.execute(
            `INSERT INTO usuarios (nome, email, cpf, senha_hash)
             VALUES (?, ?, ?, ?)`,
            [nome, email, cpf, senhaHash]
        );

        const usuarioId = resultado.insertId;

        // Categorias padrão
        const categorias = [
            ['Salário', 'entrada'],
            ['Outras entradas', 'entrada'],
            ['Alimentação', 'saida'],
            ['Moradia', 'saida'],
            ['Saúde', 'saida'],
            ['Mobilidade', 'saida'],
            ['Lazer', 'saida'],
            ['Educação', 'saida'],
            ['Outras saídas', 'saida']
        ];

        for (const [nomeCategoria, tipo] of categorias) {
            await conexao.execute(
                `INSERT INTO categorias (usuario_id, nome, tipo)
                 VALUES (?, ?, ?)`,
                [usuarioId, nomeCategoria, tipo]
            );
        }

        // Conta corrente padrão
        await conexao.execute(
            `INSERT INTO fontes_destinos (usuario_id, nome, tipo)
             VALUES (?, ?, ?)`,
            [usuarioId, 'Conta corrente', 'conta']
        );

        await conexao.commit();

        return {
            id: usuarioId,
            nome,
            email
        };

    } catch (erro) {
        await conexao.rollback();
        throw erro;

    } finally {
        conexao.release();
    }
}

module.exports = { cadastrar };
