"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { LiquidMetalButton } from "./LiquidMetalButton";
import type { LocaleConfig } from "../i18n/config";
import type { Organ } from "../i18n/merge";
import type { UiDictionary } from "../i18n/types";
import { format } from "../i18n/types";
import {
  clearChatHistory,
  getApiKeyServerSnapshot,
  getApiKeySnapshot,
  getChatHistoryServerSnapshot,
  getChatHistorySnapshot,
  getSelectedModel,
  hasApiKey,
  removeApiKey,
  saveApiKey,
  saveChatHistory,
  saveSelectedModel,
  subscribeApiKey,
  subscribeChatHistory,
  type ChatMessage,
  type GeminiModelOption,
} from "../lib/gemini-storage";
import { streamGeminiChat, validateGeminiApiKey } from "../lib/gemini";

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrgan?: Organ;
  locale: LocaleConfig;
  t: UiDictionary;
}

/**
 * A lightweight Markdown renderer for assistant responses.
 * Parses headers, bold, italics, bullet lists, numbered lists, and code blocks safely.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="ai-code-block">
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="ai-md-spacer" />);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={`h3-${i}`} className="ai-md-h3">{formatInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={`h2-${i}`} className="ai-md-h2">{formatInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={`h1-${i}`} className="ai-md-h1">{formatInline(line.slice(2))}</h2>);
      continue;
    }

    // Bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("• ")) {
      const cleanLine = line.trim().replace(/^[-*•]\s+/, "");
      elements.push(
        <div key={`li-${i}`} className="ai-md-bullet">
          <span className="ai-md-bullet-dot">✦</span>
          <span>{formatInline(cleanLine)}</span>
        </div>
      );
      continue;
    }

    // Numbered lists
    const numMatch = line.trim().match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="ai-md-num-item">
          <span className="ai-md-num-badge">{numMatch[1]}</span>
          <span>{formatInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      elements.push(
        <blockquote key={`quote-${i}`} className="ai-md-quote">
          {formatInline(line.trim().slice(2))}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="ai-md-p">
        {formatInline(line)}
      </p>
    );
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre key="code-unclosed" className="ai-code-block">
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="ai-markdown-body">{elements}</div>;
}

/**
 * Parses bold (**text**), italics (*text*), and inline code (`code`)
 */
function formatInline(text: string): React.ReactNode[] {
  // Regex to split on bold, italic, or code
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return <strong key={idx}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      return <em key={idx}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return <code key={idx} className="ai-inline-code">{token.slice(1, -1)}</code>;
    }
    return token;
  });
}

