
const express = require('express');
const router = express.Router();

const FonteDestino = require('../models/FonteDestino');
const protegerRota = require('../middleware/auth');

router.use(protegerRota);

router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;

    if (tipo && !['renda', 'conta', 'cartao_credito'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    const dados = await FonteDestino.listar(req.auth.id, tipo);
    return res.status(200).json(dados);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao listar fontes e destinos.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, tipo, dia_fechamento, dia_vencimento, limite } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ erro: 'Nome e tipo são obrigatórios.' });
    }

    if (!['renda', 'conta', 'cartao_credito'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    if (tipo === 'cartao_credito') {
      if (
        !Number.isInteger(Number(dia_fechamento)) ||
        !Number.isInteger(Number(dia_vencimento)) ||
        Number(dia_fechamento) < 1 || Number(dia_fechamento) > 31 ||
        Number(dia_vencimento) < 1 || Number(dia_vencimento) > 31 ||
        !Number.isFinite(Number(limite)) ||
        Number(limite) <= 0
      ) {
        return res.status(400).json({
          erro: 'Cartão exige dias de fechamento e vencimento entre 1 e 31 e limite maior que zero.'
        });
      }
    }

    const nomeFormatado = nome.trim();

    if (!nomeFormatado) {
      return res.status(400).json({ erro: 'Nome inválido.' });
    }

    if (await FonteDestino.nomeExiste(req.auth.id, nomeFormatado)) {
      return res.status(409).json({ erro: 'Já existe uma fonte ou destino com esse nome.' });
    }

    const novo = await FonteDestino.criar(req.auth.id, {
      nome: nomeFormatado,
      tipo,
      dia_fechamento: tipo === 'cartao_credito' ? Number(dia_fechamento) : null,
      dia_vencimento: tipo === 'cartao_credito' ? Number(dia_vencimento) : null,
      limite: tipo === 'cartao_credito' ? Number(limite) : null
    });

    return res.status(201).json(novo);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao cadastrar fonte ou destino.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, tipo, dia_fechamento, dia_vencimento, limite } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    if (!nome || !tipo || !['renda', 'conta', 'cartao_credito'].includes(tipo)) {
      return res.status(400).json({ erro: 'Nome e tipo válidos são obrigatórios.' });
    }

    if (tipo === 'cartao_credito') {
      if (
        !Number.isInteger(Number(dia_fechamento)) ||
        !Number.isInteger(Number(dia_vencimento)) ||
        Number(dia_fechamento) < 1 || Number(dia_fechamento) > 31 ||
        Number(dia_vencimento) < 1 || Number(dia_vencimento) > 31 ||
        !Number.isFinite(Number(limite)) ||
        Number(limite) <= 0
      ) {
        return res.status(400).json({ erro: 'Dados do cartão inválidos.' });
      }
    }

    const nomeFormatado = nome.trim();

    if (!nomeFormatado) {
      return res.status(400).json({ erro: 'Nome inválido.' });
    }

    const existente = await FonteDestino.buscarPorId(id, req.auth.id);

    if (!existente) {
      return res.status(404).json({ erro: 'Fonte ou destino não encontrado.' });
    }

    if (await FonteDestino.nomeExiste(req.auth.id, nomeFormatado, id)) {
      return res.status(409).json({ erro: 'Já existe uma fonte ou destino com esse nome.' });
    }

    const atualizado = await FonteDestino.atualizar(id, req.auth.id, {
      nome: nomeFormatado,
      tipo,
      dia_fechamento: tipo === 'cartao_credito' ? Number(dia_fechamento) : null,
      dia_vencimento: tipo === 'cartao_credito' ? Number(dia_vencimento) : null,
      limite: tipo === 'cartao_credito' ? Number(limite) : null
    });

    return res.status(200).json(atualizado);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao atualizar fonte ou destino.' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const existente = await FonteDestino.buscarPorId(id, req.auth.id);

    if (!existente) {
      return res.status(404).json({ erro: 'Fonte ou destino não encontrado.' });
    }

    if (await FonteDestino.possuiLancamentos(id, req.auth.id)) {
      return res.status(409).json({
        erro: 'Não é possível excluir uma fonte ou destino que possui lançamentos.'
      });
    }

    await FonteDestino.excluir(id, req.auth.id);

    return res.status(204).send();
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao excluir fonte ou destino.' });
  }
});

module.exports = router;
