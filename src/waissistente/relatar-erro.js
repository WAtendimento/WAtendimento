const { criaLogger } = require('../utils/logger');

/**
 * Grava um relato de erro vindo da conversa e avisa quem acompanha.
 *
 * Mesmo fluxo da tela de relatar erro do LevOps: um registro no evento
 * relatar_erros e um aviso no WhatsApp. A diferenca e a origem, que aqui e a
 * conversa e nao um registro de operacao, entao no lugar do identificador do
 * embarque vao a sessao e o canal.
 *
 * Quem decide se o relato acontece e o prompt, nao este arquivo: a funcao so
 * roda quando o modelo devolveu o campo preenchido, e o contrato de saida so
 * permite isso depois da pessoa confirmar.
 *
 * Nada aqui e de cliente: tenant, destino e nome vem de fora.
 */

function gerarCaseId(tenant) {
  // mesmo padrao do LevOps: TENANT-AAAAMMDD-HHMMSS-NNN
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // Brasilia
  const p = n => String(n).padStart(2, '0');
  const data = `${agora.getUTCFullYear()}${p(agora.getUTCMonth() + 1)}${p(agora.getUTCDate())}`;
  const hora = `${p(agora.getUTCHours())}${p(agora.getUTCMinutes())}${p(agora.getUTCSeconds())}`;
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `${String(tenant).toUpperCase()}-${data}-${hora}-${seq}`;
}

async function relatarErro({
  descricao,
  tenant,
  usuario,
  sessao,
  canal,
  supabaseLevops,
  credenciaisWAPI,
  destino,
  nomeCliente,
  evento = 'relatar_erros',
  logger,
}) {
  const log = logger || criaLogger(sessao);

  if (!descricao || !String(descricao).trim()) return null;

  if (!supabaseLevops || !tenant) {
    log.add('>>> [WAt] Relato de erro sem supabaseLevops ou tenant: nada feito.');
    return null;
  }

  const caseId = gerarCaseId(tenant);
  const email = usuario?.email || 'nao identificado';
  const nome = usuario?.nome || '';

  // grava primeiro: o aviso pode falhar, o registro nao pode se perder
  let gravou = false;

  try {
    const { error } = await supabaseLevops.from('events').insert({
      case_id: caseId,
      evento,
      tenant_id: tenant,
      operador_id: email,
      dados: {
        descricao: String(descricao).trim(),
        responsavel: email,
        nomeResponsavel: nome,
        origem: canal || 'bot',
        sessao: String(sessao || ''),
        data: new Date().toISOString(),
      },
    });

    if (error) {
      log.add('>>> [WAt] Relato NAO gravado: ' + error.message);
    } else {
      gravou = true;
      log.add('>>> [WAt] Relato gravado: ' + caseId);
    }
  } catch (e) {
    log.add('>>> [WAt] Erro ao gravar relato: ' + e.message);
  }

  // sem destino o relato fica gravado e ninguem e avisado, que e melhor que
  // perder o registro
  if (!destino) {
    log.add('>>> [WAt] Relato sem destino de aviso: so gravado.');
    return { caseId, gravou, avisou: false };
  }

  const texto =
    '*Relato de erro no bot' + (nomeCliente ? ' da ' + nomeCliente : '') + '*\n' +
    String(descricao).trim() +
    '\n\nQuem relatou: ' + (nome ? nome + ' (' + email + ')' : email) +
    '\nOnde: ' + (canal || 'bot') +
    '\nRegistro: ' + (gravou ? caseId : 'FALHOU AO GRAVAR') +
    '\nSessao: ' + String(sessao || '');

  let avisou = false;

  try {
    const r = await fetch(
      `https://api.w-api.app/v1/message/send-text?instanceId=${credenciaisWAPI.instance_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + credenciaisWAPI.token,
        },
        body: JSON.stringify({ phone: String(destino), message: texto }),
      }
    );

    // a API devolve 200 mesmo quando descarta na entrega, entao o corpo da
    // resposta entra no log: sem ele o diagnostico fica impossivel
    const corpo = await r.text();
    avisou = r.ok;
    log.add('>>> [WAt] Aviso de relato: HTTP ' + r.status + ' | ' + corpo.slice(0, 200));
  } catch (e) {
    log.add('>>> [WAt] Aviso de relato falhou: ' + e.message);
  }

  return { caseId, gravou, avisou };
}

module.exports = { relatarErro };