export function AiChatModal({
  isOpen,
  onClose,
  currentOrgan,
  locale,
  t,
}: AiChatModalProps) {
  const apiKey = useSyncExternalStore(subscribeApiKey, getApiKeySnapshot, getApiKeyServerSnapshot);
  const chatHistory = useSyncExternalStore(subscribeChatHistory, getChatHistorySnapshot, getChatHistoryServerSnapshot);

  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<GeminiModelOption>(getSelectedModel());
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ status: "success" | "error" | null; message: string }>({
    status: null,
    message: "",
  });
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync temp key with stored key when opening settings
  useEffect(() => {
    setTempApiKey(apiKey);
    setSelectedModel(getSelectedModel());
  }, [apiKey, showKeySettings]);

  // Scroll to bottom of message list on new content
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isGenerating, isOpen]);

  // Auto-focus input when chat is opened
  useEffect(() => {
    if (isOpen && !showKeySettings && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, showKeySettings]);

  const handleValidateAndSaveKey = async () => {
    if (!tempApiKey.trim()) {
      setKeyFeedback({
        status: "error",
        message: t.aiChat.keyInvalid,
      });
      return;
    }

    setIsValidatingKey(true);
    setKeyFeedback({ status: null, message: "" });

    try {
      const result = await validateGeminiApiKey(tempApiKey.trim());
      if (result.valid) {
        saveApiKey(tempApiKey.trim());
        saveSelectedModel(selectedModel);
        setKeyFeedback({
          status: "success",
          message: t.aiChat.keyValid,
        });
        setTimeout(() => {
          setShowKeySettings(false);
          setKeyFeedback({ status: null, message: "" });
        }, 1200);
      } else {
        setKeyFeedback({
          status: "error",
          message: result.error || t.aiChat.keyInvalid,
        });
      }
    } catch {
      setKeyFeedback({
        status: "error",
        message: t.aiChat.keyInvalid,
      });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setTempApiKey("");
    setKeyFeedback({
      status: "success",
      message: "کلید با موفقیت حذف شد.",
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputPrompt).trim();
    if (!query || isGenerating) return;

    if (!hasApiKey()) {
      setShowKeySettings(true);
      return;
    }

    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      text: query,
      timestamp: Date.now(),
      organId: currentOrgan?.id,
      organName: currentOrgan?.name,
    };

    const updatedHistory = [...chatHistory, userMessage];
    saveChatHistory(updatedHistory);

    const modelMessageId = `model-${Date.now()}`;
    const placeholderModelMessage: ChatMessage = {
      id: modelMessageId,
      role: "model",
      text: "",
      timestamp: Date.now(),
      organId: currentOrgan?.id,
      organName: currentOrgan?.name,
    };

    const streamingHistory = [...updatedHistory, placeholderModelMessage];
    saveChatHistory(streamingHistory);

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulated = "";

    try {
      await streamGeminiChat({
        apiKey,
        model: selectedModel,
        messages: updatedHistory,
        currentOrgan,
        localeCode: locale.code,
        signal: abortController.signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          const currentHist = getChatHistorySnapshot();
          const targetIndex = currentHist.findIndex((m) => m.id === modelMessageId);
          if (targetIndex !== -1) {
            currentHist[targetIndex].text = accumulated;
            saveChatHistory([...currentHist]);
          }
        },
      });
    } catch (err: unknown) {
      if (!abortController.signal.aborted) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const currentHist = getChatHistorySnapshot();
        const targetIndex = currentHist.findIndex((m) => m.id === modelMessageId);
        if (targetIndex !== -1) {
          currentHist[targetIndex].text = accumulated
            ? `${accumulated}\n\n⚠️ **${t.aiChat.errorPrefix}** ${errorMsg}`
            : `⚠️ **${t.aiChat.errorPrefix}** ${errorMsg}\n\n_${t.aiChat.networkHint}_`;
          currentHist[targetIndex].isError = true;
          saveChatHistory([...currentHist]);
        }
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm(t.aiChat.clearChatConfirm)) {
      clearChatHistory();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const quickPrompts = [
    { label: t.aiChat.promptExplain, icon: "💡" },
    { label: t.aiChat.promptConditions, icon: "🩺" },
    { label: t.aiChat.promptQuiz, icon: "🎯" },
    { label: t.aiChat.promptSystemRole, icon: "🔄" },
    { label: t.aiChat.promptMicroscopic, icon: "🔬" },
  ];

  if (!isOpen) return null;

  return (
    <div className="ai-chat-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-chat-title">
      <div className={`ai-chat-drawer ${expanded ? "expanded" : ""}`}>
        {/* Drawer Header */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-main">
            <div className="ai-chat-avatar-wrapper">
              <div className={`ai-chat-avatar ${isGenerating ? "pulsing" : ""}`}>
                <Bot size={22} className="ai-avatar-icon" />
              </div>
              <span className={`ai-status-indicator ${hasApiKey() ? "online" : "warning"}`} />
            </div>
            <div className="ai-chat-titles">
              <div className="ai-chat-title-row">
                <h3 id="ai-chat-title" className="ai-chat-title">{t.aiChat.title}</h3>
                <span className="ai-chat-badge">
                  <Sparkles size={11} /> {t.aiChat.badge}
                </span>
              </div>
              <div className="ai-chat-subtitle">
                {currentOrgan ? (
                  <span className="ai-organ-pill">
                    {format(t.aiChat.currentOrganBadge, { organ: currentOrgan.name })}
                  </span>
                ) : (
                  <span>{t.aiChat.allOrgansBadge}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <LiquidMetalButton
              size="icon-sm"
              variant={showKeySettings ? "purple" : "silver"}
              active={showKeySettings}
              onClick={() => setShowKeySettings(!showKeySettings)}
              title={t.aiChat.keySettings}
              aria-label={t.aiChat.keySettings}
              icon={<Key size={15} />}
              badge={!hasApiKey() ? <span className="ai-key-missing-dot" /> : undefined}
            />
            {chatHistory.length > 0 && (
              <LiquidMetalButton
                size="icon-sm"
                variant="ruby"
                onClick={handleClearHistory}
                title={t.aiChat.clearChat}
                aria-label={t.aiChat.clearChat}
                icon={<Trash2 size={15} />}
              />
            )}
            <LiquidMetalButton
              size="icon-sm"
              variant="silver"
              className="desktop-only"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Restore size" : "Expand"}
              aria-label="Toggle size"
              icon={expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            />
            <LiquidMetalButton
              size="icon-sm"
              variant="ruby"
              onClick={onClose}
              title={t.aiChat.closeChat}
              aria-label={t.aiChat.closeChat}
              icon={<X size={17} />}
            />
          </div>
        </header>

        {/* API Key Settings View */}
        {showKeySettings ? (
          <div className="ai-key-settings-panel">
            <div className="ai-settings-card">
              <div className="ai-settings-card-header">
                <Key size={22} className="ai-settings-card-icon" />
                <div>
                  <h4 className="ai-settings-card-title">{t.aiChat.apiKeyTitle}</h4>
                  <p className="ai-settings-card-desc">{t.aiChat.apiKeyDesc}</p>
                </div>
              </div>

              <div className="ai-key-form">
                <div className="ai-input-group">
                  <label htmlFor="gemini-api-key-input">Gemini API Key:</label>
                  <div className="ai-key-input-wrapper">
                    <input
                      id="gemini-api-key-input"
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder={t.aiChat.apiKeyPlaceholder}
                      className="ai-key-input"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className="ai-input-group">
                  <label htmlFor="gemini-model-select">{t.aiChat.selectModel}</label>
                  <select
                    id="gemini-model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as GeminiModelOption)}
                    className="ai-model-select"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (سریع، جدید و پیشنهادی)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (سریع و بهینه)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (پیشرفته و تحلیلی)</option>
                  </select>
                </div>

                {keyFeedback.status && (
                  <div className={`ai-feedback-banner ${keyFeedback.status}`}>
                    {keyFeedback.status === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{keyFeedback.message}</span>
                  </div>
                )}

                <div className="ai-settings-actions">
                  <button
                    type="button"
                    className="ai-btn-primary"
                    onClick={handleValidateAndSaveKey}
                    disabled={isValidatingKey || !tempApiKey.trim()}
                  >
                    {isValidatingKey ? (
                      <>
                        <RefreshCw size={16} className="ai-spinner" />
                        <span>{t.aiChat.testingKey}</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{t.aiChat.saveKey}</span>
                      </>
                    )}
                  </button>

                  {hasApiKey() && (
                    <button
                      type="button"
                      className="ai-btn-danger"
                      onClick={handleRemoveKey}
                      disabled={isValidatingKey}
                    >
                      {t.aiChat.removeKey}
                    </button>
                  )}
                </div>

                <div className="ai-settings-footer-info">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-get-key-link"
                  >
                    <span>{t.aiChat.getFreeKey}</span>
                    <ExternalLink size={14} />
                  </a>

                  <div className="ai-privacy-badge">
                    <ShieldCheck size={16} />
                    <span>{t.aiChat.privacyNote}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat History & Messages View */
          <div className="ai-chat-body">
            {/* Warning banner when key is missing */}
            {!hasApiKey() && (
              <div className="ai-no-key-banner">
                <AlertCircle size={18} />
                <div className="ai-no-key-text">
                  <strong>{t.aiChat.noKeyPrompt}</strong>
                </div>
                <button
                  type="button"
                  className="ai-btn-accent-sm"
                  onClick={() => setShowKeySettings(true)}
                >
                  <Key size={14} />
                  <span>{t.aiChat.enterKeyButton}</span>
                </button>
              </div>
            )}

            {/* Empty state / Welcome card */}
            {chatHistory.length === 0 ? (
              <div className="ai-welcome-container">
                <div className="ai-welcome-card">
                  <div className="ai-welcome-crest">
                    <Sparkles size={28} />
                  </div>
                  <h4 className="ai-welcome-title">{t.aiChat.title}</h4>
                  <p className="ai-welcome-text">{t.aiChat.greeting}</p>
                </div>

                <div className="ai-quick-prompts-section">
                  <span className="ai-quick-prompts-heading">
                    <HelpCircle size={14} /> پیشنهادات و سوالات پرکاربرد:
                  </span>
                  <div className="ai-quick-chips-grid">
                    {quickPrompts.map((p, idx) => (
                      <LiquidMetalButton
                        key={idx}
                        size="sm"
                        variant="purple"
                        onClick={() => handleSendMessage(p.label)}
                        icon={<span className="ai-chip-icon">{p.icon}</span>}
                      >
                        {p.label}
                      </LiquidMetalButton>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="ai-messages-list">
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`ai-message-row ${msg.role === "user" ? "user-row" : "model-row"}`}
                  >
                    <div className="ai-message-bubble">
                      <div className="ai-message-meta">
                        <span className="ai-message-sender">
                          {msg.role === "user" ? "شما" : t.aiChat.title}
                        </span>
                        {msg.organName && (
                          <span className="ai-message-organ-tag">[{msg.organName}]</span>
                        )}
                        {msg.role === "model" && (
                          <button
                            type="button"
                            className="ai-copy-btn"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            title={t.aiChat.copy}
                            aria-label={t.aiChat.copy}
                          >
                            {copiedIndex === msg.id ? (
                              <Check size={13} className="text-success" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="ai-message-content">
                        {msg.role === "user" ? (
                          <p className="ai-user-text">{msg.text}</p>
                        ) : msg.text ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          <div className="ai-typing-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Chat Input Bar */}
        {!showKeySettings && (
          <footer className="ai-chat-footer">
            {currentOrgan && (
              <div className="ai-input-context-pill">
                <Sparkles size={12} />
                <span>تمرکز بر اندام فعلی: <strong>{currentOrgan.name}</strong></span>
              </div>
            )}
            <form
              className="ai-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => {
                  setInputPrompt(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t.aiChat.placeholder}
                rows={1}
                className="ai-chat-textarea"
                disabled={isGenerating}
              />

              <div className="ai-input-buttons">
                {isGenerating ? (
                  <LiquidMetalButton
                    size="icon-sm"
                    variant="ruby"
                    onClick={handleStopGenerating}
                    title={t.aiChat.stop}
                    aria-label={t.aiChat.stop}
                    icon={<Square size={15} />}
                  />
                ) : (
                  <LiquidMetalButton
                    size="icon-sm"
                    variant="teal"
                    type="submit"
                    disabled={!inputPrompt.trim()}
                    title={t.aiChat.send}
                    aria-label={t.aiChat.send}
                    icon={<Send size={15} />}
                  />
                )}
              </div>
            </form>
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * Floating trigger button for opening the AI Chatbot with Liquid Metal Orb finish.
 */
export function AiChatFab({
  onClick,
  isOpen,
  t,
}: {
  onClick: () => void;
  isOpen: boolean;
  t: UiDictionary;
}) {
  const apiKey = useSyncExternalStore(subscribeApiKey, getApiKeySnapshot, getApiKeyServerSnapshot);
  const keyConfigured = Boolean(apiKey && apiKey.length > 5);

  if (isOpen) return null;

  return (
    <div className="ai-chat-fab-metal">
      <div className="ai-chat-fab-glow" aria-hidden="true" />
      <LiquidMetalButton
        size="icon-lg"
        variant="purple"
        glow={true}
        onClick={onClick}
        aria-label={t.aiChat.openChat}
        title={t.aiChat.openChat}
        icon={<Sparkles size={22} />}
        badge={!keyConfigured ? <span className="ai-fab-badge-dot" /> : undefined}
      />
    </div>
  );
}
