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
const contaData = document.getElementById("contaData");
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

  const data = (await getDoc(ref)).data();

  if (!data) return;

  listaRendas.innerHTML = "";
  listaContas.innerHTML = "";

  (data.rendas || []).forEach((r, index) => {
    const li = document.createElement("li");

    li.className = "list-group-item d-flex justify-content-between";

    li.innerHTML = `
<div>

<strong>${r.desc}</strong><br>

<span class="text-success">
${Number(r.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
</span>

</div>

<button class="btn btn-sm btn-danger"
onclick="removerRenda(${index})">
Excluir
</button>
`;

    listaRendas.appendChild(li);
  });

  (data.contas || []).forEach((c, index) => {
    const li = document.createElement("li");

    li.className = "list-group-item d-flex justify-content-between";

    li.innerHTML = `
<div>

<strong>${c.desc}</strong><br>

<span class="text-danger">
${Number(c.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
</span>

</div>

<button class="btn btn-sm btn-danger"
onclick="removerConta(${index})">
Excluir
</button>
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
    data: contaData.value,
  });

  await updateDoc(ref, { contas: data.contas });

  calcularSaldo();
  atualizarListas();
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

  calcularSaldo();
  atualizarListas();
});

async function calcularSaldo() {
  const ref = doc(db, "usuarios", auth.currentUser.uid, "meses", mesAtual);

  const data = (await getDoc(ref)).data();

  if (!data) return;

  let entradas = 0;
  let saidas = 0;

  (data.rendas || []).forEach((r) => (entradas += Number(r.valor) || 0));
  (data.contas || []).forEach((c) => (saidas += Number(c.valor) || 0));

  const saldoAnterior = Number(data.saldoAnterior) || 0;

  const saldo = saldoAnterior + entradas - saidas;

  animarValor(totalEntradas, entradas);
  animarValor(totalSaidas, saidas);
  animarValor(saldoEl, saldo);
}

function animarValor(elemento, valorFinal) {
  valorFinal = Number(valorFinal) || 0;

  let valorAtual = 0;

  const duracao = 500;
  const incremento = valorFinal / (duracao / 16);

  const timer = setInterval(() => {
    valorAtual += incremento;

    if (valorAtual >= valorFinal) {
      valorAtual = valorFinal;
      clearInterval(timer);
    }

    elemento.innerText = valorAtual.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, 16);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginArea.style.display = "none";
    dashboard.style.display = "block";

    await verificarMes();

    await carregarMeses();

    calcularSaldo();
    atualizarListas();
  } else {
    dashboard.style.display = "none";
    loginArea.style.display = "block";
  }
});
