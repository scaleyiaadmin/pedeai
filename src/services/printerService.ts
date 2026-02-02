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

/**
 * Gera o HTML formatado para o RawBT.
 * Diferente do print-utils.ts, aqui não injetamos script de window.print(),
 * pois o próprio RawBT processa o HTML.
 */
export const formatReceipt = (pedido: PrintOrderData, restaurantName: string = 'PedeAí'): string => {
    const dateStr = new Date(pedido.created_at).toLocaleString('pt-BR');

    // O RawBT entende HTML simples.
    // Importante: CSS inline é o mais seguro.
    return `
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: monospace; font-size: 16px; margin: 0; padding: 0;">
      <div style="text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 5px;">${restaurantName}</div>
      <div style="text-align: center; margin-bottom: 5px;">${dateStr}</div>
      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      
      <div style="text-align: center; font-size: 18px; font-weight: bold;">MESA ${pedido.mesa}</div>
      <div style="text-align: center; margin-bottom: 5px;">Pedido #${pedido.id}</div>
      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      
      <div style="font-weight: bold; margin-bottom: 5px;">ITENS:</div>
      ${pedido.itens.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>${item.quantidade}x ${item.nome}</span>
          <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 18px; font-weight: bold;">
        <span>TOTAL</span>
        <span>R$ ${pedido.total.toFixed(2)}</span>
      </div>
      
      ${pedido.descricao ? `
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        <div style="margin-top: 5px; font-style: italic;">
          <span style="font-weight: bold;">OBS:</span> ${pedido.descricao}
        </div>
      ` : ''}
      
      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      <div style="text-align: center; margin-top: 10px; font-size: 12px;">
        Obrigado pela preferência!<br>
        Sistema PedeAí - Pedidos Online
      </div>
      <br><br>
    </body>
    </html>
  `;
};

/**
 * Envia o comando de impressão para o RawBT via POST.
 */
export const printToRawBT = async (content: string): Promise<boolean> => {
    try {
        // Controller para timeout (se o RawBT não estiver rodando, falha rápido em 2s em vez de esperar muito)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(RAWBT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // RawBT aceita text/plain para HTML direto também, ou application/x-www-form-urlencoded
            },
            // RawBT espera o conteúdo diretamente no corpo
            body: content,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log('Impressão enviada com sucesso para RawBT');
            return true;
        } else {
            console.error('Erro na resposta do RawBT:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Falha ao conectar com RawBT (verifique se o app está rodando e Print Server ativo):', error);
        return false;
    }
};
