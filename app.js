// URL base da API (back-end). O front NUNCA fala com o ViaCEP direto:
// quem consome a API externa é o back-end.
const API = "http://127.0.0.1:5000";

let usuarioAtual = null;
let cpfAtual = null;


const getUser = (cpf) => {
    let url = API + "/usuario?cpf=" + cpf;
    return fetch(url, { method: "get" })
        .then((response) => (response.ok ? response.json() : null))
        .catch((error) => { console.error("Erro:", error); return null; });
};


const getDoses = (cpf) => {
    let url = API + "/doses?cpf=" + cpf;
    fetch(url, { method: "get" })
        .then((response) => {
            if (!response.ok) {
                alert("Usuário não encontrado!");
                return null;
            }
            return response.json();
        })
        .then((data) => {
            if (data === null) return;
            usuarioAtual = data;
            mostrarDoses(data.vacinas);
            document.getElementById("contadorEmDia").textContent = data.em_dia;
            document.getElementById("contadorAtrasadas").textContent = data.atrasadas;
            document.getElementById("contadorFuturas").textContent = data.futuras;
            document.getElementById("carteiraNome").textContent = data.nome;
            // mostra cidade/UF (dado que veio do ViaCEP), se houver
            const local = document.getElementById("carteiraLocal");
            if (data.cidade) {
                local.textContent = data.cidade + (data.uf ? "/" + data.uf : "");
            } else {
                local.textContent = "";
            }
            mostrarTela("telaCarteira");
        })
        .catch((error) => console.error("Erro:", error));
};


const postUser = (cpf, nome, data_nascimento, cep) => {
    const dados = new FormData();
    dados.append("cpf", cpf);
    dados.append("nome", nome);
    dados.append("data_nascimento", data_nascimento);
    dados.append("cep", cep);

    fetch(API + "/usuario", { method: "post", body: dados })
        .then((response) => response.json().then((body) => ({ status: response.status, body })))
        .then(({ status, body }) => {
            const msg = document.getElementById("mensagemUsuario");
            if (status === 200) {
                let local = body.cidade ? " (" + body.cidade + "/" + body.uf + ")" : "";
                msg.textContent = "Usuário cadastrado com sucesso" + local + "! Abrindo carteira...";
                cpfAtual = cpf;
                setTimeout(() => getDoses(cpf), 600);
            } else {
                msg.textContent = body.mensagem || "Não foi possível cadastrar.";
            }
        })
        .catch((error) => console.error("Erro:", error));
};


const putUser = (cpf, nome, data_nascimento, cep) => {
    const dados = new FormData();
    if (nome) dados.append("nome", nome);
    if (data_nascimento) dados.append("data_nascimento", data_nascimento);
    if (cep) dados.append("cep", cep);

    fetch(API + "/usuario?cpf=" + cpf, { method: "put", body: dados })
        .then((response) => response.json().then((body) => ({ status: response.status, body })))
        .then(({ status, body }) => {
            if (status === 200) {
                alert("Cadastro atualizado!");
                getDoses(cpf);
            } else {
                alert(body.mensagem || "Não foi possível atualizar.");
            }
        })
        .catch((error) => console.error("Erro:", error));
};

const postDose = (usuario_id, calendario_id, data_dose, lote, laboratorio, unidade) => {
    const dose = new FormData();
    dose.append("usuario_id", usuario_id);
    dose.append("calendario_id", calendario_id);
    dose.append("data_dose", data_dose);
    dose.append("lote", lote);
    dose.append("laboratorio", laboratorio);
    dose.append("unidade", unidade);

    fetch(API + "/dose", { method: "post", body: dose })
        .then((response) => response.json())
        .then((data) => {
            console.log("Dose cadastrada:", data);
            getDoses(cpfAtual); // atualiza a carteira uma única vez
        })
        .catch((error) => console.error("Erro:", error));
};


const deletaDose = (id) => {
    fetch(API + "/dose?id=" + id, { method: "delete" })
        .then((response) => response.json())
        .then((data) => {
            console.log("Dose removida:", data);
            getDoses(cpfAtual);
        })
        .catch((error) => console.error("Erro:", error));
};


const getCobertura = () => {
    fetch(API + "/relatorio/cobertura", { method: "get" })
        .then((response) => response.json())
        .then((data) => mostrarCobertura(data))
        .catch((error) => console.error("Erro:", error));
};

