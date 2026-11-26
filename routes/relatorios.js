
const express = require('express');
const router = express.Router();

const protegerRota = require('../middleware/auth');
const Relatorio = require('../models/Relatorio');

router.use(protegerRota);

router.get('/faturas', async (req, res) => {
  try {
    const meses = req.query.meses === undefined
      ? 3
      : Number(req.query.meses);

    if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
      return res.status(400).json({
        erro: 'O parâmetro meses deve ser um número inteiro entre 1 e 12.'
      });
    }

    const resultado = await Relatorio.faturas(req.auth.id, meses);

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao consultar faturas:', erro);

    return res.status(500).json({
      erro: 'Erro ao consultar relatório de faturas.'
    });
  }
});


function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataObj = new Date(Date.UTC(ano, mes - 1, dia));

  return dataObj.getUTCFullYear() === ano &&
    dataObj.getUTCMonth() === mes - 1 &&
    dataObj.getUTCDate() === dia;
}

router.get('/categorias', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim || !dataValida(inicio) || !dataValida(fim)) {
      return res.status(400).json({
        erro: 'Informe datas válidas nos parâmetros inicio e fim (AAAA-MM-DD).'
      });
    }

    if (inicio > fim) {
      return res.status(400).json({
        erro: 'A data inicial não pode ser maior que a data final.'
      });
    }

    const resultado = await Relatorio.categorias(
      req.auth.id,
      inicio,
      fim
    );

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao consultar relatório por categorias:', erro);

    return res.status(500).json({
      erro: 'Erro ao consultar relatório por categorias.'
    });
  }
});

router.get('/fontes-destinos', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim || !dataValida(inicio) || !dataValida(fim)) {
      return res.status(400).json({
        erro: 'Informe datas válidas nos parâmetros inicio e fim (AAAA-MM-DD).'
      });
    }

    if (inicio > fim) {
      return res.status(400).json({
        erro: 'A data inicial não pode ser maior que a data final.'
      });
    }

    const resultado = await Relatorio.fontesDestinos(
      req.auth.id,
      inicio,
      fim
    );

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao consultar relatório de fontes e destinos:', erro);

    return res.status(500).json({
      erro: 'Erro ao consultar relatório de fontes e destinos.'
    });
  }
});


module.exports = router;
