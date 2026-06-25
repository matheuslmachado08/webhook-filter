const express = require("express");
const app = express();
app.use(express.json({ limit: "50mb" }));

const ALLOWED_JID = "558182638726@s.whatsapp.net";
const N8N_WEBHOOK_URL = "https://n8n-main-instance-production-d8e2.up.railway.app/webhook/audio-resumo";
const PORT = process.env.PORT || 3000;

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    const messages = body?.data?.messages || (body?.data ? [body.data] : []);
    const message = messages[0] || body?.data;

    const remoteJid = message?.key?.remoteJid || body?.data?.key?.remoteJid;
    const messageType = message?.messageType || body?.data?.messageType;
    const fromMe = message?.key?.fromMe || body?.data?.key?.fromMe;

    console.log(`Recebido: jid=${remoteJid}, type=${messageType}, fromMe=${fromMe}`);

    // Ignora mensagens enviadas por mim
    if (fromMe) {
      return res.status(200).json({ status: "ignored", reason: "fromMe" });
    }

    // Filtra: só passa se for do contato certo E for áudio
    if (remoteJid !== ALLOWED_JID || messageType !== "audioMessage") {
      return res.status(200).json({ status: "ignored", reason: "not matching" });
    }

    // Encaminha para o n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    console.log(`Encaminhado para n8n: status=${response.status}`);
    return res.status(200).json({ status: "forwarded" });

  } catch (err) {
    console.error("Erro:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Filtro rodando na porta ${PORT}`));
