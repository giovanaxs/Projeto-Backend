const express = require('express');
const router = express.Router();

const Categoria = require('../models/Categoria');
const protegerRota = require('../middleware/auth');

// Todas as rotas deste arquivo exigem autenticação
router.use(protegerRota);

// GET /categorias
router.get('/', async (req, res) => {
    try {
        const { tipo } = req.query;

        if (tipo && !['entrada', 'saida'].includes(tipo)) {
            return res.status(400).json({
                erro: 'Tipo deve ser entrada ou saida.'
            });
        }

        const categorias = await Categoria.listar(
            req.auth.id,
            tipo
        );

        return res.status(200).json(categorias);

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: 'Erro ao listar categorias.'
        });
    }
});

// POST /categorias
router.post('/', async (req, res) => {
    try {
        let { nome, tipo } = req.body;

        if (!nome || !tipo) {
            return res.status(400).json({
                erro: 'Nome e tipo são obrigatórios.'
            });
        }

        nome = nome.trim();

        if (!nome || !['entrada', 'saida'].includes(tipo)) {
            return res.status(400).json({
                erro: 'Nome ou tipo inválido.'
            });
        }

        const existe = await Categoria.nomeExiste(
            req.auth.id,
            nome,
            tipo
        );

        if (existe) {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome e tipo.'
            });
        }

        const categoria = await Categoria.criar(
            req.auth.id,
            nome,
            tipo
        );

        return res.status(201).json(categoria);

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: 'Erro ao criar categoria.'
        });
    }
});

// PUT /categorias/:id
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        let { nome, tipo } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID inválido.'
            });
        }

        if (!nome || !tipo) {
            return res.status(400).json({
                erro: 'Nome e tipo são obrigatórios.'
            });
        }

        nome = nome.trim();

        if (!nome || !['entrada', 'saida'].includes(tipo)) {
            return res.status(400).json({
                erro: 'Nome ou tipo inválido.'
            });
        }

        const categoria = await Categoria.buscarPorId(
            id,
            req.auth.id
        );

        if (!categoria) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        const existe = await Categoria.nomeExiste(
            req.auth.id,
            nome,
            tipo,
            id
        );

        if (existe) {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome e tipo.'
            });
        }

        const atualizada = await Categoria.atualizar(
            id,
            req.auth.id,
            nome,
            tipo
        );

        return res.status(200).json(atualizada);

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: 'Erro ao atualizar categoria.'
        });
    }
});

// DELETE /categorias/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID inválido.'
            });
        }

        const categoria = await Categoria.buscarPorId(
            id,
            req.auth.id
        );

        if (!categoria) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        const possuiLancamentos = await Categoria.possuiLancamentos(
            id,
            req.auth.id
        );

        if (possuiLancamentos) {
            return res.status(409).json({
                erro: 'Não é possível excluir uma categoria vinculada a lançamentos.'
            });
        }

        await Categoria.excluir(id, req.auth.id);

        return res.status(204).send();

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: 'Erro ao excluir categoria.'
        });
    }
});

module.exports = router;
