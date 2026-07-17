import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, HelpCircle } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I am **BrightBot**, your personal admissions and course assistant for **BrightMinds Academy**. 🎓\n\nHow can I help you or your child today? Feel free to ask about our academic courses, coding/digital classes, test preparation, or how to book a free demo!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the messages list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isGenerating, isOpen]);

  // Show a ping notification on the button initially, remove after opening once
  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHasNewMessage(false);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;

    const userMsg: Message = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(1), // Exclude the initial welcome message from the API history
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response from API");
      }

      const data = await response.json();
      if (data && data.text) {
        setMessages((prev) => [...prev, { role: "model", text: data.text }]);
      } else {
        throw new Error("Empty response received");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Oops, I'm having trouble connecting to my brain right now. 🧠 Let me answer offline:\n\nBrightMinds Academy is fully functional! If you're encountering an API issue, please ensure **GEMINI_API_KEY** is configured in your project settings. Feel free to use the form below to register or contact us at **admissions@brightmindsacademy.com**!",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputText);
  };

  // Helper to parse simple markdown formatting like **bold** and bullet points
  const formatText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      // Process bold formatting **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-slate-900 dark:text-white">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Check if line is a bullet point
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <div key={lineIdx} className="flex gap-2 pl-2 my-1">
            <span className="text-blue-500">•</span>
            <span className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {parts.length > 0 ? parts : line.substring(2)}
            </span>
          </div>
        );
      }

      return (
        <p key={lineIdx} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 min-h-[1rem]">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  const suggestionChips = [
    "What academic subjects do you teach?",
    "How can I book a free demo?",
    "Tell me about spoken English courses",
    "Where is the academy located?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="ai-chatbot-wrapper">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div
          className="w-[90vw] sm:w-[380px] h-[520px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          id="ai-chatbot-window"
        >
          {/* Chat Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative">
                <Bot className="w-5.5 h-5.5 text-white animate-pulse" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-blue-600 dark:border-blue-700 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight text-white">BrightBot</h3>
                  <div className="flex items-center bg-blue-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-blue-100 gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> AI Assistant
                  </div>
                </div>
                <p className="text-[10px] text-blue-100">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-xl hover:bg-white/15 transition-colors text-white"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.role === "user"
                      ? "bg-blue-500 border-blue-400 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 shadow-sm rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-tl-none"
                  }`}
                >
                  <div className="space-y-1">{formatText(msg.text)}</div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isGenerating && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="w-7.5 h-7.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips */}
            {messages.length === 1 && !isGenerating && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip)}
                      className="text-xs text-left px-3 py-2 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-200 shadow-sm"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSubmit} className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about BrightMinds..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                inputText.trim() && !isGenerating
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-md shadow-blue-500/10"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={handleToggle}
        className="relative group w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        id="ai-chatbot-toggle"
        aria-label="Open AI Assistant Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform rotate-0 duration-300 group-hover:rotate-90" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6" />
            {hasNewMessage && (
              <>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                </span>
              </>
            )}
          </>
        )}
      </button>
    </div>
  );
};
