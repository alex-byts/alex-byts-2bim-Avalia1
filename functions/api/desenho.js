import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

function erro(status, mensagem, extras = {}) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extras,
    },
  });
}

async function verificarToken(token, clientId) {
  const url =
    "https://oauth2.googleapis.com/tokeninfo?id_token=" +
    encodeURIComponent(token);
  const resposta = await fetch(url);
  if (resposta.status !== 200) return null;

  const info = await resposta.json();

  if (!clientId || info.aud !== clientId) return null;
  if (String(info.email_verified) !== "true") return null;
  if (typeof info.email !== "string" || info.email === "") return null;

  return info;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return erro(405, "Metodo nao permitido. Use POST.", { Allow: "POST" });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Corpo ausente ou JSON invalido.");
  }
  if (corpo === null || typeof corpo !== "object" || !numeroValido(corpo.numero)) {
    return erro(400, "O campo numero deve ser um inteiro entre 1 e 100.");
  }

  const cabecalho = request.headers.get("Authorization") || "";
  const partes = cabecalho.match(/^Bearer\s+(\S+)$/i);
  if (!partes) {
    return erro(401, "Token ausente.");
  }

  let info;
  try {
    info = await verificarToken(partes[1], env.GOOGLE_CLIENT_ID);
  } catch {
    return erro(502, "Nao foi possivel consultar o Google.");
  }
  if (!info) {
    return erro(401, "Token invalido, expirado ou e-mail nao verificado.");
  }

  const svg = gerarDesenho(corpo.numero, info.email);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}