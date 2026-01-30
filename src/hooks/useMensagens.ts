import { useState, useEffect, useCallback, useMemo } from 'react';

const UAZAPI_URL = import.meta.env.VITE_UAZAPI_URL;
const UAZAPI_TOKEN = import.meta.env.VITE_UAZAPI_TOKEN;

export interface UazapiMessage {
    id: string;
    chatId: string;
    content: string;
    fromMe: boolean;
    senderName: string;
    timestamp: number;
    type: string;
}

export interface UazapiChat {
    id: string; // ID interno (hex) ou JID
    phone: string; // Telefone normalizado para agrupamento/filtro
    name: string;
    lastMessage?: string;
    timestamp?: number;
    unreadCount: number;
}

const extractContent = (content: any): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
        if (content.text && typeof content.text === 'string') return content.text;
        if (content.body && typeof content.body === 'string') return content.body;
        if (content.caption && typeof content.caption === 'string') return content.caption;
        if (content.title && typeof content.title === 'string') return content.title;
        if (content.mimetype) {
            const type = content.mimetype.split('/')[0];
            return `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'audio' ? 'Áudio' : 'Arquivo'}]`;
        }
        return '[Mensagem]';
    }
    return String(content);
};

const getCanonicalPhone = (phone: string): string => {
    if (!phone) return '';
    const clean = phone.split('@')[0].replace(/\D/g, '');
    return clean.length >= 8 ? clean.slice(-8) : clean;
};

export const useMensagens = (allowedContacts: { phone: string, name: string }[] = []) => {
    const [chats, setChats] = useState<UazapiChat[]>([]);
    const [loading, setLoading] = useState(false);
    const hookId = useMemo(() => Math.random().toString(36).substr(2, 5), []);

    const fetchChats = useCallback(async () => {
        if (!UAZAPI_URL || !UAZAPI_TOKEN) return;

        setLoading(true);
        try {
            const response = await fetch(`${UAZAPI_URL}/chat/find`, {
                method: 'POST',
                headers: {
                    'token': UAZAPI_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const chatsList = Array.isArray(data.chats) ? data.chats : (Array.isArray(data) ? data : []);

            // UNIFICADOR: Usamos o JID real do WhatsApp (wa_chatid) como chave
            // Isso impede que múltiplos leads (Athos 1, Athos 2) criem itens separados
            const chatUnificator = new Map<string, UazapiChat>();

            chatsList.forEach((chat: any) => {
                // wa_chatid é o JID real (ex: 5511... @s.whatsapp.net)
                const realJid = chat.wa_chatid || chat.id;
                if (!realJid) return;

                const canonical = getCanonicalPhone(realJid);

                // Tenta encontrar nos contatos autorizados do restaurante
                const dbContact = allowedContacts.find(c => getCanonicalPhone(c.phone) === canonical);

                // FILTRO DE RESTAURANTE
                if (allowedContacts.length > 0 && !dbContact) return;

                const chatName = dbContact?.name || chat.wa_name || chat.name || chat.Lead_fullName || 'Contato';

                const mappedChat: UazapiChat = {
                    id: chat.id, // Guardamos o ID original para a API
                    phone: canonical,
                    name: chatName,
                    lastMessage: extractContent(chat.wa_lastMessageTextVote || chat.wa_lastMessageSender || chat.last_message),
                    timestamp: chat.wa_lastMsgTimestamp ? chat.wa_lastMsgTimestamp * 1000 :
                        (chat.last_message?.timestamp ? chat.last_message.timestamp * 1000 : Date.now()),
                    unreadCount: chat.wa_unreadCount || chat.unread_count || 0
                };

                // Se já temos esse WhatsApp (JID) na lista, ficamos com o registro mais recente
                const existing = chatUnificator.get(realJid);
                if (!existing || (mappedChat.timestamp || 0) > (existing.timestamp || 0)) {
                    chatUnificator.set(realJid, mappedChat);
                }
            });

            const finalChats = Array.from(chatUnificator.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            console.log(`[useMensagens][${hookId}] JID Unification: ${finalChats.length} actual conversations.`);
            setChats(finalChats);
        } catch (err) {
            console.error(`[useMensagens] Error:`, err);
        } finally {
            setLoading(false);
        }
    }, [hookId, allowedContacts]);

    const fetchMessages = useCallback(async (chatId: string) => {
        try {
            const response = await fetch(`${UAZAPI_URL}/message/find`, {
                method: 'POST',
                headers: {
                    'token': UAZAPI_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    where: { chatId: chatId, remoteJid: chatId }
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const rawMessages = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);

            // Filtro de mensagens continua usando o chatId (ID de lead) ou o JID
            const lowerTarget = chatId.toLowerCase();
            const filteredMessages = rawMessages.filter((msg: any) => {
                const mId = String(msg.chatId || msg.remoteJid || msg.key?.remoteJid || '').toLowerCase();
                return mId.includes(lowerTarget) || lowerTarget.includes(mId);
            });

            return filteredMessages.map((msg: any) => ({
                id: msg.id || Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                content: extractContent(msg.content || msg.body),
                fromMe: !!msg.fromMe,
                senderName: msg.senderName || '',
                timestamp: msg.timestamp ? (msg.timestamp < 10000000000 ? msg.timestamp * 1000 : msg.timestamp) : Date.now(),
                type: msg.type || 'text'
            }));
        } catch (err) {
            console.error(`[useMensagens] Error messages:`, err);
            return [];
        }
    }, []);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    return useMemo(() => ({
        chats,
        loading,
        fetchMessages,
        refetch: fetchChats
    }), [chats, loading, fetchMessages, fetchChats]);
};
