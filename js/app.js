import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZNc_VRpQ88UsxQstDD4GhQVu6eKxlbbQ",
  authDomain: "monely-d7338.firebaseapp.com",
  projectId: "monely-d7338",
  storageBucket: "monely-d7338.firebasestorage.app",
  messagingSenderId: "213507688759",
  appId: "1:213507688759:web:99c192db844dd2f10372b2",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

const loginArea = document.getElementById("loginArea");
const dashboard = document.getElementById("dashboard");

const rendaDesc = document.getElementById("rendaDesc");
const rendaValor = document.getElementById("rendaValor");

const contaDesc = document.getElementById("contaDesc");
const contaValor = document.getElementById("contaValor");
const contaVencimento = document.getElementById("contaVencimento");
const contaTipo = document.getElementById("contaTipo");

const saldoEl = document.getElementById("saldo");
const totalEntradas = document.getElementById("totalEntradas");
const totalSaidas = document.getElementById("totalSaidas");

const listaRendas = document.getElementById("listaRendas");
const listaContas = document.getElementById("listaContas");
const mesSelector = document.getElementById("mesSelector");

let mesAtual = new Date().toISOString().slice(0, 7);

async function atualizarListas() {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    listaRendas.innerHTML = "";
    listaContas.innerHTML = "";
    return;
  }

  const data = snap.data();

  listaRendas.innerHTML = "";
  listaContas.innerHTML = "";

  (data.rendas || []).forEach((r, index) => {
    const li = document.createElement("li");

    li.className = "list-group-item d-flex justify-content-between";

    li.innerHTML = `
<div>
  <strong>${r.desc}</strong><br>

  <span class="text-success">
    ${Number(r.valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}
  </span>
</div>

<div class="d-flex gap-2">
  <button class="btn btn-sm btn-primary"
    onclick="editarRenda(${index})">
    Editar
  </button>

  <button class="btn btn-sm btn-danger"
    onclick="removerRenda(${index})">
    Excluir
  </button>
</div>
`;

    listaRendas.appendChild(li);
  });

  (data.contas || [])
    .map((conta, index) => ({
      ...conta,
      originalIndex: index,
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "pendente" ? -1 : 1;
      }

      const dataA = a.vencimento
        ? new Date(a.vencimento + "T00:00:00")
        : new Date("2999-12-31T00:00:00");

      const dataB = b.vencimento
        ? new Date(b.vencimento + "T00:00:00")
        : new Date("2999-12-31T00:00:00");

      return dataA - dataB;
    })
    .forEach((c, index) => {
      const li = document.createElement("li");

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);

      let classeVencimento = "";
      let textoStatus = c.status;

      let vencimento = null;

      if (c.vencimento) {
        vencimento = new Date(c.vencimento + "T00:00:00");
      }

      const hojeStr = hoje.toISOString().split("T")[0];
      const amanhaStr = amanha.toISOString().split("T")[0];

      if (c.status !== "pago" && c.vencimento) {
        if (c.vencimento < hojeStr) {
          classeVencimento = "conta-vencida";
          textoStatus = "Vencida";
        } else if (c.vencimento === hojeStr) {
          classeVencimento = "conta-hoje";
          textoStatus = "Vence hoje";
        } else if (c.vencimento === amanhaStr) {
          classeVencimento = "conta-amanha";
          textoStatus = "Vence amanhã";
        }
      }

      li.className = `list-group-item d-flex justify-content-between align-items-center ${classeVencimento}`;

      li.innerHTML = `
<div>
  <strong>${c.desc}</strong><br>

  <span class="text-danger">
    ${Number(c.valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}
  </span>

  <br>

  <small>
  Vencimento: ${
    c.vencimento
      ? new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR")
      : "-"
  }
  </small>

  <br>

  <small class="${c.status === "pago" ? "text-success" : "text-warning"}">
    Status: ${textoStatus}
  </small>
</div>

<div class="d-flex gap-2">
  ${
    c.status !== "pago"
      ? `
        <button
          class="btn btn-sm btn-success"
          onclick="marcarPago(${c.originalIndex})"
        >
          Pago
        </button>

        <button
          class="btn btn-sm btn-primary"
          onclick="editarConta(${c.originalIndex})"
        >
          Editar
        </button>
      `
      : ""
  }

  <button
    class="btn btn-sm btn-danger"
    onclick="removerConta(${c.originalIndex})"
  >
    Excluir
  </button>
</div>
`;

      listaContas.appendChild(li);
    });
}

