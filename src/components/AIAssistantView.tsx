import React from "react";
import { ERPData, User } from "../types";
import { Bot, Send, Sparkles, MessageSquare, ListCollapse, Play, CheckCircle2, AlertCircle } from "lucide-react";

interface AIAssistantViewProps {
  data: ERPData;
  currentUser: User;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Which products are running low of stock?",
  "What is my total inventory valuation (cost price basis)?",
  "Show active suppliers with pending unpaid ledger balances.",
  "Which surgical items expire in the next 60 days?",
  "Recommend dynamic stock requirements prediction for next month."
];

// Helper to render bold text and bullet points cleanly on UI without relying on heavy external parses
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
      {lines.map((line, idx) => {
        // Detect bullet points
        const isBullet = line.trim().startsWith("•") || line.trim().startsWith("*") || line.trim().startsWith("-");
        let processedLine = line;
        
        if (isBullet) {
          processedLine = line.trim().substring(1).trim();
        }

        // Format bold tags **hello**
        const parts = processedLine.split(/\*\*(.*?)\*\*/g);
        const formattedElement = (
          <span>
            {parts.map((part, i) => (
              i % 2 === 1 ? <strong key={i} className="font-extrabold text-[#0F4C81]">{part}</strong> : part
            ))}
          </span>
        );

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-3">
              <span className="text-[#4A90E2] font-semibold mt-1 shrink-0">•</span>
              <p className="flex-1 text-slate-700">{formattedElement}</p>
            </div>
          );
        }

        // Check if headers ###
        if (line.trim().startsWith("###") || line.trim().startsWith("##")) {
          const headerText = line.replace(/#/g, "").trim();
          return (
            <h4 key={idx} className="text-xs font-extrabold text-[#0F4C81] tracking-tight pt-2 uppercase">
              {headerText}
            </h4>
          );
        }

        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }

        return <p key={idx}>{formattedElement}</p>;
      })}
    </div>
  );
}

export default function AIAssistantView({ data, currentUser }: AIAssistantViewProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Scroll chats dynamically to the bottom on fresh replies
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Welcome introductory state
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello **${currentUser.name}**! I am your Divine Surgicals Business Consultant.\n\nI have evaluated the current operational index for our Silchar store. Ask me complex business questions or ask about:\n• Low stocks requiring replenishment from Surgiplus Distributors Guwahati\n• Total locking capital valuation\n• Pending dues and hospital credit limits\n• Medical items expiring within next 30-60 days.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [currentUser, messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    const token = localStorage.getItem("divine_erp_token") || "";
    try {
      const response = await fetch("/api/erp/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to reach Gemini core gateway node on server");
      }

      const resData = await response.json();
      const assistantMsg: Message = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        content: resData.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `m-${Date.now()}-err`,
        role: 'assistant',
        content: `Sorry, there was an issue communicating with the Divine server logic: [${err.message}]. Please ensure you have configured your environment variables correctly or retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row h-[550px] overflow-hidden">
      
      {/* Quick advice options sidebar */}
      <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between shrink-0 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#0F4C81] animate-bounce" size={18} />
            <h3 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Consultant Guide</h3>
          </div>
          
          <p className="text-[11px] text-slate-500 leading-normal">
            Click any hot-trigger below to instantly formulate data insight audits from the inventory databases.
          </p>

          <div className="space-y-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="w-full text-left p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#0F4C81] rounded-xl text-[11px] font-semibold text-slate-700 transition block leading-normal cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#DCEEFF]/55 rounded-xl p-3 border border-blue-100 text-[10px] text-slate-500 leading-snug flex items-start gap-2">
          <CheckCircle2 className="text-[#0F4C81] shrink-0" size={14} />
          <div>
            <p className="font-bold text-[#0F4C81]">Intelligent Model Active</p>
            <p>Access privileges align with: <strong>{currentUser.role}</strong>.</p>
          </div>
        </div>
      </div>

      {/* Main chat log console */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Chat head */}
        <div className="px-5 py-3.5 border-b border-rose-50/10 shadow-xs bg-slate-50/50 flex justify-between items-center bg-slate-50 px-4 py-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Bot className="text-[#0F4C81]" size={18} />
            <div>
              <p className="text-slate-800 font-bold leading-none">Internal AI Consultant</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gemini 3.5 Flash Integration Server Active</p>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#28A745] inline-block animate-ping"></span>
        </div>

        {/* Chat message listings */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {messages.map((m) => {
            const isAi = m.role === 'assistant';
            return (
              <div 
                key={m.id}
                className={`flex gap-3 max-w-[80%] ${isAi ? "mr-auto text-left" : "ml-auto text-right flex-row-reverse"}`}
              >
                {/* Icon wrapper */}
                <div className={`p-2 rounded-xl shrink-0 h-max
                  ${isAi ? "bg-[#DCEEFF] text-[#0F4C81]" : "bg-slate-100 text-slate-600"}
                `}>
                  {isAi ? <Bot size={16} /> : <MessageSquare size={16} />}
                </div>

                {/* Bubble content */}
                <div className={`p-4 rounded-2xl border text-xs
                  ${isAi 
                    ? "bg-white border-slate-100 text-slate-800 shadow-xs" 
                    : "bg-[#0F4C81] text-white border-blue-900 shadow-xs text-left"
                  }
                `}>
                  {isAi ? (
                    <FormattedMessageText text={m.content} />
                  ) : (
                    <p className="leading-relaxed font-semibold whitespace-pre-wrap">{m.content}</p>
                  )}
                  <span className="text-[9px] opacity-60 block mt-2 text-right tracking-tight font-medium">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 mr-auto items-center">
              <div className="p-2 bg-[#DCEEFF] text-[#0F4C81] rounded-xl animate-spin">
                <Sparkles size={16} />
              </div>
              <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs text-slate-400 font-medium">
                Evaluating database snapshot & coordinating response...
              </div>
            </div>
          )}
        </div>

        {/* Footer trigger/input */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about Divine surgical logs or reorders..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 placeholder:text-slate-400 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81] text-xs font-semibold"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2.5 bg-[#0F4C81] rounded-xl hover:bg-opacity-95 text-white transition disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
