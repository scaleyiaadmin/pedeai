export interface PrintItem {
  nome: string;
  quantidade: number;
  preco: number;
}

export interface PrintOrderData {
  id: number | string;
  mesa: number | string;
  created_at: string | Date;
  itens: PrintItem[];
  total: number;
  descricao?: string; // Observações
}

// URL do RawBT (geralmente fixo na porta 40213 para localhost)
const RAWBT_URL = 'http://localhost:40213/print';

// --- WEB BLUETOOTH API SUPPORT (NATIVO DO CHROME) ---

/**
 * Retorna o nome do dispositivo Bluetooth conectado (se houver)
 */
export const getConnectedDeviceName = (): string | null => {
  return bluetoothDevice ? (bluetoothDevice.name || 'Impressora Bluetooth') : null;
};

// Tipagem "any" para evitar erros de build já que a API é experimental e não está no TS padrão
let bluetoothDevice: any | null = null;
let printCharacteristic: any | null = null;

// Comandos ESC/POS básicos
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\x41' + '\x00', // Cut paper
  TEXT_NORMAL: ESC + '!' + '\x00',
  TEXT_BOLD: ESC + '!' + '\x08',
  TEXT_CENTER: ESC + 'a' + '\x01',
  TEXT_LEFT: ESC + 'a' + '\x00',
  TEXT_DOUBLE: GS + '!' + '\x11', // Double height & width
};

/**
 * Conecta na impressora Bluetooth usando o navegador.
 * Deve ser chamado via clique do usuário.
 */
export const connectBluetoothPrinter = async (): Promise<boolean> => {
  try {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert('Seu navegador não suporta Web Bluetooth. Use o Chrome no Android/PC.');
      return false;
    }

    // Solicita o dispositivo (filtra por serviço de impressão ou mostra todos)
    console.log('Solicitando dispositivo Bluetooth...');
    bluetoothDevice = await nav.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // UUID padrão de impressoras
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      acceptAllDevices: false
    }).catch(async (err: any) => {
      console.log('Filtro específico falhou, tentando aceitar todos...', err);
      return await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
    });

    if (!bluetoothDevice || !bluetoothDevice.gatt) return false;

    console.log('Conectando ao servidor GATT...');
    const server = await bluetoothDevice.gatt.connect();

    console.log('Obtendo serviço de impressão...');
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');

    console.log('Obtendo característica de escrita...');
    printCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    console.log('Impressora conectada!');

    bluetoothDevice.addEventListener('gattserverdisconnected', () => {
      console.log('Impressora desconectada!');
      printCharacteristic = null;
    });

    return true;
  } catch (error) {
    console.error('Erro ao conectar Bluetooth:', error);
    alert('Erro ao conectar: ' + error);
    return false;
  }
};

/**
 * Converte strings para Uint8Array (bytes) com encoding simples
 */
const encode = (data: string): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(data);
};

/**
 * Remove acentos básicos para garantir compatibilidade com impressoras chinesas simples
 */
const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Formata o pedido em comandos ESC/POS binários
 */
const generateEscPosData = (pedido: PrintOrderData, restaurantName: string): Uint8Array => {
  const parts: Uint8Array[] = [];
  const add = (str: string) => parts.push(encode(str));
  const addCmd = (cmd: string) => parts.push(encode(cmd));

  // Reset
  addCmd(COMMANDS.INIT);

  // Cabeçalho
  addCmd(COMMANDS.TEXT_CENTER);
  addCmd(COMMANDS.TEXT_DOUBLE);
  add(removeAccents(restaurantName).toUpperCase() + '\n');
  addCmd(COMMANDS.TEXT_NORMAL);
  add(new Date(pedido.created_at).toLocaleString('pt-BR') + '\n');
  add('--------------------------------\n');

  // Mesa e Pedido
  addCmd(COMMANDS.TEXT_BOLD);
  addCmd(COMMANDS.TEXT_DOUBLE);
  add(`MESA ${pedido.mesa}\n`);
  addCmd(COMMANDS.TEXT_NORMAL);
  add(`Pedido #${pedido.id}\n`);
  add('--------------------------------\n');

  // Itens
  addCmd(COMMANDS.TEXT_LEFT);
  addCmd(COMMANDS.TEXT_BOLD);
  add('ITENS:\n');
  addCmd(COMMANDS.TEXT_NORMAL);

  pedido.itens.forEach(item => {
    const nome = removeAccents(item.nome);
    const qtd = item.quantidade;
    add(`${qtd}x ${nome}\n`);
  });

  add('--------------------------------\n');

  // Total
  addCmd(COMMANDS.TEXT_DOUBLE);
  add(`TOTAL: R$ ${pedido.total.toFixed(2).replace('.', ',')}\n`);
  addCmd(COMMANDS.TEXT_NORMAL);

  // Observações
  if (pedido.descricao) {
    add('\nOBS: ' + removeAccents(pedido.descricao) + '\n');
  }

  // Rodapé
  add('\n\n');
  addCmd(COMMANDS.TEXT_CENTER);
  add('Obrigado pela preferencia!\n');
  add('Sistema PedeAi\n\n\n\n');

  // Cortar papel
  addCmd(COMMANDS.CUT);

  const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach(part => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
};

/**
 * Imprime via Web Bluetooth (Nativo)
 */
export const printViaWebBluetooth = async (pedido: PrintOrderData, restaurantName: string = 'PedeAí') => {
  if (!printCharacteristic) {
    const connected = await connectBluetoothPrinter();
    if (!connected) return false;
  }

  try {
    const data = generateEscPosData(pedido, restaurantName);
    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await printCharacteristic.writeValue(chunk);
    }
    return true;
  } catch (error) {
    console.error('Erro ao escrever na impressora:', error);
    printCharacteristic = null;
    return false;
  }
};

/**
 * Legado: Imprime via RawBT App (HTTP POST)
 */
export const printToRawBT = async (content: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(RAWBT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Falha ao conectar com RawBT:', error);
    return false;
  }
};

/**
 * Legado: Imprime via RawBT Deep Link
 */
export const printViaDeepLink = (content: string) => {
  const base64 = btoa(unescape(encodeURIComponent(content)));
  window.location.href = `rawbt:base64,${base64}`;
  return true;
};