function lerUsuario() {
    return {
        cpf: document.getElementById("inputCPF").value,
        nome: document.getElementById("inputNome").value,
        data_nascimento: document.getElementById("inputDataNasc").value,
        cep: document.getElementById("inputCEP").value,
    };
}

function mostrarTela(idDaTela) {
    document.getElementById("telaUsuario").style.display = "none";
    document.getElementById("telaCarteira").style.display = "none";
    document.getElementById(idDaTela).style.display = "block";
}

function mostrarDoses(listaDoses) {
    const tabela = document.getElementById("tabelaDoses");
    tabela.innerHTML = "";
    listaDoses.forEach((dose) => {
        let acao = "";
        if (dose.dose_id) {
            acao = "<button onclick='deletaDose(" + dose.dose_id + ")'>Remover</button>";
        }
        let classeStatus = dose.status.toLowerCase().replace(" ", "");
        let exibeDataDose = dose.data_dose || "--";
        let exibeLote = dose.lote || "--";
        let exibeLaboratorio = dose.laboratorio || "--";
        let exibeUnidade = dose.unidade || "--";
        const linha = document.createElement("tr");
        linha.innerHTML =
            "<td>" + dose.calendario_id + "</td>"
            + "<td>" + dose.vacina + "</td>"
            + "<td>" + dose.dose + "</td>"
            + "<td>" + dose.idade_recomendada + "</td>"
            + "<td><span class='badge status-" + classeStatus + "'>" + dose.status + "</span></td>"
            + "<td>" + exibeDataDose + "</td>"
            + "<td>" + exibeLote + "</td>"
            + "<td>" + exibeLaboratorio + "</td>"
            + "<td>" + exibeUnidade + "</td>"
            + "<td>" + acao + "</td>";
        tabela.appendChild(linha);
    });
}

function mostrarCobertura(data) {
    const wrap = document.getElementById("relatorioCobertura");
    if (!data.cidades || data.cidades.length === 0) {
        wrap.innerHTML = "<p class='cartao-desc'>Nenhum usuário com cidade cadastrada ainda.</p>";
        return;
    }
    let html = "<table class='tabela'><thead><tr>"
        + "<th>Cidade</th><th>UF</th><th>Usuários</th>"
        + "<th>Em dia</th><th>Atrasadas</th><th>% em dia</th>"
        + "</tr></thead><tbody>";
    data.cidades.forEach((c) => {
        html += "<tr>"
            + "<td>" + c.cidade + "</td>"
            + "<td>" + c.uf + "</td>"
            + "<td>" + c.total_usuarios + "</td>"
            + "<td>" + c.em_dia + "</td>"
            + "<td>" + c.atrasadas + "</td>"
            + "<td>" + c.percentual_em_dia + "%</td>"
            + "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;
}


function buscarCarteira() {
    const cpf = document.getElementById("inputCpfBusca").value;
    if (cpf === "") { alert("Digite um CPF!"); return; }
    cpfAtual = cpf;
    getDoses(cpf);
}

function cadastrarUsuario() {
    const dados = lerUsuario();
    if (dados.cpf === "" || dados.nome === "" || dados.data_nascimento === "") {
        alert("Preencha CPF, nome e data de nascimento.");
        return;
    }
    postUser(dados.cpf, dados.nome, dados.data_nascimento, dados.cep);
}

function registrarDose() {
    const calendario_id = document.getElementById("inputCalendarioId").value;
    const data_dose = document.getElementById("inputDataDose").value;
    const lote = document.getElementById("inputLote").value;
    const laboratorio = document.getElementById("inputLaboratorio").value;
    const unidade = document.getElementById("inputUnidade").value;

    if (usuarioAtual === null) { alert("Inserir usuário!"); return; }

    postDose(usuarioAtual.usuario_id, calendario_id, data_dose, lote, laboratorio, unidade);
}

function editarUsuario() {
    const nome = document.getElementById("editNome").value;
    const data_nascimento = document.getElementById("editDataNasc").value;
    const cep = document.getElementById("editCEP").value;
    if (!nome && !data_nascimento && !cep) {
        alert("Preencha ao menos um campo para atualizar.");
        return;
    }
    putUser(cpfAtual, nome, data_nascimento, cep);
}

function alternarEdicao() {
    const box = document.getElementById("boxEdicao");
    box.style.display = box.style.display === "none" ? "block" : "none";
}

function alternarCobertura() {
    const box = document.getElementById("boxCobertura");
    if (box.style.display === "none") {
        box.style.display = "block";
        getCobertura();
    } else {
        box.style.display = "none";
    }
}
