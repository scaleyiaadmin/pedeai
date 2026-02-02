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
// --- WEB BLUETOOTH API SUPPORT (NATIVO DO CHROME) ---

let bluetoothDevice: BluetoothDevice | null = null;
let printCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

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
    if (!navigator.bluetooth) {
      alert('Seu navegador não suporta Web Bluetooth. Use o Chrome no Android/PC.');
      return false;
    }

    // Solicita o dispositivo (filtra por serviço de impressão ou mostra todos)
    console.log('Solicitando dispositivo Bluetooth...');
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // UUID padrão de impressoras
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      acceptAllDevices: false
      // Nota: Algumas impressoras genéricas não anunciam o serviço correto.
      // Se falhar, podemos tentar acceptAllDevices: true, mas requer listar services em optionalServices.
    }).catch(err => {
      // Fallback para tentar listar tudo se o filtro falhar
      console.log('Filtro específico falhou, tentando aceitar todos...', err);
      return navigator.bluetooth.requestDevice({
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
    // UUID padrão para escrita em impressoras térmicas
    printCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    console.log('Impressora conectada!');

    // Adiciona listener para desconexão
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
  return encoder.encode(data); // Nota: TextEncoder gera UTF-8. Impressoras antigas podem precisar de conversão manual para PC850/860 se tiver acentos.
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
  add(new Date().toLocaleString('pt-BR') + '\n');
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
    const totalItem = (item.preco * qtd).toFixed(2);
    // Formatação simples: QTD x NOME .... PREÇO
    add(`${qtd}x ${nome}\n`);
    addCmd(COMMANDS.TEXT_CENTER); // Gambiarra de alinhamento rápido ou apenas jogar na linha de baixo
    addCmd(COMMANDS.TEXT_LEFT);
  });

  add('--------------------------------\n');

  // Total
  addCmd(COMMANDS.TEXT_DOUBLE);
  add(`TOTAL: R$ ${pedido.total.toFixed(2)}\n`);
  addCmd(COMMANDS.TEXT_NORMAL);

  // Observações
  if (pedido.descricao) {
    add('\nOBS: ' + removeAccents(pedido.descricao) + '\n');
  }

  // Rodapé
  add('\n\n');
  addCmd(COMMANDS.TEXT_CENTER);
  add('Obrigado pela preferencia!\n');
  add('Sistema PedeAi\n\n\n\n'); // Feed lines

  // Cortar papel
  addCmd(COMMANDS.CUT);

  // Mergeall arrays
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

    // O Web Bluetooth tem limite de tamanho de pacote (chunks). 
    // Vamos enviar em pedaços de 512 bytes para garantir.
    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await printCharacteristic?.writeValue(chunk);
    }

    return true;
  } catch (error) {
    console.error('Erro ao escrever na impressora:', error);
    // Tenta reconectar uma vez
    printCharacteristic = null;
    return false;
  }
};
