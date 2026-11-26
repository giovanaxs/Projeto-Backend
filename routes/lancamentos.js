
const express = require('express');
const router = express.Router();

const Lancamento = require('../models/Lancamento');
const protegerRota = require('../middleware/auth');

router.use(protegerRota);

function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataTeste = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    dataTeste.getUTCFullYear() === ano &&
    dataTeste.getUTCMonth() === mes - 1 &&
    dataTeste.getUTCDate() === dia
  );
}

router.get('/', async (req, res) => {
  try {
    const { tipo, categoria_id, fonte_destino_id, inicio, fim, pagina } = req.query;

    if (tipo && !['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    if (categoria_id && (!Number.isInteger(Number(categoria_id)) || Number(categoria_id) <= 0)) {
      return res.status(400).json({ erro: 'Categoria inválida.' });
    }

    if (fonte_destino_id && (!Number.isInteger(Number(fonte_destino_id)) || Number(fonte_destino_id) <= 0)) {
      return res.status(400).json({ erro: 'Fonte ou destino inválido.' });
    }

    if (pagina && (!Number.isInteger(Number(pagina)) || Number(pagina) < 1)) {
      return res.status(400).json({ erro: 'Página inválida.' });
    }

    if (inicio && !dataValida(inicio)) {
      return res.status(400).json({ erro: 'Data inicial inválida.' });
    }

    if (fim && !dataValida(fim)) {
      return res.status(400).json({ erro: 'Data final inválida.' });
    }

    if (inicio && fim && inicio > fim) {
      return res.status(400).json({ erro: 'A data inicial não pode ser posterior à final.' });
    }

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');

    const filtros = {
      tipo,
      categoria_id,
      fonte_destino_id,
      inicio: inicio || `${ano}-${mes}-01`,
      fim: fim || `${ano}-${mes}-${new Date(ano, agora.getMonth() + 1, 0).getDate()}`,
      pagina
    };

    const lancamentos = await Lancamento.listar(req.auth.id, filtros);
    const totais = await Lancamento.resumo(req.auth.id, filtros.inicio, filtros.fim);

    return res.status(200).json({
      lancamentos,
      totais,
      pagina: Number(filtros.pagina) || 1
    });
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao listar lançamentos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const lancamento = await Lancamento.buscarPorId(id, req.auth.id);

    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    return res.status(200).json(lancamento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao consultar lançamento.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
        tipo,
        descricao,
        valor,
        data,
        categoria_id,
        fonte_destino_id,
        total_parcelas = 1
    } = req.body;

    if (!tipo || !descricao || valor === undefined || !data || !categoria_id || !fonte_destino_id) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (!['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    if (typeof descricao !== 'string' || !descricao.trim()) {
      return res.status(400).json({ erro: 'Descrição inválida.' });
    }

    if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
      return res.status(400).json({ erro: 'O valor deve ser maior que zero.' });
    }

    if (
    !Number.isInteger(Number(total_parcelas)) ||
    Number(total_parcelas) < 1 ||
    Number(total_parcelas) > 48
    ) {
    return res.status(400).json({
        erro: 'O número de parcelas deve estar entre 1 e 48.'
    });
    }

    
    if (!dataValida(data)) {
    return res.status(400).json({ erro: 'Data inválida. Use o formato YYYY-MM-DD.' });
    }

    if (
      !Number.isInteger(Number(categoria_id)) || Number(categoria_id) <= 0 ||
      !Number.isInteger(Number(fonte_destino_id)) || Number(fonte_destino_id) <= 0
    ) {
      return res.status(400).json({ erro: 'Categoria ou fonte/destino inválido.' });
    }

    const categoriaValida = await Lancamento.validarCategoria(
      Number(categoria_id),
      req.auth.id,
      tipo
    );

    if (!categoriaValida) {
      return res.status(404).json({ erro: 'Categoria não encontrada para esse tipo de lançamento.' });
    }

    const fonte = await Lancamento.validarFonteDestino(
    Number(fonte_destino_id),
    req.auth.id
    );

    if (Number(total_parcelas) > 1 && fonte.tipo !== 'cartao_credito') {
    return res.status(400).json({
        erro: 'Compras parceladas só podem ser realizadas com cartão de crédito.'
    });
    }

    if (!fonte) {
      return res.status(404).json({ erro: 'Fonte ou destino não encontrado.' });
    }

    const novo = await Lancamento.criar(req.auth.id, {
      tipo,
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
      categoria_id: Number(categoria_id),
      fonte_destino_id: Number(fonte_destino_id),
      total_parcelas: Number(total_parcelas)
    });

    return res.status(201).json(novo);
  } catch (erro) {
  console.error('Erro ao cadastrar lançamento:', erro);

  return res.status(500).json({
    erro: 'Erro ao cadastrar lançamento.'
  });
}
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const existente = await Lancamento.buscarPorId(id, req.auth.id);

    if (!existente) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    const {
      tipo,
      descricao,
      valor,
      data,
      categoria_id,
      fonte_destino_id
    } = req.body;

    if (!tipo || !descricao || valor === undefined || !data || !categoria_id || !fonte_destino_id) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (!['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    if (typeof descricao !== 'string' || !descricao.trim()) {
      return res.status(400).json({ erro: 'Descrição inválida.' });
    }

    if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
      return res.status(400).json({ erro: 'O valor deve ser maior que zero.' });
    }

    if (!dataValida(data)) {
      return res.status(400).json({ erro: 'Data inválida.' });
    }

    if (
      !Number.isInteger(Number(categoria_id)) || Number(categoria_id) <= 0 ||
      !Number.isInteger(Number(fonte_destino_id)) || Number(fonte_destino_id) <= 0
    ) {
      return res.status(400).json({ erro: 'Categoria ou fonte/destino inválido.' });
    }

    if (!await Lancamento.validarCategoria(Number(categoria_id), req.auth.id, tipo)) {
      return res.status(404).json({ erro: 'Categoria não encontrada para esse tipo de lançamento.' });
    }

    if (!await Lancamento.validarFonteDestino(Number(fonte_destino_id), req.auth.id)) {
      return res.status(404).json({ erro: 'Fonte ou destino não encontrado.' });
    }

    const atualizado = await Lancamento.atualizar(id, req.auth.id, {
      tipo,
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
      categoria_id: Number(categoria_id),
      fonte_destino_id: Number(fonte_destino_id)
    });

    return res.status(200).json(atualizado);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao atualizar lançamento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const existente = await Lancamento.buscarPorId(id, req.auth.id);

    if (!existente) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    const todasParcelas = req.query.todasParcelas === 'true';

    await Lancamento.excluir(id, req.auth.id, todasParcelas);

    return res.status(204).send();
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao excluir lançamento.' });
  }
});

module.exports = router;
