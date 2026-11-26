function adicionarMeses(data, quantidade) {
  const [ano, mes, dia] = data.split('-').map(Number);

  const dataBase = new Date(Date.UTC(ano, mes - 1 + quantidade, 1));

  const ultimoDia = new Date(
    Date.UTC(dataBase.getUTCFullYear(), dataBase.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const diaFinal = Math.min(dia, ultimoDia);

  return [
    dataBase.getUTCFullYear(),
    String(dataBase.getUTCMonth() + 1).padStart(2, '0'),
    String(diaFinal).padStart(2, '0')
  ].join('-');
}

function calcularFatura(dataCompra, diaFechamento, diaVencimento) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);

  let mesFatura = mes;
  let anoFatura = ano;

  if (dia >= diaFechamento) {
    mesFatura++;

    if (mesFatura > 12) {
      mesFatura = 1;
      anoFatura++;
    }
  }

  const ultimoDia = new Date(
    Date.UTC(anoFatura, mesFatura, 0)
  ).getUTCDate();

  const fechamento = `${anoFatura}-${String(mesFatura).padStart(2, '0')}-${String(
    Math.min(diaFechamento, ultimoDia)
  ).padStart(2, '0')}`;

  let mesVencimento = mesFatura;
  let anoVencimento = anoFatura;

  if (diaVencimento <= diaFechamento) {
    mesVencimento++;

    if (mesVencimento > 12) {
      mesVencimento = 1;
      anoVencimento++;
    }
  }

  const ultimoDiaVencimento = new Date(
    Date.UTC(anoVencimento, mesVencimento, 0)
  ).getUTCDate();

  const vencimento = `${anoVencimento}-${String(mesVencimento).padStart(2, '0')}-${String(
    Math.min(diaVencimento, ultimoDiaVencimento)
  ).padStart(2, '0')}`;

  return { fechamento, vencimento };
}

module.exports = {
  adicionarMeses,
  calcularFatura
};
