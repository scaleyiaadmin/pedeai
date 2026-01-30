import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare, Search, User, Bot, Clock,
  Phone, Mail, ChevronRight, Eye
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interface simplificada para mensagens da Uazapi
interface UazapiMessage {
  id: string;
  chatId: string;
  content: string;
  fromMe: boolean;
  senderName: string;
  timestamp: number;
  type: string;
}

interface UazapiChat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
}

const ConversationsView: React.FC = () => {
  console.log('[ConversationsView] Start Render');

  const context = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<UazapiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentMessages.length > 0) {
      scrollToBottom();
    }
  }, [currentMessages]);

  // Guard against missing context or hook data
  if (!context || !context.mensagens) {
    console.warn('[ConversationsView] mensagens object is missing in context');
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-secondary/20 rounded-3xl border border-border/50">
          <p className="text-muted-foreground animate-pulse font-medium">Conectando ao servidor de mensagens...</p>
        </div>
      </div>
    );
  }

  const { mensagens } = context;
  const { chats = [], loading = false, fetchMessages } = mensagens;

  console.log('[ConversationsView] Data State:', {
    chatsLength: chats?.length,
    loading,
    hasFetchMessages: typeof fetchMessages === 'function'
  });

  const selectedChat = useMemo(() => {
    if (!selectedChatId || !Array.isArray(chats)) return null;
    return chats.find((c: UazapiChat) => c.id === selectedChatId) || null;
  }, [chats, selectedChatId]);

  const filteredConversations = useMemo(() => {
    const safeChats = Array.isArray(chats) ? chats : [];
    return safeChats.filter((conv: UazapiChat) =>
      (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.id || '').includes(searchQuery)
    );
  }, [chats, searchQuery]);

  const handleChatSelect = async (chatId: string) => {
    console.log('[ConversationsView] Chat selected:', chatId);
    if (!chatId) return;
    setSelectedChatId(chatId);
    setLoadingMessages(true);

    if (typeof fetchMessages !== 'function') {
      console.error('[ConversationsView] fetchMessages is not a function!');
      setLoadingMessages(false);
      return;
    }

    try {
      const msgs = await fetchMessages(chatId);
      console.log(`[ConversationsView] Received ${msgs?.length || 0} messages for ${chatId}`);
      setCurrentMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      console.error('[ConversationsView] Error fetching messages:', error);
      setCurrentMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex-1 overflow-hidden bg-background">
      <div className="w-full h-full flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-6 border-b border-border bg-secondary/5">
            <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Conversas
            </h2>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-border shadow-inner text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {loading && chats.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Carregando lista de contatos...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                filteredConversations.map((conv: UazapiChat) => (
                  <button
                    key={conv.id || Math.random().toString()}
                    onClick={() => handleChatSelect(conv.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group ${selectedChatId === conv.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'hover:bg-secondary hover:translate-x-1'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${selectedChatId === conv.id ? 'bg-white/20' : 'bg-secondary-foreground/5 group-hover:bg-primary/10'
                        }`}>
                        <User className={`w-6 h-6 ${selectedChatId === conv.id ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold truncate ${selectedChatId === conv.id ? 'text-white' : 'text-foreground'}`}>
                            {conv.name || 'Contato'}
                          </span>
                          {conv.unreadCount > 0 && (
                            <Badge className={`px-1.5 py-0 min-w-[20px] justify-center text-[10px] ${selectedChatId === conv.id ? 'bg-white text-primary' : 'bg-primary'}`}>
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs truncate font-medium ${selectedChatId === conv.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {conv.lastMessage || 'Sem mensagens'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className={`w-3 h-3 ${selectedChatId === conv.id ? 'text-white/60' : 'text-muted-foreground/50'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedChatId === conv.id ? 'text-white/60' : 'text-muted-foreground/50'}`}>
                            {conv.timestamp ? formatTime(conv.timestamp) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation Detail */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedChat ? (
            <>
              {/* Header */}
              <div className="px-8 py-5 border-b border-border bg-card/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground leading-tight">{selectedChat.name || 'Contato'}</h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-tighter">
                        <Phone className="w-3 h-3 text-primary/50" />
                        {selectedChat.id ? selectedChat.id.split('@')[0] : 'Desconhecido'}
                      </p>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-2 h-8 px-4 rounded-full border-border bg-secondary/50 text-xs font-bold text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  Visualização do Admin
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-8 bg-[#fdfdfd]">
                <div className="space-y-6 max-w-2xl mx-auto">
                  {loadingMessages ? (
                    <div className="text-center py-20 text-muted-foreground font-medium italic">
                      Carregando mensagens...
                    </div>
                  ) : currentMessages.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground font-medium italic">
                      Nenhuma mensagem encontrada nesta conversa.
                    </div>
                  ) : (
                    currentMessages.map((message: UazapiMessage) => (
                      <div
                        key={message.id || Math.random().toString()}
                        className={`flex items-end gap-3 ${!message.fromMe ? 'justify-start' : 'justify-end'
                          }`}
                      >
                        {!message.fromMe && (
                          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 border border-border/50 shadow-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm border ${!message.fromMe
                            ? 'bg-white text-foreground border-border/50 rounded-bl-none'
                            : 'bg-primary text-primary-foreground border-primary/10 rounded-br-none'
                            }`}
                        >
                          <p className="whitespace-pre-line text-sm font-medium leading-relaxed">{message.content || ''}</p>
                          <div className={`text-[10px] mt-2 font-black uppercase tracking-tighter flex items-center justify-end gap-1 ${!message.fromMe ? 'text-muted-foreground/50' : 'text-primary-foreground/60'
                            }`}>
                            <Clock className="w-3 h-3" />
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                        </div>
                        {message.fromMe && (
                          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Read-only notice */}
              <div className="px-8 py-5 border-t border-border bg-secondary/10">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <div className="h-px flex-1 bg-border/50" />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border/50 shadow-sm text-[10px] font-black uppercase tracking-widest">
                    <Eye className="w-4 h-4 text-primary" />
                    Chat em tempo real com Uazapi
                  </div>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-12 bg-[#F8F9FA]">
              <div className="animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-6 shadow-sm border border-border/50">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Suas Conversas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto font-medium text-sm leading-relaxed">
                  Selecione um cliente à esquerda para acompanhar o atendimento da Uazapi em tempo real.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsView;
