const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

dotenv.config();

const BALANCA_PORT = process.env.BALANCA_PORT || 'COM3';
const BALANCA_BAUD = Number.parseInt(process.env.BALANCA_BAUD || '9600', 10);
const BALANCA_PROTO = String(process.env.BALANCA_PROTO || 'PRT2').toUpperCase();
const API_PORT = Number.parseInt(process.env.API_PORT || '3031', 10);
const API_KEY = process.env.API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Modo mock: BALANCA_MOCK=true simula leituras seriais sem hardware físico.
// Cenários via BALANCA_MOCK_SCENARIO:
//   stable   (padrão) — peso estável 1.500 kg
//   unstable           — peso instável 1.500 kg  (BAL-10: estavel=false)
//   zero               — peso zero estável        (tara/bandeja vazia)
//   heavy              — peso alto estável 15.250 kg
// ---------------------------------------------------------------------------
const BALANCA_MOCK = process.env.BALANCA_MOCK === 'true';
const BALANCA_MOCK_SCENARIO = String(process.env.BALANCA_MOCK_SCENARIO || 'stable').toLowerCase();

const MOCK_READINGS = {
  stable:   { peso_kg: 1.500,  estavel: true  },
  unstable: { peso_kg: 1.500,  estavel: false },
  zero:     { peso_kg: 0.000,  estavel: true  },
  heavy:    { peso_kg: 15.250, estavel: true  },
};

function getMockReading() {
  const base = MOCK_READINGS[BALANCA_MOCK_SCENARIO] || MOCK_READINGS.stable;
  return {
    peso_kg: base.peso_kg,
    estavel: base.estavel,
    timestamp: nowIso(),
    raw: `MOCK_${BALANCA_MOCK_SCENARIO.toUpperCase()}`,
    erro: null,
    simulacao: true,
  };
}

/** @type {import('serialport').SerialPort|null} */
let serialPort = null;
/** @type {import('@serialport/parser-readline').ReadlineParser|null} */
let parser = null;
let reconnecting = false;
let lastError = null;
let lastRawLine = null;

/**
 * @typedef {{peso_kg:number, estavel:boolean, timestamp:string, raw:string, erro:null|string}} PesoLeitura
 */
/** @type {PesoLeitura|null} */
let latestReading = null;

function nowIso() {
  return new Date().toISOString();
}

function parseDecimalKg(line) {
  const match = line.match(/([+\-*]?\d+\.\d+)\s*kg?/i);
  if (!match) return null;

  const prefix = (line.trim()[0] || '').toUpperCase();
  const unstable = prefix === '*';
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return null;

  return { pesoKg: value, estavel: !unstable };
}

function parseSixDigitsGrams(line) {
  const match = line.match(/[A-Z]?(\d{6})/);
  if (!match) return null;

  const grams = Number.parseInt(match[1], 10);
  if (Number.isNaN(grams)) return null;

  return { pesoKg: grams / 1000, estavel: true };
}

function parsePeso(line) {
  const clean = String(line || '').trim();
  if (!clean) return null;

  const decimal = parseDecimalKg(clean);
  if (decimal) return decimal;

  const grams = parseSixDigitsGrams(clean);
  if (grams) return grams;

  return null;
}

function applyReadingFromLine(line) {
  const parsed = parsePeso(line);
  lastRawLine = line;
  if (!parsed) return;

  latestReading = {
    peso_kg: Number(parsed.pesoKg.toFixed(3)),
    estavel: parsed.estavel,
    timestamp: nowIso(),
    raw: line,
    erro: null,
  };
  lastError = null;
}

function safeCloseCurrentPort() {
  if (!serialPort) return;
  try {
    if (serialPort.isOpen) {
      serialPort.close();
    }
  } catch (err) {
    // noop
  }
  serialPort = null;
  parser = null;
}

function scheduleReconnect() {
  if (reconnecting) return;
  reconnecting = true;
  setTimeout(() => {
    reconnecting = false;
    connectSerial();
  }, 3000);
}

function onSerialFailure(err) {
  lastError = err?.message || 'Erro serial desconhecido';
  safeCloseCurrentPort();
  scheduleReconnect();
}

