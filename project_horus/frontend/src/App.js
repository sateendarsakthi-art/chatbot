import React, { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   LIGHTWEIGHT MARKDOWN RENDERER
   Handles: headings, bold, italic, inline-code,
   code blocks, bullet lists, numbered lists,
   horizontal rules, line breaks
───────────────────────────────────────────── */
function parseMarkdown(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.replace(/^```/, "").trim() || "text";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (bulletMatch) {
      const items = [];
      while (i < lines.length && lines[i].match(/^(\s*)[-*+]\s+(.*)/)) {
        const m = lines[i].match(/^(\s*)[-*+]\s+(.*)/);
        items.push({ indent: m[1].length, content: m[2] });
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (numMatch) {
      const items = [];
      while (i < lines.length && lines[i].match(/^(\s*)\d+\.\s+(.*)/)) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
        items.push({ indent: m[1].length, content: m[2] });
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: "paragraph", content: line });
    i++;
  }

  return blocks;
}

function InlineText({ text }) {
  if (!text) return null;
  // Process inline: bold, italic, inline-code
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={key++} style={{ fontStyle: "italic" }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<strong key={key++}>{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code key={key++} style={inlineCodeStyle}>{match[5]}</code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={key++}>{text.slice(last)}</span>);
  }
  return <>{parts}</>;
}

const inlineCodeStyle = {
  background: "rgba(139, 92, 246, 0.25)",
  border: "1px solid rgba(139, 92, 246, 0.4)",
  borderRadius: "4px",
  padding: "1px 6px",
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  fontSize: "0.85em",
  color: "#c4b5fd",
};

function MarkdownBlock({ block, index }) {
  const headingSizes = { 1: "1.5em", 2: "1.3em", 3: "1.15em", 4: "1.05em", 5: "1em", 6: "0.95em" };

  switch (block.type) {
    case "heading":
      return (
        <div key={index} style={{
          fontSize: headingSizes[block.level] || "1em",
          fontWeight: "700",
          margin: "12px 0 6px",
          color: "#e2d9f3",
          borderBottom: block.level <= 2 ? "1px solid rgba(139,92,246,0.3)" : "none",
          paddingBottom: block.level <= 2 ? "4px" : "0",
        }}>
          <InlineText text={block.content} />
        </div>
      );

    case "code":
      return (
        <div key={index} style={{ margin: "10px 0" }}>
          {block.lang && block.lang !== "text" && (
            <div style={{
              background: "rgba(139, 92, 246, 0.3)",
              borderRadius: "8px 8px 0 0",
              padding: "4px 12px",
              fontSize: "11px",
              color: "#c4b5fd",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderBottom: "1px solid rgba(139,92,246,0.2)",
            }}>
              {block.lang}
            </div>
          )}
          <pre style={{
            background: "rgba(0, 0, 0, 0.45)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderTop: block.lang && block.lang !== "text" ? "none" : undefined,
            borderRadius: block.lang && block.lang !== "text" ? "0 0 8px 8px" : "8px",
            padding: "14px 16px",
            overflowX: "auto",
            margin: 0,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: "13px",
            lineHeight: "1.7",
            color: "#e2e8f0",
            whiteSpace: "pre",
          }}>
            <code>{block.content}</code>
          </pre>
        </div>
      );

    case "ul":
      return (
        <ul key={index} style={{ margin: "6px 0", paddingLeft: "20px", listStyle: "none" }}>
          {block.items.map((item, j) => (
            <li key={j} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginBottom: "4px",
              paddingLeft: item.indent > 0 ? `${item.indent * 12}px` : "0",
              fontSize: "14px",
              lineHeight: "1.6",
            }}>
              <span style={{ color: "#a78bfa", marginTop: "5px", flexShrink: 0, fontSize: "8px" }}>●</span>
              <span><InlineText text={item.content} /></span>
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={index} style={{ margin: "6px 0", paddingLeft: "0", listStyle: "none" }}>
          {block.items.map((item, j) => (
            <li key={j} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "4px",
              paddingLeft: item.indent > 0 ? `${item.indent * 12}px` : "0",
              fontSize: "14px",
              lineHeight: "1.6",
            }}>
              <span style={{
                background: "rgba(139,92,246,0.3)",
                color: "#c4b5fd",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "700",
                flexShrink: 0,
                marginTop: "2px",
              }}>{j + 1}</span>
              <span><InlineText text={item.content} /></span>
            </li>
          ))}
        </ol>
      );

    case "hr":
      return <hr key={index} style={{ border: "none", borderTop: "1px solid rgba(139,92,246,0.25)", margin: "12px 0" }} />;

    case "blank":
      return <div key={index} style={{ height: "6px" }} />;

    case "paragraph":
    default:
      return (
        <p key={index} style={{ margin: "4px 0", fontSize: "14px", lineHeight: "1.7" }}>
          <InlineText text={block.content} />
        </p>
      );
  }
}

function MarkdownRenderer({ text }) {
  const blocks = parseMarkdown(text);
  return (
    <div>
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} index={i} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   COPY BUTTON
───────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} title="Copy message" style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: copied ? "#a78bfa" : "rgba(255,255,255,0.3)",
      fontSize: "13px",
      padding: "2px 4px",
      transition: "color 0.2s",
      flexShrink: 0,
    }}>
      {copied ? "✓" : "⎘"}
    </button>
  );
}

/* ─────────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: "7px", height: "7px",
          borderRadius: "50%",
          background: "#a78bfa",
          display: "inline-block",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WELCOME SCREEN
───────────────────────────────────────────── */
const suggestions = [
  { icon: "💡", label: "Explain quantum computing", sub: "in simple terms" },
  { icon: "🐍", label: "Write a Python web scraper", sub: "with BeautifulSoup" },
  { icon: "✍️", label: "Draft a professional email", sub: "for a job application" },
  { icon: "🧮", label: "Solve a math problem", sub: "step by step" },
];

function WelcomeScreen({ onSuggestion }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: "32px", padding: "20px",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "80px", height: "80px", margin: "0 auto 16px",
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          borderRadius: "24px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "36px",
          boxShadow: "0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.2)",
          animation: "glow 3s ease-in-out infinite",
        }}>
          𓅃
        </div>
        <h2 style={{
          fontSize: "28px", fontWeight: "700", margin: "0 0 8px",
          background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          How can I help you today?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px", margin: 0 }}>
          Ask me anything — code, analysis, writing, math, and more
        </p>
      </div>

      {/* Suggestion Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "12px", width: "100%", maxWidth: "500px",
      }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(`${s.label} ${s.sub}`)}
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "12px",
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              color: "white",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(139,92,246,0.18)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(139,92,246,0.08)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>{s.icon}</div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2d9f3" }}>{s.label}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{s.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
const SESSION_ID = "horus_" + Math.random().toString(36).slice(2, 10);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const sendMessage = useCallback(async (overrideText = null) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg = { id: Date.now(), text, sender: "user" };
    const botId = Date.now() + 1;
    const botMsg = { id: botId, text: "", sender: "bot", streaming: true };

    setMessages(prev => [...prev, userMsg, botMsg]);

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, session_id: SESSION_ID }),
        signal: abortRef.current?.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botText += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === botId ? { ...m, text: botText, streaming: true } : m)
        );
      }

      setMessages(prev =>
        prev.map(m => m.id === botId ? { ...m, text: botText, streaming: false } : m)
      );
    } catch (err) {
      if (err.name === "AbortError") return;
      setMessages(prev =>
        prev.map(m => m.id === botId
          ? { ...m, text: `**Error:** ${err.message}\n\nPlease make sure the backend server is running at http://127.0.0.1:5000`, streaming: false }
          : m
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading]);

  const clearHistory = async () => {
    try {
      await fetch("http://127.0.0.1:5000/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID }),
      });
    } catch (_) {}
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    const el = e.target;
    setInput(el.value);
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #0d0d14; color: white; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 50px rgba(124,58,237,0.7), 0 0 100px rgba(124,58,237,0.3); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .msg-enter { animation: slideInUp 0.3s ease; }
        textarea:focus { outline: none !important; }
        textarea { resize: none; }
        button:focus { outline: none; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0d0d14" }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: sidebarOpen ? "260px" : "0",
          overflow: "hidden",
          transition: "width 0.3s ease",
          flexShrink: 0,
          background: "rgba(255,255,255,0.02)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ padding: "20px 16px", minWidth: "260px" }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
              <div style={{
                width: "36px", height: "36px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px",
                boxShadow: "0 0 20px rgba(124,58,237,0.4)",
              }}>𓅃</div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "16px", color: "#e2d9f3" }}>Horus</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>AI Assistant</div>
              </div>
            </div>

            {/* New Chat */}
            <button
              onClick={clearHistory}
              style={{
                width: "100%", padding: "10px 14px",
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: "10px",
                color: "#c4b5fd",
                fontSize: "13px", fontWeight: "600",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.28)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.15)"; }}
            >
              <span style={{ fontSize: "16px" }}>✦</span>
              New Conversation
            </button>

            {/* Info */}
            <div style={{ marginTop: "24px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Session Info
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: "1.8" }}>
                <div>💬 Messages: {messages.length}</div>
                <div>🔗 Session: {SESSION_ID.slice(-6)}</div>
                <div>🤖 Model: GPT-4o</div>
              </div>
            </div>

            {/* Features */}
            <div style={{ marginTop: "24px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Capabilities
              </div>
              {[
                { icon: "💻", label: "Code & Debug" },
                { icon: "📝", label: "Writing & Analysis" },
                { icon: "🧮", label: "Math & Logic" },
                { icon: "🎨", label: "Creative Tasks" },
                { icon: "🔬", label: "Research Help" },
              ].map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "2px",
                }}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN CHAT AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Header */}
          <div style={{
            padding: "14px 20px",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}>
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: "18px", padding: "4px",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
              title="Toggle sidebar"
            >
              ☰
            </button>

            {/* Logo & Name */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
                boxShadow: "0 0 15px rgba(124,58,237,0.4)",
              }}>𓅃</div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#e2d9f3" }}>Horus</div>
                <div style={{ fontSize: "11px", color: loading ? "#a78bfa" : "#22c55e", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: loading ? "#a78bfa" : "#22c55e",
                    display: "inline-block",
                    animation: loading ? "pulse 1s ease infinite" : "none",
                  }} />
                  {loading ? "Thinking…" : "Online"}
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Clear button */}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  padding: "6px 14px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "8px",
                  color: "rgba(239,68,68,0.7)",
                  fontSize: "12px", fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "rgb(239,68,68)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "rgba(239,68,68,0.7)"; }}
              >
                Clear Chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={chatBoxRef} style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}>
            {messages.length === 0 ? (
              <WelcomeScreen onSuggestion={text => { setInput(text); sendMessage(text); }} />
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className="msg-enter"
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    {/* Bot avatar */}
                    {!isUser && (
                      <div style={{
                        width: "30px", height: "30px",
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0,
                        marginRight: "10px",
                        marginTop: "2px",
                        boxShadow: "0 0 12px rgba(124,58,237,0.35)",
                      }}>𓅃</div>
                    )}

                    {/* Bubble */}
                    <div style={{
                      maxWidth: "75%",
                      minWidth: "60px",
                    }}>
                      {/* Sender label */}
                      <div style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: isUser ? "rgba(255,255,255,0.4)" : "rgba(167,139,250,0.7)",
                        marginBottom: "5px",
                        textAlign: isUser ? "right" : "left",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}>
                        {isUser ? "You" : "Horus"}
                      </div>

                      {/* Message content */}
                      <div style={{
                        background: isUser
                          ? "linear-gradient(135deg, #6d28d9, #4338ca)"
                          : "rgba(255,255,255,0.05)",
                        border: isUser
                          ? "none"
                          : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                        padding: isUser ? "12px 16px" : "14px 18px",
                        color: "rgba(255,255,255,0.92)",
                        boxShadow: isUser
                          ? "0 4px 20px rgba(109,40,217,0.35)"
                          : "0 2px 12px rgba(0,0,0,0.2)",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        backdropFilter: !isUser ? "blur(8px)" : "none",
                        position: "relative",
                      }}>
                        {isUser ? (
                          <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                        ) : msg.streaming && !msg.text ? (
                          <TypingIndicator />
                        ) : (
                          <MarkdownRenderer text={msg.text} />
                        )}

                        {/* Streaming cursor */}
                        {msg.streaming && msg.text && (
                          <span style={{
                            display: "inline-block",
                            width: "2px", height: "16px",
                            background: "#a78bfa",
                            marginLeft: "2px",
                            verticalAlign: "text-bottom",
                            animation: "pulse 0.8s ease infinite",
                          }} />
                        )}
                      </div>

                      {/* Copy button */}
                      {!isUser && !msg.streaming && msg.text && (
                        <div style={{ display: "flex", marginTop: "4px", paddingLeft: "4px" }}>
                          <CopyButton text={msg.text} />
                        </div>
                      )}
                    </div>

                    {/* User avatar */}
                    {isUser && (
                      <div style={{
                        width: "30px", height: "30px",
                        background: "linear-gradient(135deg, #6d28d9, #4338ca)",
                        borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "13px",
                        flexShrink: 0,
                        marginLeft: "10px",
                        marginTop: "2px",
                      }}>👤</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: "16px 20px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.015)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}>
            <div style={{
              maxWidth: "800px",
              margin: "0 auto",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              padding: "12px 16px",
              boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 8px 32px rgba(0,0,0,0.3)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(139,92,246,0.1)";
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(139,92,246,0.1), 0 8px 32px rgba(0,0,0,0.3)";
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Message Horus…"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  fontFamily: "'Inter', sans-serif",
                  padding: "2px 0",
                  maxHeight: "180px",
                  overflowY: "auto",
                  caretColor: "#a78bfa",
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                title="Send (Enter)"
                style={{
                  width: "36px", height: "36px",
                  borderRadius: "10px",
                  border: "none",
                  background: !input.trim() || loading
                    ? "rgba(139,92,246,0.2)"
                    : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: !input.trim() || loading ? "rgba(139,92,246,0.4)" : "white",
                  cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  boxShadow: !input.trim() || loading ? "none" : "0 4px 12px rgba(124,58,237,0.4)",
                }}
                onMouseEnter={e => {
                  if (!loading && input.trim()) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.6)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = !input.trim() || loading ? "none" : "0 4px 12px rgba(124,58,237,0.4)";
                }}
              >
                {loading ? (
                  <span style={{ fontSize: "14px", animation: "pulse 1s ease infinite" }}>◌</span>
                ) : "↑"}
              </button>
            </div>
            <div style={{
              textAlign: "center",
              marginTop: "10px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.2)",
            }}>
              Horus can make mistakes. Press <kbd style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1px 5px", fontSize: "10px" }}>Enter</kbd> to send · <kbd style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1px 5px", fontSize: "10px" }}>Shift+Enter</kbd> for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}