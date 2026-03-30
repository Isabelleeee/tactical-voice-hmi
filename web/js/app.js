// ==========================================
// 1. INICIALIZAÇÃO DOS INSTRUMENTOS E VARIÁVEIS
// ==========================================
const size = 180;
var indicatorAirspeed = $.flightIndicator('#airspeed', 'airspeed', {size: size, showBox: false});
var indicatorAttitude = $.flightIndicator('#attitude', 'attitude', {size: size, showBox: false});
var indicatorAltimeter = $.flightIndicator('#altimeter', 'altimeter', {size: size, showBox: false});
var indicatorTurnCoordinator = $.flightIndicator('#turn_coordinator', 'turn_coordinator', {size: size, showBox: false});
var indicatorHeading = $.flightIndicator('#heading', 'heading', {size: size, showBox: false});
var indicatorVariometer = $.flightIndicator('#variometer', 'variometer', {size: size, showBox: false});

var curPitch = 0, curRoll = 0, curSpeed = 150, curAltitude = 5000, curHeading = 0, curVSI = 0;
var targetPitch = 0, targetRoll = 0, targetSpeed = 150, targetHeading = null;

const logText = document.getElementById('status-text');
const statusContainer = document.getElementById('status-container');

// --- SISTEMA DE CAIXA PRETA (LOG DE TELEMETRIA) ---
let flightLog = [];
function registrarLog(evento) {
    const agora = new Date();
    const timestamp = agora.toTimeString().split(' ')[0]; 
    flightLog.push(`[${timestamp}] ${evento}`);
    console.log(`[CAIXA PRETA] ${evento}`);
}
registrarLog("SISTEMA C2 INICIALIZADO. INÍCIO DA GRAVAÇÃO DE CAIXA PRETA.");

// --- CONFIGURAÇÃO DO CANVAS ---
const canvas = document.getElementById('horizon-canvas');
const ctx = canvas.getContext('2d');

function redimensionarCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', redimensionarCanvas);
redimensionarCanvas(); 

// ==========================================
// 2. MOTOR DE FÍSICA E PILOTO AUTOMÁTICO
// ==========================================
setInterval(function() {
    // --- PILOTO AUTOMÁTICO DE PROA ---
    if (targetHeading !== null) {
        let diff = targetHeading - curHeading;
        while (diff <= -180) diff += 360;
        while (diff > 180) diff -= 360;

        if (Math.abs(diff) < 2) {
            targetRoll = 0; 
            targetHeading = null; 
            registrarLog("PILOTO AUTOMÁTICO: PROA ALCANÇADA E ESTABILIZADA.");
        } 
        else if (diff > 0) { targetRoll = 20; } 
        else { targetRoll = -20; }
    }

    // --- INÉRCIA ---
    curPitch += (targetPitch - curPitch) * 0.03;
    curRoll += (targetRoll - curRoll) * 0.03;
    curSpeed += (targetSpeed - curSpeed) * 0.05; 
    curSpeed -= (curPitch * 0.15); 

    curAltitude += (curPitch * 0.8);
    if (curAltitude < 0) curAltitude = 0;
    if (curSpeed < 40) curSpeed = 40;

    curHeading += (curRoll * 0.05);
    if(curHeading >= 360) curHeading -= 360;
    if(curHeading < 0) curHeading += 360;

    curVSI = curPitch * 1.5; 

    // --- RENDERIZAÇÃO DO HORIZONTE ---
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h); 
    ctx.save(); 
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-curRoll * Math.PI / 180); 
    ctx.translate(0, -curPitch * 12); 
    
    ctx.fillStyle = '#4da6ff';
    ctx.fillRect(-w * 3, -h * 3, w * 6, h * 3);
    ctx.fillStyle = '#593300';
    ctx.fillRect(-w * 3, 0, w * 6, h * 3);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 3, 0);
    ctx.lineTo(w * 3, 0);
    ctx.stroke();
    ctx.restore(); 

    // --- ATUALIZA INSTRUMENTOS ---
    indicatorAttitude.setRoll(curRoll);
    indicatorAttitude.setPitch(curPitch);
    indicatorAirspeed.setAirSpeed(curSpeed); 
    indicatorAltimeter.setAltitude(curAltitude);
    indicatorTurnCoordinator.setTurn(curRoll / 10);
    indicatorHeading.setHeading(curHeading);
    indicatorVariometer.setVario(curVSI);

}, 20);

