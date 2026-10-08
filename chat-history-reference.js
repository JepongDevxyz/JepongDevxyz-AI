/* JepongDevxyz AI — ChatGPT-style past chat reference v1 (2026-10-08)
 * Pure, additive retrieval helper. It never mutates chat sessions.
 */
(function (root) {
  'use strict';

  const STOP = new Set([
    'the','and','for','with','that','this','from','have','has','are','was','were','will','would',
    'about','into','your','you','our','their','then','than','what','when','where','which','who',
    'how','can','could','should','please','help','make','gawin','mo','ang','ng','mga','ito','iyon',
    'ako','ikaw','natin','para','sa','at','na','may','ito','yung','kung','sige','okay'
  ]);

  function tokens(value) {
    return [...new Set(
      String(value || '')
        .toLowerCase()
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !STOP.has(t))
    )];
  }

  function scoreText(text, queryTokens) {
    const ts = tokens(text);
    if (!ts.length || !queryTokens.length) return 0;
    const set = new Set(ts);
    let score = 0;
    for (const q of queryTokens) if (set.has(q)) score += 1;
    return score;
  }

  function messageText(message) {
    return String(message?.text || '').trim();
  }

  function compactMessage(message, maxChars) {
    const text = messageText(message).replace(/\s+/g, ' ').trim();
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
  }

  function buildPastReference(sessions, currentSessionId, prompt, options = {}) {
    if (!sessions || typeof sessions !== 'object') return [];
    const queryTokens = tokens(prompt);
    if (queryTokens.length < 1) return [];

    const maxSessions = Math.max(1, Math.min(4, Number(options.maxSessions) || 3));
    const maxMessages = Math.max(2, Math.min(8, Number(options.maxMessages) || 5));
    const maxChars = Math.max(1200, Math.min(9000, Number(options.maxChars) || 6000));

    const ranked = Object.values(sessions)
      .filter(session => session && session.id && session.id !== currentSessionId && Array.isArray(session.messages) && session.messages.length)
      .map(session => {
        const title = String(session.title || '').trim();
        const all = session.messages;
        const titleScore = scoreText(title, queryTokens) * 5;
        let bodyScore = 0;
        for (const m of all) bodyScore += scoreText(messageText(m), queryTokens) * (m?.role === 'user' ? 3 : 1);
        const lastTs = Number(session.updatedAt || session.updated_at || 0);
        const recency = Number.isFinite(lastTs) && lastTs > 0
          ? Math.min(1.5, Math.max(0, (lastTs - Date.now() + 30 * 86400000) / (30 * 86400000)))
          : 0;
        return { session, score: titleScore + bodyScore + recency };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSessions);

    if (!ranked.length) return [];

    const blocks = [];
    let used = 0;
    for (const item of ranked) {
      const session = item.session;
      const title = String(session.title || 'Past chat').trim().slice(0, 120);
      const messages = session.messages
        .map((m, index) => ({ m, index, score: scoreText(messageText(m), queryTokens) }))
        .filter(x => messageText(x.m))
        .sort((a, b) => b.score - a.score || b.index - a.index)
        .slice(0, maxMessages)
        .sort((a, b) => a.index - b.index);

      let block = 'Chat: ' + title + '\n';
      for (const x of messages) {
        const role = x.m?.role === 'bot' ? 'Assistant' : 'User';
        block += role + ': ' + compactMessage(x.m, 900) + '\n';
      }
      if (block.length < 18) continue;
      if (used + block.length > maxChars) {
        const remaining = maxChars - used;
        if (remaining < 180) break;
        block = block.slice(0, remaining - 1) + '…';
      }
      blocks.push(block.trim());
      used += block.length;
      if (used >= maxChars) break;
    }

    if (!blocks.length) return [];
    return [{
      role: 'user',
      parts: [{
        text:
          '[PAST CHAT REFERENCE — retrieved from the signed-in account’s saved chats]\n' +
          'Treat the following as background context only. Do not claim it was said in the current conversation unless the current conversation confirms it.\n\n' +
          blocks.join('\n\n')
      }]
    }];
  }

  root.JDChatHistoryReference = Object.freeze({ buildPastReference, tokens });
})(window);
