// script.js
// O navegador so envia o numero e o token do Google para /api/desenho
// e exibe o SVG devolvido pelo servidor.

const CLIENT_ID = "874671716411-v6il7apv21knmb09ftpqtbsfskvk3m0h.apps.googleusercontent.com";

const secaoLogin = document.getElementById("login");
const textoUsuario = document.getElementById("usuario");
const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");

let idToken = "";
let svgAtual = "";

function emailDoToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json).email || "";
  } catch {
    return "";
  }
}

function mostrarLogado() {
  const email = emailDoToken(idToken);
  textoUsuario.textContent = email ? `Conectado como ${email}` : "Conectado com o Google";
  textoUsuario.hidden = false;
  secaoLogin.hidden = true;
  formulario.hidden = false;
}

function mostrarDeslogado() {
  idToken = "";
  textoUsuario.hidden = true;
  formulario.hidden = true;
  secaoLogin.hidden = false;
}

function aoReceberCredencial(resposta) {
  idToken = resposta.credential;
  mensagem.textContent = "";
  mostrarLogado();
}

function iniciarGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    setTimeout(iniciarGoogle, 200);
    return;
  }
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: aoReceberCredencial,
  });
  google.accounts.id.renderButton(document.getElementById("botao-google"), {
    theme: "filled_black",
    size: "large",
    text: "signin_with",
  });
}

if (document.readyState === "complete") {
  iniciarGoogle();
} else {
  window.addEventListener("load", iniciarGoogle);
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";

  const numero = Number(campoNumero.value);

  let resposta;
  try {
    resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ numero }),
    });
  } catch {
    mensagem.textContent = "Não foi possível falar com o servidor. Tente novamente.";
    return;
  }

  if (resposta.status === 400) {
    mensagem.textContent = "Erro 400: digite um número inteiro entre 1 e 100.";
    return;
  }
  if (resposta.status === 401) {
    mensagem.textContent = "Erro 401: sessão inválida ou expirada. Entre com o Google novamente.";
    mostrarDeslogado();
    return;
  }
  if (!resposta.ok) {
    mensagem.textContent = `Erro ${resposta.status}: não foi possível gerar o desenho.`;
    return;
  }

  svgAtual = await resposta.text();
  area.innerHTML = svgAtual;
  botaoBaixar.hidden = false;
});

botaoBaixar.addEventListener("click", () => {
  const arquivo = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  link.click();
  URL.revokeObjectURL(url);
});