// ==========================================
// 3. IA DE VOZ COM NLP E INTELIGÊNCIA AEW&C
// ==========================================
const btnMic = document.getElementById('btn-mic');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let micAtivo = false; 
let isRecognizing = false;

let estadoIA = "LIVRE"; 
let pitchPendente = targetPitch;
let rollPendente = targetRoll;
let speedPendente = targetSpeed; 
let proaPendente = targetHeading; 
let nomeAcaoPendente = "";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playRadioClick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05); 
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playMicBeep() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1800, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function falaCopiloto(texto) {
    window.speechSynthesis.cancel(); 
    playRadioClick(); 
    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.2; 
    mensagem.pitch = 0.9; 
    mensagem.onend = function() { playRadioClick(); };
    setTimeout(() => { window.speechSynthesis.speak(mensagem); }, 100); 
}

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true; 

    recognition.onstart = function() {
        isRecognizing = true;
        playMicBeep(); 
        btnMic.innerText = "🔴 Rádio Aberto";
        btnMic.classList.add("mic-ativo");
        logText.innerText = "SISTEMA PRONTO. AGUARDANDO ORDEM.";
        document.querySelector('.ai-panel').style.borderLeftColor = "#ff0000";
        registrarLog("COMUNICAÇÃO DE RÁDIO ABERTA PELO OPERADOR.");
    };

    recognition.onresult = function(event) {
        let transcricaoBruta = "";
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcricaoBruta += event.results[i][0].transcript;
            if (event.results[i].isFinal) isFinal = true;
        }

        let transcricao = transcricaoBruta.toLowerCase().trim().replace(/[.,!?]/g, ''); 

        // NLP - Filtro Fonético para Jargão Militar
        transcricao = transcricao.replace(/até que/g, "atech");
        transcricao = transcricao.replace(/a tech/g, "atech");
        transcricao = transcricao.replace(/a tag/g, "atech");
        transcricao = transcricao.replace(/pro a/g, "proa");
        transcricao = transcricao.replace(/prôa/g, "proa");
        transcricao = transcricao.replace(/por a/g, "proa");
        transcricao = transcricao.replace(/para a/g, "proa");
        transcricao = transcricao.replace(/zero um/g, "01");
        transcricao = transcricao.replace(/zero-um/g, "01");

        if (!isFinal) {
            if (estadoIA === "LIVRE") logText.innerText = `OUVINDO: ${transcricao.toUpperCase()}...`;
            return; 
        }

        registrarLog(`OPERADOR FALOU: "${transcricao.toUpperCase()}"`);

        // --- ESTADO 1: LENDO A FRASE COMPLETA ---
        if (estadoIA === "LIVRE") {
            const isDesligar = /(desligar|desativar|cortar|encerrar)/.test(transcricao);
            const isNivelar = /(nivelar|estabilizar|manter proa)/.test(transcricao);
            const isMayday = /(mayday|emergência geral)/.test(transcricao);
            const isJamming = /(interferência|ataque eletrônico|jamming|sinal perdido)/.test(transcricao);
            const isRadar = /(iniciar varredura|ativar radar|modo de busca|rastreio)/.test(transcricao);

            // 1. SISTEMA DE MISSÃO E-99: VARREDURA AEW&C
            if (isRadar) {
                logText.innerText = `SISTEMA: VARREDURA AEW&C ATIVADA`;
                falaCopiloto("Varredura de radar ativada. Monitorando espaço aéreo.");
                registrarLog("SISTEMA DE MISSÃO: Varredura de radar de longo alcance (Erieye) iniciada.");
                
                // IA processa a busca e sugere interceptação 7 segundos depois
                setTimeout(() => {
                    if (estadoIA === "LIVRE") {
                        playRadioClick();
                        proaPendente = 90; 
                        rollPendente = 20; 
                        nomeAcaoPendente = "interceptação na proa zero nove zero";
                        
                        falaCopiloto("Contato radar. Tráfego ilícito detectado a baixa altitude. Solução de interceptação calculada para a proa zero nove zero. Autoriza engajamento?");
                        logText.innerText = `ALVO DETECTADO: AUTORIZA INTERCEPTAÇÃO?`;
                        statusContainer.classList.add("status-aguardando");
                        registrarLog("AEW&C: Tráfego ilícito detectado. IA propõe vetor de interceptação (Proa 90). Aguardando autorização do Comando.");
                        
                        estadoIA = "AGUARDANDO_CONFIRMACAO";
                    }
                }, 7000);
                return;
            }

            if (isDesligar) {
                falaCopiloto("Desligando sistemas de comunicação.");
                logText.innerText = `COMANDO: DESLIGANDO SISTEMA`;
                registrarLog("COMANDO C2: CORTAR COMUNICAÇÕES.");
                micAtivo = false; recognition.stop(); return;
            }
            if (isMayday) {
                targetPitch = 10; targetRoll = 0; targetSpeed = 120; targetHeading = null;
                logText.innerText = `ALERTA CRÍTICO: MAYDAY DECLARADO`;
                statusContainer.classList.remove("status-aguardando");
                statusContainer.classList.add("status-emergencia"); 
                falaCopiloto("Mayday recebido. Transponder sete sete zero zero. Assumindo descida de segurança.");
                registrarLog("⚠️ EMERGÊNCIA CRÍTICA: MAYDAY DECLARADO. TRANSPONDER 7700. AUTOPILOT ASSUMIU DESCIDA.");
                estadoIA = "EMERGENCIA"; 
                setTimeout(() => { logText.innerText = `AGUARDANDO COMANDOS MANUAIS`; statusContainer.classList.remove("status-emergencia"); estadoIA = "LIVRE"; }, 8000);
                return;
            }
            if (isJamming) {
                targetPitch = 0; targetRoll = 0; targetHeading = null;
                logText.innerText = `ALERTA: INTERFERÊNCIA DE SINAL`;
                statusContainer.classList.remove("status-aguardando");
                statusContainer.classList.add("status-emergencia");
                falaCopiloto("Ataque eletrônico detectado. Alternando para navegação de borda. Nivelando aeronave.");
                registrarLog("⚠️ EMERGÊNCIA DE DEFESA: ATAQUE DE GUERRA ELETRÔNICA (JAMMING). MODO OFFLINE (EDGE) ATIVADO.");
                estadoIA = "EMERGENCIA"; 
                setTimeout(() => { logText.innerText = `SISTEMA OFFLINE PRONTO`; statusContainer.classList.remove("status-emergencia"); estadoIA = "LIVRE"; registrarLog("SISTEMAS OFFLINE ESTABILIZADOS."); }, 8000);
                return;
            }
            if (isNivelar) {
                targetPitch = 0; targetRoll = 0; targetHeading = null;
                logText.innerText = `COMANDO: MANTENDO PROA ATUAL`;
                falaCopiloto("Copiado. Nivelando asas e mantendo proa.");
                registrarLog("COMANDO Imediato: NIVELAR ASAS E MANTER PROA.");
                return;
            }

            // --- LEITURA DE COMANDOS DE NAVEGAÇÃO MULTIPLOS ---
            let acoesReconhecidas = [];
            pitchPendente = targetPitch; rollPendente = targetRoll; speedPendente = targetSpeed; proaPendente = null;

            if (/(proa|rumo)/.test(transcricao)) {
                let num = transcricao.match(/(?:proa|rumo)[^\d]*(\d+)/);
                if (num) { proaPendente = parseInt(num[1]); acoesReconhecidas.push(`proa ${proaPendente}`); }
            } 
            else if (/(direita|direta)/.test(transcricao)) {
                let num = transcricao.match(/(?:direita|direta)[^\d]*(\d+)/);
                let graus = num ? parseInt(num[1]) : 20; rollPendente = graus; acoesReconhecidas.push(`direita ${graus} graus`);
            } else if (/esquerda/.test(transcricao)) {
                let num = transcricao.match(/esquerda[^\d]*(\d+)/);
                let graus = num ? parseInt(num[1]) : 20; rollPendente = -graus; acoesReconhecidas.push(`esquerda ${graus} graus`);
            }

            if (/(subir|suba|elevar)/.test(transcricao)) {
                let num = transcricao.match(/(?:subir|suba|elevar)[^\d]*(\d+)/);
                let graus = num ? parseInt(num[1]) : 15; pitchPendente = targetPitch - graus; acoesReconhecidas.push(`subida de ${graus} graus`);
            } else if (/(descer|desça|mergulhar)/.test(transcricao)) {
                let num = transcricao.match(/(?:descer|desça|mergulhar)[^\d]*(\d+)/);
                let graus = num ? parseInt(num[1]) : 15; pitchPendente = targetPitch + graus; acoesReconhecidas.push(`descida de ${graus} graus`);
            }

            if (/(velocidade|nós|acelerar|reduzir)/.test(transcricao)) {
                let num = transcricao.match(/(?:velocidade|nós|acelerar para|reduzir para)[^\d]*(\d+)/);
                if (num) { speedPendente = parseInt(num[1]); acoesReconhecidas.push(`velocidade em ${speedPendente} nós`); }
            }

            // Processa a confirmação se algo foi reconhecido
            if (acoesReconhecidas.length > 0) {
                nomeAcaoPendente = acoesReconhecidas.join(", "); 
                falaCopiloto(`Entendido. Confirmar ${nomeAcaoPendente}?`);
                logText.innerText = `CONFIRMA: ${nomeAcaoPendente.toUpperCase()}`;
                estadoIA = "AGUARDANDO_CONFIRMACAO";
                statusContainer.classList.add("status-aguardando");
                registrarLog(`SISTEMA AGUARDANDO READBACK (CONFIRMAÇÃO) PARA: ${nomeAcaoPendente.toUpperCase()}`);
            } else {
                 logText.innerText = "SISTEMA PRONTO. AGUARDANDO ORDEM."; 
                 registrarLog("ÁUDIO IGNORADO: Nenhum comando tático reconhecido na frase.");
            }
        } 
        
        // --- ESTADO 2: ESPERANDO APROVAÇÃO ---
        else if (estadoIA === "AGUARDANDO_CONFIRMACAO") {
            if (/(sim|confirmo|positivo|autorizado|vai|executa|engaja)/.test(transcricao)) {
                targetPitch = pitchPendente;
                targetRoll = rollPendente;
                targetSpeed = speedPendente; 
                targetHeading = proaPendente; 
                
                targetPitch = Math.max(-40, Math.min(40, targetPitch));
                targetRoll = Math.max(-45, Math.min(45, targetRoll));

                falaCopiloto(`Comandos confirmados. Executando.`);
                logText.innerText = `EXECUTANDO MANOBRAS`;
                registrarLog(`✅ ORDEM CONFIRMADA E EXECUTADA: ${nomeAcaoPendente.toUpperCase()}`);
                
                estadoIA = "LIVRE"; 
                statusContainer.classList.remove("status-aguardando"); 
            } 
            else if (/(não|cancela|negativo|aborta|para)/.test(transcricao)) {
                falaCopiloto("Comandos cancelados. Mantendo parâmetros atuais.");
                logText.innerText = `COMANDOS CANCELADOS`;
                registrarLog(`❌ ORDEM ABORTADA PELO OPERADOR. Mantendo navegação atual.`);
                
                estadoIA = "LIVRE";
                statusContainer.classList.remove("status-aguardando"); 
            }
        }
    };

    recognition.onerror = function(event) {
        if(event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            micAtivo = false; logText.innerText = "ERRO DE MICROFONE!";
            registrarLog("ERRO DO SISTEMA: Acesso ao microfone negado.");
        }
    };

    recognition.onend = function() {
        isRecognizing = false; 
        if (micAtivo) {
            setTimeout(() => { if(micAtivo && !isRecognizing) recognition.start(); }, 250);
        } else {
            btnMic.innerText = "🎙️ Ligar Rádio"; btnMic.classList.remove("mic-ativo");
            logText.innerText = "RÁDIO DESLIGADO.";
            document.querySelector('.ai-panel').style.borderLeftColor = "#00d4ff";
            estadoIA = "LIVRE"; statusContainer.classList.remove("status-aguardando");
            registrarLog("COMUNICAÇÃO DE RÁDIO ENCERRADA.");
        }
    };

    btnMic.addEventListener('click', () => {
        if (micAtivo) { micAtivo = false; if (isRecognizing) recognition.stop(); } 
        else { micAtivo = true; try { if (!isRecognizing) recognition.start(); } catch (e) {} }
    });
}

