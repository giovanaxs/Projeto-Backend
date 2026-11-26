const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const { expressjwt } = require('express-jwt');

const protegerRota = expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256']
});

const Usuario = require('../models/Usuario');
const { cpfValido } = require('../utils/cpf');

router.post('/cadastro', async (req, res) => {
    try {
        let { nome, email, cpf, senha } = req.body;

        if (!nome || !email || !cpf || !senha) {
            return res.status(400).json({
                erro: 'Todos os campos são obrigatórios.',
                campos: ['nome', 'email', 'cpf', 'senha']
            });
        }

        nome = nome.trim();
        email = email.trim().toLowerCase();
        cpf = String(cpf).replace(/\D/g, '');

        if (!nome) {
            return res.status(400).json({
                erro: 'O nome não pode estar vazio.'
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({
                erro: 'E-mail inválido.',
                campos: ['email']
            });
        }

        if (!cpfValido(cpf)) {
            return res.status(400).json({
                erro: 'CPF inválido.',
                campos: ['cpf']
            });
        }

        const senhaValida = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!senhaValida.test(senha)) {
            return res.status(400).json({
                erro: 'A senha deve ter pelo menos 8 caracteres, uma letra e um número.',
                campos: ['senha']
            });
        }

        const usuario = await Usuario.cadastrar({
            nome,
            email,
            cpf,
            senha
        });

        return res.status(201).json(usuario);

    } catch (erro) {
        console.error(erro);

        return res.status(erro.status || 500).json({
            erro: erro.message || 'Erro interno do servidor.',
            ...(erro.campo ? { campos: [erro.campo] } : {})
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        let { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'E-mail e senha são obrigatórios.'
            });
        }

        email = email.trim().toLowerCase();

        const [usuarios] = await pool.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const usuario = usuarios[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso.',
            token
        });

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: 'Erro interno do servidor.'
        });
    }
});

router.get('/me', protegerRota, async (req, res) => {
    try {
        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, cpf, criado_em
             FROM usuarios
             WHERE id = ?`,
            [req.auth.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        return res.status(200).json(usuarios[0]);

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: 'Erro interno do servidor.'
        });
    }
});

module.exports = router;
