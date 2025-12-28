import { apiClient } from './client';

export interface Conversation {
    conversationId: string;
    relatedRequestId: string;
    actorType: 'customer' | 'broker' | 'ai';
    actorId: string;
    message: string;
    createdAt: string;
}

export interface ConversationThread {
    customerId: string;
    customerName: string;
    customerPhone: string;
    requestId: string;
    areaName: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isAI: boolean;
}

// ========== Broker Chatbot Types ==========

export interface ClientAnalysis {
    personality_type?: string;
    communication_style?: string;
    decision_speed?: string;
    budget_realism?: string;
    seriousness_level?: string;
    risk_level?: string;
    risk_indicators: string[];
    summary?: string;
}

export interface Strategy {
    communication_tone?: string;
    opening_message?: string;
    key_points: string[];
    warnings: string[];
    negotiation_tips: string[];
    summary?: string;
}

export interface BrokerChatResponse {
    success: boolean;
    response: string;
    client_analysis?: ClientAnalysis;
    strategy?: Strategy;
    request_data?: {
        request_id: number;
        customer_name?: string;
        area_name?: string;
        unit_type?: string;
        budget_min?: number;
        budget_max?: number;
        status?: string;
    };
    error?: string;
    timestamp: string;
}

// Fetch conversations for a specific request
export async function getRequestConversations(requestId: string): Promise<Conversation[]> {
    try {
        const response = await apiClient.get<Conversation[]>(`/requests/${requestId}/conversations`);
        return response.data;
    } catch (error) {
        console.warn('Conversations endpoint not available');
        return [];
    }
}

// Build conversation threads from broker's requests with active conversations
export async function getBrokerConversationThreads(brokerId: string): Promise<ConversationThread[]> {
    try {
        // Fetch only requests that have broker conversations
        const response = await apiClient.get<any[]>('/chatbot/broker/requests-with-conversations');

        const requests = response.data;

        // Convert requests to conversation threads (one per customer)
        const customerMap = new Map<string, ConversationThread>();

        requests.forEach((request: any) => {
            if (request.customer) {
                const customerId = request.customer.customerId;
                const existing = customerMap.get(customerId);

                if (!existing || new Date(request.updatedAt) > new Date(existing.lastMessageTime)) {
                    customerMap.set(customerId, {
                        customerId,
                        customerName: request.customer.name,
                        customerPhone: request.customer.phone,
                        requestId: request.requestId,
                        areaName: request.area?.name || 'General',
                        lastMessage: `Request #${request.requestId} - ${request.status}`,
                        lastMessageTime: request.updatedAt,
                        unreadCount: request.status === 'new' ? 1 : 0,
                        isAI: true, // These are AI-assisted conversations
                    });
                }
            }
        });

        // Sort by last message time (most recent first)
        return Array.from(customerMap.values()).sort(
            (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
    } catch (error) {
        console.warn('Failed to fetch conversation threads');
        return [];
    }
}

// ========== Broker Chatbot API Functions ==========

// Chat with AI (via backend proxy)
export async function chatWithAI(
    requestId: string,
    message: string
): Promise<BrokerChatResponse> {
    const response = await apiClient.post<BrokerChatResponse>(
        '/chatbot/broker/chat',
        {
            request_id: requestId,
            message: message,
        }
    );
    return response.data;
}

// Get AI analysis summary
export async function getAIAnalysis(
    requestId: string
): Promise<BrokerChatResponse> {
    const response = await apiClient.get<BrokerChatResponse>(
        `/chatbot/broker/requests/${requestId}/analysis`
    );
    return response.data;
}

// Get conversations with context filter
export async function getRequestConversationsWithContext(
    requestId: string,
    contextType?: 'customer' | 'broker'
): Promise<Conversation[]> {
    try {
        const params = contextType ? { context_type: contextType } : {};
        const response = await apiClient.get<Conversation[]>(
            `/chatbot/broker/requests/${requestId}/conversations`,
            { params }
        );
        return response.data;
    } catch (error) {
        console.warn('Failed to fetch conversations');
        return [];
    }
}