// ==========================================
// 4. PONTE DE HARDWARE (WEB SERIAL API)
// ==========================================
const btnUsb = document.getElementById('btn-usb');
let port;
let writer;
let serialAtiva = false;

let ultimoPitchEnviado = 0;
let ultimoRollEnviado = 0;

async function enviarParaArduino() {
    if (serialAtiva && writer) {
        let pitchAtual = Math.round(curPitch);
        let rollAtual = Math.round(curRoll);

        if (pitchAtual !== ultimoPitchEnviado || rollAtual !== ultimoRollEnviado) {
            const comando = `${pitchAtual},${rollAtual}\n`;
            try {
                const encoder = new TextEncoder();
                await writer.write(encoder.encode(comando));
                ultimoPitchEnviado = pitchAtual;
                ultimoRollEnviado = rollAtual;
            } catch (erro) {
                console.error("Falha USB:", erro);
            }
        }
    }
}

setInterval(enviarParaArduino, 50);

if (btnUsb) {
    btnUsb.addEventListener('click', async () => {
        if (!serialAtiva) {
            try {
                port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 }); 
                writer = port.writable.getWriter();
                serialAtiva = true;
                btnUsb.innerText = "⚡ Arduino Conectado";
                btnUsb.style.backgroundColor = "#00cc00"; 
                btnUsb.style.color = "#ffffff";
                registrarLog("HARDWARE: CABO USB CONECTADO. MOTORES FÍSICOS ENGATADOS.");
            } catch (erro) {
                alert("Falha ao abrir USB.");
                registrarLog("HARDWARE ERRO: FALHA AO TENTAR CONECTAR PORTA USB.");
            }
        } else {
            try {
                serialAtiva = false;
                if (writer) await writer.releaseLock();
                if (port) await port.close();
                btnUsb.innerText = "🔌 Conectar Cabo USB";
                btnUsb.style.backgroundColor = "#ff9900"; 
                btnUsb.style.color = "#000000";
                registrarLog("HARDWARE: CABO USB DESCONECTADO.");
            } catch (erro) {}
        }
    });
}

