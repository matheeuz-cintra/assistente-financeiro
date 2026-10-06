import nodemailer from 'nodemailer';

export class EmailService {
  /**
   * Generates a secure 6-digit numeric verification code
   */
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Sends a 6-digit verification code to the target email using Gmail (Nodemailer) or Resend
   */
  static async sendVerificationCode(toEmail, code, userName = '') {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const resendApiKey = process.env.RESEND_API_KEY;
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

    // -------------------------------------------------------------
    // 1. MÉTODO GMAIL (Sem restrições de destinatário ou domínio)
    // -------------------------------------------------------------
    if (gmailUser && gmailPass) {
      try {
        console.log(`✉️ Enviando e-mail via Gmail (${gmailUser}) para: ${toEmail}...`);
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser.trim(),
            pass: gmailPass.trim().replace(/\s+/g, '') // remove spaces from 16-char app password
          }
        });

        const info = await transporter.sendMail({
          from: `"Assistente Financeiro" <${gmailUser.trim()}>`,
          to: toEmail,
          subject: `${code} é o seu código do Assistente Financeiro`,
          html: htmlContent
        });

        console.log(`✅ E-mail enviado com sucesso via Gmail para ${toEmail}! (ID: ${info.messageId})`);
        return { success: true, id: info.messageId };
      } catch (err) {
        console.error('⚠️ Falha ao disparar e-mail via Gmail:', err);
        throw new Error(`Falha no envio via Gmail: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // 2. MÉTODO RESEND
    // -------------------------------------------------------------
    if (resendApiKey) {
      const fromAddress = process.env.EMAIL_FROM || 'Assistente Financeiro <onboarding@resend.dev>';
      try {
        console.log(`✉️ Enviando e-mail via Resend para: ${toEmail}...`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey.trim()}`,
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
          console.error('⚠️ Erro na resposta da API do Resend:', data);
          if (data.message && data.message.includes('only send testing emails to your own email address')) {
            throw new Error('No plano de teste gratuito do Resend (sem domínio próprio), os e-mails só podem ser enviados para o mesmo e-mail que você usou para criar a conta no Resend. Para enviar para qualquer e-mail de qualquer pessoa, use a opção do Gmail no Render (GMAIL_USER e GMAIL_APP_PASSWORD) ou cadastre um domínio em resend.com/domains.');
          }
          throw new Error(data.message || 'Erro ao enviar e-mail pelo Resend');
        }

        console.log(`✅ E-mail enviado com sucesso via Resend para ${toEmail}! (ID: ${data.id})`);
        return { success: true, id: data.id };
      } catch (err) {
        console.error('⚠️ Falha no envio do e-mail:', err);
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 3. NENHUM SERVIÇO CONFIGURADO
    // -------------------------------------------------------------
    console.error('❌ Nenhum provedor de e-mail (GMAIL ou RESEND) configurado!');
    throw new Error('Serviço de envio de e-mails não configurado. Adicione GMAIL_USER e GMAIL_APP_PASSWORD (ou RESEND_API_KEY) no Render.');
  }
}
