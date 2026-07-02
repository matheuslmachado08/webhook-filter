const express = require("express");
const app = express();
app.use(express.json({ limit: "50mb" }));

const ALLOWED_JIDS = ["247007897714840@lid", "82274544545844@lid"]; // contatos que podem te mandar áudio
const OWN_JID = "5511999999999@s.whatsapp.net"; // seu próprio número, troque pelo valor real
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

    // Se a mensagem foi enviada por mim...
    if (fromMe) {
      // só deixa passar se for uma nota pra mim mesmo (remetente = meu próprio JID)
      if (remoteJid !== OWN_JID) {
        return res.status(200).json({ status: "ignored", reason: "fromMe to someone else" });
      }
    } else {
      // mensagem de terceiros: só passa se for de um contato autorizado
      if (!ALLOWED_JIDS.includes(remoteJid)) {
        return res.status(200).json({ status: "ignored", reason: "not allowed contact" });
      }
    }
    
    // Em ambos os casos, só segue se for áudio
    if (messageType !== "audioMessage") {
      return res.status(200).json({ status: "ignored", reason: "not audio" });
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
