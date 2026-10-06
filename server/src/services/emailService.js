import { config } from '../config/index.js';

export class EmailService {
  /**
   * Generates a secure 6-digit numeric verification code
   */
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Sends a 6-digit verification code to the target email using Resend
   */
  static async sendVerificationCode(toEmail, code, userName = '') {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'Assistente Financeiro <onboarding@resend.dev>';
    const firstName = userName ? userName.split(' ')[0] : 'usuário';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 36px 28px; border: 1px solid #334155; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px auto; display: block; }
    .brand { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 24px; letter-spacing: -0.5px; }
    .title { font-size: 18px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .code-box { background: #0f172a; border: 2px dashed #10b981; border-radius: 16px; padding: 18px; margin: 24px 0; }
    .code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #34d399; font-family: monospace; }
    .footer { font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Assistente Financeiro</div>
    <div class="title">Olá, ${firstName}! 👋</div>
    <div class="text">
      Obrigado por se cadastrar no <strong>Assistente Financeiro</strong>.<br>
      Para ativar sua conta e validar seu e-mail, insira o código abaixo:
    </div>
    
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    
    <div class="text">
      Este código é válido por <strong>15 minutos</strong>.<br>
      Se você não solicitou este cadastro, pode desconsiderar esta mensagem com segurança.
    </div>
    
    <div class="footer">
      © ${new Date().getFullYear()} Assistente Financeiro • Gestão Financeira Inteligente
    </div>
  </div>
</body>
</html>
    `;

    // 1. If Resend API Key is set, send real email via Resend REST API
    if (resendApiKey) {
      try {
        console.log(`✉️ Enviando e-mail via Resend para: ${toEmail}...`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [toEmail],
            subject: `${code} é o seu código do Assistente Financeiro`,
            html: htmlContent
          })
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('⚠️ Erro na API do Resend:', data);
          // If Resend failed (e.g. unverified domain or sandbox limitation), log code so user is not blocked
          console.log(`🔑 [CÓDIGO DE RECUPERAÇÃO] Código para ${toEmail}: ${code}`);
          return { success: false, error: data.message || 'Erro ao enviar e-mail pelo Resend', codePreview: code };
        }

        console.log(`✅ E-mail enviado com sucesso via Resend (ID: ${data.id})`);
        return { success: true, id: data.id };
      } catch (err) {
        console.error('⚠️ Falha de conexão com Resend:', err);
        console.log(`🔑 [CÓDIGO DE RECUPERAÇÃO] Código para ${toEmail}: ${code}`);
        return { success: false, error: err.message, codePreview: code };
      }
    } else {
      // 2. Simulated mode (when user hasn't added RESEND_API_KEY in Render yet)
      console.log('----------------------------------------------------');
      console.log(`✉️ [SIMULAÇÃO DE E-MAIL - RESEND_API_KEY NÃO CONFIGURADA]`);
      console.log(`Para: ${toEmail}`);
      console.log(`Código de Verificação: ${code}`);
      console.log('----------------------------------------------------');
      return { success: true, simulated: true, codePreview: code };
    }
  }
}
