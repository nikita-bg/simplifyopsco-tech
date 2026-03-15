export interface SessionData {
  agentId: string;
  businessId: string;
  visitorIp: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  conversationId: string | null;
}

export interface AgentConfig {
  agentId: string;
  businessName: string;
  defaultMode: 'chat' | 'hybrid' | 'voice';
  welcomeMessage: string;
  branding: {
    color: string;
    logo: string | null;
    position: string;
  };
  allowedDomains: string[];
}

export interface PageContext {
  url: string;
  title: string;
  products: ProductInfo[];
  sections: SectionInfo[];
}

export interface ProductInfo {
  name: string;
  price: string | null;
  imageUrl: string | null;
  elementRef: string;
  position: 'above-fold' | 'below-fold';
}

export interface SectionInfo {
  name: string;
  elementRef: string;
  type: 'header' | 'section' | 'article' | 'nav' | 'footer';
}

export interface SiteControlAction {
  type: 'scrollToElement' | 'highlightElement' | 'navigateTo' | 'showProductCard' | 'openContactForm' | 'showComparison';
  ref?: string;
  url?: string;
  data?: Record<string, unknown>;
}