window.addRenda = async () => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  data.rendas.push({
    desc: rendaDesc.value,
    valor: Number(rendaValor.value),
  });

  await updateDoc(ref, { rendas: data.rendas });

  rendaDesc.value = "";
  rendaValor.value = "";

  calcularSaldo();
  atualizarListas();
};

window.addConta = async () => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  data.contas.push({
    desc: contaDesc.value,
    valor: Number(contaValor.value),
    tipo: contaTipo.value,
    vencimento: contaVencimento.value,
    status: "pendente",
  });

  await updateDoc(ref, { contas: data.contas });

  contaDesc.value = "";
  contaValor.value = "";
  contaVencimento.value = "";
  contaTipo.value = "fixa";

  calcularSaldo();
  atualizarListas();
};

window.editarConta = (index) => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  getDoc(ref).then((snap) => {
    const data = snap.data();
    const conta = data.contas[index];

    // preencher modal
    contaDesc.value = conta.desc;
    contaValor.value = conta.valor;
    contaVencimento.value = conta.vencimento;
    contaTipo.value = conta.tipo;

    // abrir modal
    const modal = new bootstrap.Modal(document.getElementById("modalConta"));
    modal.show();

    // sobrescrever botão salvar para atualizar
    const salvarBtn = document.querySelector("#modalConta .btn-danger");
    salvarBtn.onclick = async () => {
      data.contas[index] = {
        desc: contaDesc.value,
        valor: Number(contaValor.value),
        tipo: contaTipo.value,
        vencimento: contaVencimento.value,
        status: conta.status,
      };

      await updateDoc(ref, { contas: data.contas });

      await atualizarListas();
      await calcularSaldo();

      modal.hide();
    };
  });
};

window.editarRenda = (index) => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  getDoc(ref).then((snap) => {
    const data = snap.data();
    const renda = data.rendas[index];

    rendaDesc.value = renda.desc;
    rendaValor.value = renda.valor;

    const modal = new bootstrap.Modal(document.getElementById("modalRenda"));
    modal.show();

    const salvarBtn = document.querySelector("#modalRenda .btn-success");

    salvarBtn.onclick = async () => {
      data.rendas[index] = {
        desc: rendaDesc.value,
        valor: Number(rendaValor.value),
      };

      await updateDoc(ref, { rendas: data.rendas });

      rendaDesc.value = "";
      rendaValor.value = "";

      atualizarListas();
      calcularSaldo();

      modal.hide();
    };
  });
};

window.removerRenda = async (index) => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  data.rendas.splice(index, 1);

  await updateDoc(ref, { rendas: data.rendas });

  calcularSaldo();
  atualizarListas();
};

window.removerConta = async (index) => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  data.contas.splice(index, 1);

  await updateDoc(ref, { contas: data.contas });

  calcularSaldo();
  atualizarListas();
};

window.resetModalConta = () => {
  contaDesc.value = "";
  contaValor.value = "";

  const hoje = new Date().toISOString().split("T")[0];
  contaVencimento.value = hoje;

  contaTipo.value = "fixa";

  const salvarBtn = document.querySelector("#modalConta .btn-danger");

  salvarBtn.onclick = () => {
    addConta();
  };
};

window.marcarPago = async (index) => {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  data.contas[index].status = "pago";

  await updateDoc(ref, {
    contas: data.contas,
  });

  calcularSaldo();
  atualizarListas();
};

window.loginGoogle = async () => {
  await signInWithPopup(auth, provider);
};

window.logout = async () => {
  await signOut(auth);
};

