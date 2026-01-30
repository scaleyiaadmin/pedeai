import { ParsedPedido } from '@/hooks/usePedidos';

/**
 * Gera o HTML formatado para impressão térmica (bobina 58mm ou 80mm)
 */
export const generatePrintHTML = (pedido: ParsedPedido, restaurantName: string = 'PedeAí') => {
  const dateStr = new Date(pedido.created_at).toLocaleString('pt-BR');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 100%;
          margin: 0;
          padding: 5px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .total { display: flex; justify-content: space-between; margin-top: 5px; font-size: 14px; font-weight: bold; }
        .obs { font-style: italic; margin-top: 5px; font-size: 10px; }
        @media print {
          @page { margin: 0; }
          body { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: 16px;">${restaurantName}</div>
      <div class="center">${dateStr}</div>
      <div class="divider"></div>
      
      <div class="center bold" style="font-size: 14px;">MESA ${pedido.mesa}</div>
      <div class="center">Pedido #${pedido.id}</div>
      <div class="divider"></div>
      
      <div class="bold">ITENS:</div>
      ${pedido.itens.map(item => `
        <div class="item">
          <span>${item.quantidade}x ${item.nome}</span>
          <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      <div class="total">
        <span>TOTAL</span>
        <span>R$ ${pedido.total.toFixed(2)}</span>
      </div>
      
      ${pedido.descricao ? `
        <div class="divider"></div>
        <div class="obs">
          <span class="bold">OBS:</span> ${pedido.descricao}
        </div>
      ` : ''}
      
      <div class="divider"></div>
      <div class="center" style="margin-top: 10px; font-size: 10px;">
        Obrigado pela preferência!<br>
        Sistema PedeAí - Pedidos Online
      </div>
      
      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;
};

/**
 * Dispara a impressão de um pedido de forma "silenciosa" (sem abrir novas abas)
 */
export const printOrder = (pedido: ParsedPedido, restaurantName: string = 'PedeAí') => {
  const html = generatePrintHTML(pedido, restaurantName);

  // Tenta encontrar ou criar um iframe oculto para impressão
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }
};
