import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

class PDFService {

  async generateAndShareComanda(comandaData, companyData) {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'No modo Web, utilize a impressão do navegador (CTRL+P).');
      return;
    }

    try {
      const html = this.buildHtml(comandaData, companyData);
      const { uri } = await Print.printToFileAsync({ html });

      // Compartilhar arquivo
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Comprovante'
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar/compartilhar o PDF.');
    }
  }

  buildHtml(comanda, companyData) {
    const itensHtml = (comanda.itens || []).map(item => `
      <tr>
        <td style="padding: 5px 0;">
            ${item.quantidade}x ${item.nome}
            ${item.observacao ? `<br/><small style="color:#666">${item.observacao}</small>` : ''}
        </td>
        <td style="text-align: right; vertical-align: top; white-space: nowrap; padding-left: 10px;">
            R$ ${item.valor ? item.valor.toFixed(2) : '0.00'}
        </td>
      </tr>
    `).join('');

    const pagamentosHtml = Object.entries(comanda.pagamentosResumo || {}).map(([forma, valor]) => `
      <tr>
        <td style="color: #444;">${forma.toUpperCase()}</td>
        <td style="text-align: right; white-space: nowrap;">R$ ${valor.toFixed(2)}</td>
      </tr>
    `).join('') || '<tr><td colspan="2" style="text-align:center; font-style:italic">Nenhum pagamento registrado</td></tr>';

    const companyName = companyData?.name || 'Recibo de Vendas';
    const companyDoc = companyData?.document ? (companyData.documentType === 'cpf' ? 'CPF' : 'CNPJ') + ': ' + companyData.document : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .container { max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #8B2F2F; margin: 0; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .info { margin-bottom: 20px; font-size: 14px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table th { text-align: left; border-bottom: 2px solid #8B2F2F; padding: 5px 0; color: #8B2F2F; }
          .table td { border-bottom: 1px solid #eee; }
          .totals { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 16px; }
          .total { font-size: 20px; font-weight: bold; color: #8B2F2F; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${companyName}</h1>
            <div class="subtitle">${companyDoc}</div>
            <div class="subtitle" style="margin-top:20px;">Comprovante de Pedido</div>
          </div>

          <div class="info">
            <strong>Comanda:</strong> ${comanda.comandaNumber}<br/>
            <strong>Cliente:</strong> ${comanda.cliente || 'Consumidor Final'}<br/>
            <strong>Data:</strong> ${comanda.dataEmissao || new Date().toLocaleString()}<br/>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Total Consumido:</span>
              <span>R$ ${(comanda.totalConsumido || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Total Pago:</span>
              <span style="color: green">R$ ${(comanda.totalPago || 0).toFixed(2)}</span>
            </div>
            <div class="row total">
              <span>SALDO A PAGAR:</span>
              <span>R$ ${(comanda.saldoAberto || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Obrigado pela preferência!</p>
            <p>Gerado automaticamente pelo App</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new PDFService();