function connectSerial() {
  safeCloseCurrentPort();

  try {
    serialPort = new SerialPort({
      path: BALANCA_PORT,
      baudRate: BALANCA_BAUD,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    });

    serialPort.open((err) => {
      if (err) {
        onSerialFailure(err);
      }
    });

    serialPort.on('error', (err) => onSerialFailure(err));
    serialPort.on('close', () => {
      lastError = lastError || 'Porta serial fechada';
      scheduleReconnect();
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    parser.on('data', (line) => applyReadingFromLine(line));
  } catch (err) {
    onSerialFailure(err);
  }
}

function ensureApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.header('x-api-key') || '';
  if (key !== API_KEY) {
    return res.status(401).json({ erro: 'Nao autorizado: x-api-key invalida.' });
  }
  return next();
}

function sendEnqIfNeeded() {
  if (!serialPort || !serialPort.isOpen) {
    throw new Error('Porta serial nao esta aberta');
  }

  if (BALANCA_PROTO === 'PRT1' || BALANCA_PROTO === 'PRT3') {
    serialPort.write(Buffer.from([0x05]));
  }
}

async function waitStableReading(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (latestReading && latestReading.estavel) {
      return latestReading;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
}

const app = express();
app.use(express.json());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin nao permitida'));
    },
  })
);

app.get('/healthz', (_, res) => {
  res.status(200).json({ ok: true, ts: nowIso() });
});

app.get('/status', ensureApiKey, (_, res) => {
  if (BALANCA_MOCK) {
    return res.status(200).json({
      serial_aberta: true,
      porta: `MOCK(${BALANCA_MOCK_SCENARIO})`,
      baud: BALANCA_BAUD,
      protocolo: BALANCA_PROTO,
      ultima_leitura: getMockReading(),
      ultima_linha_raw: `MOCK_${BALANCA_MOCK_SCENARIO.toUpperCase()}`,
      erro: null,
      simulacao: true,
    });
  }

  const serialOpen = !!serialPort && serialPort.isOpen;
  res.status(200).json({
    serial_aberta: serialOpen,
    porta: BALANCA_PORT,
    baud: BALANCA_BAUD,
    protocolo: BALANCA_PROTO,
    ultima_leitura: latestReading,
    ultima_linha_raw: lastRawLine,
    erro: lastError,
  });
});

app.get('/portas', ensureApiKey, async (_, res) => {
  try {
    const ports = await SerialPort.list();
    res.status(200).json(ports);
  } catch (err) {
    res.status(500).json({ erro: err?.message || 'Falha ao listar portas' });
  }
});

app.get('/peso', ensureApiKey, (_, res) => {
  if (BALANCA_MOCK) {
    return res.status(200).json(getMockReading());
  }

  try {
    sendEnqIfNeeded();
  } catch (err) {
    return res.status(503).json({ erro: err?.message || 'Porta serial indisponivel' });
  }

  if (!latestReading) {
    return res.status(204).send();
  }

  return res.status(200).json(latestReading);
});

app.get('/peso/estavel', ensureApiKey, async (req, res) => {
  if (BALANCA_MOCK) {
    const reading = getMockReading();
    if (!reading.estavel) {
      return res.status(408).json({ erro: 'Timeout aguardando leitura estavel', simulacao: true });
    }
    return res.status(200).json(reading);
  }

  try {
    sendEnqIfNeeded();
  } catch (err) {
    return res.status(503).json({ erro: err?.message || 'Porta serial indisponivel' });
  }

  const timeoutMs = Number.parseInt(String(req.query.timeout_ms || '5000'), 10);
  const stable = await waitStableReading(Number.isNaN(timeoutMs) ? 5000 : timeoutMs);

  if (!stable) {
    return res.status(408).json({ erro: 'Timeout aguardando leitura estavel' });
  }

  return res.status(200).json(stable);
});

app.post('/tara', ensureApiKey, (_, res) => {
  if (BALANCA_MOCK) {
    return res.status(200).json({ ok: true, mensagem: 'Comando de tara enviado (mock)', simulacao: true });
  }

  if (!serialPort || !serialPort.isOpen) {
    return res.status(503).json({ erro: 'Porta serial nao esta aberta' });
  }

  serialPort.write(Buffer.from([0x54]), (err) => {
    if (err) {
      return res.status(500).json({ erro: err?.message || 'Falha ao enviar tara' });
    }

    return res.status(200).json({ ok: true, mensagem: 'Comando de tara enviado' });
  });
});

app.listen(API_PORT, () => {
  // Nunca logar API_KEY.
  console.log(`[balanca-bridge] HTTP online em :${API_PORT}`);
  if (BALANCA_MOCK) {
    console.log(`[balanca-bridge] MODO MOCK ativo — cenario=${BALANCA_MOCK_SCENARIO} (sem serial real)`);
  } else {
    console.log(`[balanca-bridge] Porta serial=${BALANCA_PORT}, baud=${BALANCA_BAUD}, proto=${BALANCA_PROTO}`);
    connectSerial();
  }
});
