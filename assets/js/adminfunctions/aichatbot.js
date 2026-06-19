// KLASECO AI Chatbot — paste this before </body>
// Connects your existing #aichatbot HTML to ai_proxy.php

(function () {
  // ⚠️ Full absolute URL to avoid redirect issues on Namecheap
  const PROXY_URL = 'https://klaseco.com/api/ai_proxy.php';

  const chatbox  = document.querySelector('.ai-chatbox');
  const input    = document.querySelector('.ai-input');
  const sendBtn  = document.querySelector('.ai-send-btn');
  const suggsDiv = document.querySelector('.ai-suggestions');
  const suggestLabel = document.querySelector('.ai-suggest-label');

  let history = [];
  let suggestionsHidden = false;

  // ── Suggestion chip clicks ──────────────────────────────────
  document.querySelectorAll('.ai-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.textContent.trim();
      doSend();
    });
  });

  // ── Send button & Enter key ─────────────────────────────────
  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSend();
  });

  // ── Main send function ──────────────────────────────────────
  async function doSend() {
    const q = input.value.trim();
    if (!q) return;
    input.value = '';

    // Hide suggestion chips after first message
    if (!suggestionsHidden) {
      if (suggsDiv)       suggsDiv.style.display      = 'none';
      if (suggestLabel)   suggestLabel.style.display   = 'none';
      suggestionsHidden = true;
    }

    appendMsg(q, 'user');
    history.push({ role: 'user', content: q });

    sendBtn.disabled = true;
    const typingEl = appendTyping();

    try {
      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      typingEl.remove();

      if (data.error || data.type === 'error') {
        const errMsg = data.error?.message || data.error || 'An error occurred. Please try again.';
        appendMsg('⚠️ ' + errMsg, 'ai');
        return;
      }

      const reply = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n') || 'No response received.';

      history.push({ role: 'assistant', content: reply });
      appendMsg(reply, 'ai');

    } catch (err) {
      typingEl.remove();
      appendMsg('⚠️ Could not connect to the server. Please check that <code>ai_proxy.php</code> is uploaded.', 'ai');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ── Append a chat message bubble ───────────────────────────
  function appendMsg(text, who) {
    const row = document.createElement('div');
    row.className = 'ai-row ' + (who === 'user' ? 'ai-row-user' : 'ai-row-ai');

    const av = document.createElement('div');
    av.className = 'ai-avatar';
    av.innerHTML = who === 'user'
      ? '<i class="fa-solid fa-user"></i>'
      : '<i class="fa-solid fa-robot"></i>';

    const bub = document.createElement('div');
    bub.className = 'ai-bubble ai-msg ' + (who === 'user' ? 'ai-msg-user' : '');
    bub.innerHTML = formatText(text);

    // User bubble on the right
    if (who === 'user') {
      row.style.flexDirection = 'row-reverse';
      bub.style.background    = 'rgba(255,255,255,0.15)';
      bub.style.color         = '#fff';
      bub.style.marginLeft    = 'auto';
    }

    row.appendChild(av);
    row.appendChild(bub);
    chatbox.appendChild(row);
    chatbox.scrollTop = chatbox.scrollHeight;
  }

  // ── Typing indicator ────────────────────────────────────────
  function appendTyping() {
    const row = document.createElement('div');
    row.className = 'ai-row ai-row-ai';
    row.innerHTML =
      '<div class="ai-avatar"><i class="fa-solid fa-robot"></i></div>' +
      '<div class="ai-bubble ai-msg">' +
        '<span class="ai-typing-dot"></span>' +
        '<span class="ai-typing-dot"></span>' +
        '<span class="ai-typing-dot"></span>' +
      '</div>';
    chatbox.appendChild(row);
    chatbox.scrollTop = chatbox.scrollHeight;
    return row;
  }

  // ── Basic markdown → HTML formatter ────────────────────────
  function formatText(t) {
    return t
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape HTML first
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`([^`]+)`/g,     '<code style="background:rgba(0,0,0,0.2);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
      .replace(/^### (.+)$/gm,   '<p style="font-weight:600;margin:8px 0 3px">$1</p>')
      .replace(/^## (.+)$/gm,    '<p style="font-weight:600;margin:8px 0 3px">$1</p>')
      .replace(/^- (.+)$/gm,     '<div style="padding-left:14px;margin:2px 0">• $1</div>')
      .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:14px;margin:2px 0">$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g,   '<br>');
  }

  // ── Typing dot animation (injected once) ───────────────────
  if (!document.getElementById('ai-typing-style')) {
    const s = document.createElement('style');
    s.id = 'ai-typing-style';
    s.textContent = `
      .ai-typing-dot {
        display: inline-block;
        width: 7px; height: 7px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.5;
        margin: 0 2px;
        animation: aiDotBounce 1.2s infinite;
      }
      .ai-typing-dot:nth-child(2) { animation-delay: .2s; }
      .ai-typing-dot:nth-child(3) { animation-delay: .4s; }
      @keyframes aiDotBounce {
        0%,60%,100% { transform: translateY(0); }
        30%          { transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(s);
  }

})();