// ==========================================
// 5. EXPORTAR CAIXA PRETA (LOG)
// ==========================================
const btnLog = document.getElementById('btn-log');
if (btnLog) {
    btnLog.addEventListener('click', () => {
        if (flightLog.length === 0) {
            alert("O log de voo está vazio.");
            return;
        }
        
        const cabecalho = "====================================================\n" +
                          "  RELATÓRIO DE TELEMETRIA E COMANDO (C2) - ATECH\n" +
                          "  SISTEMA EDGE OFFLINE - REGISTRO DE CAIXA PRETA\n" +
                          "  DATA DE EXPORTAÇÃO: " + new Date().toLocaleString('pt-BR') + "\n" +
                          "====================================================\n\n";
                          
        const conteudo = cabecalho + flightLog.join("\n");
        const blob = new Blob([conteudo], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const dataHoje = new Date().toISOString().slice(0,10);
        a.download = `Atech_CaixaPreta_${dataHoje}.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        registrarLog("ARQUIVO DE TELEMETRIA EXPORTADO PELO OPERADOR.");
    });
}

// ==========================================
// 6. SIMULADOR DE DATALINK (MENSAGENS DA TORRE)
// ==========================================
document.addEventListener('keydown', (event) => {
    // Tecla 'T' ou 't' simula a chegada de um pacote de dados da base (C2 Uplink)
    if ((event.key === "t" || event.key === "T") && estadoIA === "LIVRE") {
        console.log("Datalink Recebido");
        
        proaPendente = 270;
        rollPendente = -20;
        targetPitch = 0; 
        nomeAcaoPendente = "vetor da torre proa dois sete zero";
        
        logText.innerText = `DATALINK C2: MENSAGEM DO CONTROLE`;
        statusContainer.classList.add("status-aguardando");
        
        falaCopiloto("Atenção comandante. Nova diretriz do Controle de Operações via Datalink. O Centro solicita desvio imediato de rota para a proa dois sete zero. Autoriza a manobra?");
        registrarLog("DATALINK (C2): Ordem tática recebida da base. IA solicita autorização do piloto para alterar rota (Proa 270).");
        
        estadoIA = "AGUARDANDO_CONFIRMACAO";
    }
});