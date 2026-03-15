export type ChatMode = 'chat' | 'hybrid' | 'voice';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Session {
  token: string;
  agentId: string;
  expiresAt: number;
}

export interface PageContext {
  url: string;
  title: string;
  products: Product[];
  sections: Section[];
}

export interface Product {
  name: string;
  price?: string;
  elementRef: string;
  position?: string;
  imageUrl?: string;
  description?: string;
}

export interface Section {
  name: string;
  elementRef: string;
  type: string;
}

export interface AgentConfig {
  agentId: string;
  businessName: string;
  primaryColor: string;
  defaultMode: ChatMode;
  welcomeMessage: string;
  logoUrl?: string;
  allowedDomains?: string[];
}

export type SiteActionType =
  | 'scrollToElement'
  | 'highlightElement'
  | 'navigateTo'
  | 'showProductCard'
  | 'showComparison'
  | 'openContactForm';

export interface SiteAction {
  type: SiteActionType;
  ref?: string;
  url?: string;
  product?: ProductCardData;
  products?: ProductCardData[];
}

export interface ProductCardData {
  name: string;
  price?: string;
  imageUrl?: string;
  description?: string;
  buyUrl?: string;
}

export type SSEEventType = 'text_delta' | 'audio_delta' | 'actions' | 'done' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  audio?: string;
  actions?: SiteAction[];
  error?: string;
}

export interface VoiceToken {
  ephemeralKey: string;
  sessionConfig: Record<string, unknown>;
}