async function verificarMes() {
  const refMesAtual = doc(
    db,
    "usuarios",
    auth.currentUser.uid,
    "meses",
    mesAtual,
  );
  const snapAtual = await getDoc(refMesAtual);

  if (!snapAtual.exists()) {
    // descobrir mês anterior
    const data = new Date(mesAtual + "-01");
    data.setMonth(data.getMonth() - 1);

    const mesAnterior = data.toISOString().slice(0, 7);

    const refMesAnterior = doc(
      db,
      "usuarios",
      auth.currentUser.uid,
      "meses",
      mesAnterior,
    );
    const snapAnterior = await getDoc(refMesAnterior);

    let saldoAnterior = 0;
    let contasFixas = [];

    if (snapAnterior.exists()) {
      const dadosAnterior = snapAnterior.data();

      let entradas = 0;
      let saidas = 0;

      (dadosAnterior.rendas || []).forEach((r) => (entradas += r.valor));
      (dadosAnterior.contas || []).forEach((c) => (saidas += c.valor));

      saldoAnterior = entradas - saidas;

      contasFixas = (dadosAnterior.contas || []).filter(
        (c) => c.tipo === "fixa",
      );
    }

    await setDoc(refMesAtual, {
      saldoAnterior: saldoAnterior,
      rendas: [],
      contas: contasFixas,
    });
  }
}

async function carregarMeses() {
  const ref = collection(db, "usuarios", auth.currentUser.uid, "meses");

  const snapshot = await getDocs(ref);

  mesSelector.innerHTML = "";

  snapshot.forEach((docItem) => {
    const option = document.createElement("option");

    option.value = docItem.id;
    option.textContent = docItem.id;

    mesSelector.appendChild(option);
  });

  mesSelector.value = mesAtual;
}

mesSelector.addEventListener("change", () => {
  mesAtual = mesSelector.value;

  verificarContasVencendo();

  calcularSaldo();
  atualizarListas();
});

async function calcularSaldo() {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  let entradas = 0;
  let saidas = 0;

  (data.rendas || []).forEach((r) => {
    entradas += Number(r.valor) || 0;
  });

  (data.contas || []).forEach((c) => {
    if (c.status === "pago") {
      saidas += Number(c.valor) || 0;
    }
  });

  const saldoAnterior = Number(data.saldoAnterior) || 0;

  const saldo = saldoAnterior + entradas - saidas;

  animarValor(totalEntradas, entradas);
  animarValor(totalSaidas, saidas);
  animarValor(saldoEl, saldo);
}

async function solicitarPermissaoNotificacao() {
  if ("Notification" in window) {
    const permissao = await Notification.requestPermission();

    console.log("Permissão:", permissao);
  }
}

async function verificarContasVencendo() {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    const hoje = new Date();

    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);

    const amanhaStr = amanha.toISOString().split("T")[0];

    (data.contas || []).forEach((conta) => {
      try {
        if (!conta.vencimento) return;

        if (conta.status === "pago") return;

        if (conta.vencimento === amanhaStr) {
          new Notification("Monely", {
            body: `Sua conta "${conta.desc}" vence amanhã.`,
            icon: "./assets/icon-192.png",
          });
        }
      } catch (erroConta) {
        console.log("Erro notificação conta:", erroConta);
      }
    });
  } catch (erro) {
    console.log("Erro verificarContasVencendo:", erro);
  }
}

function animarValor(elemento, valorFinal) {
  valorFinal = Number(valorFinal);

  if (isNaN(valorFinal)) valorFinal = 0;

  let valorAtual = 0;
  const duracao = 400;
  const passos = 25;
  const incremento = valorFinal / passos;

  let contador = 0;

  const timer = setInterval(() => {
    contador++;
    valorAtual += incremento;

    if (contador >= passos) {
      valorAtual = valorFinal;
      clearInterval(timer);
    }

    elemento.innerText = valorAtual.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, duracao / passos);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginArea.classList.add("hidden"); // esconde login
    dashboard.classList.remove("hidden"); // mostra dashboard

    await solicitarPermissaoNotificacao();

    await verificarMes();
    await carregarMeses();

    await verificarContasVencendo();

    await calcularSaldo();
    await atualizarListas();
  } else {
    dashboard.classList.add("hidden"); // esconde dashboard
    loginArea.classList.remove("hidden"); // mostra login
  }
});
