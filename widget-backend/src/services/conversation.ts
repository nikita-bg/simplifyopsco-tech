import { supabase } from './db.js';

export interface ConversationStartResult {
  conversationId: string;
}

/**
 * Check if a business can start a new conversation (within plan limit).
 */
export async function canStartConversation(businessId: string): Promise<boolean> {
  const { data } = await supabase
    .from('businesses')
    .select('conversation_count, conversation_limit')
    .eq('id', businessId)
    .single();

  if (!data) return false;
  return data.conversation_count < data.conversation_limit;
}

/**
 * Create a new conversation row and increment the business counter.
 * Returns the new conversation ID.
 */
export async function startConversation(
  businessId: string,
  sessionToken: string,
): Promise<ConversationStartResult | null> {
  const { data: conv } = await supabase
    .from('conversations')
    .insert({
      business_id: businessId,
      session_id: sessionToken,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (!conv) return null;

  // Increment conversation count
  await supabase.rpc('increment_business_conversation_count', {
    business_uuid: businessId,
  });

  return { conversationId: conv.id };
}

/**
 * Mark a conversation as completed.
 */
export async function endConversation(
  conversationId: string,
  durationSeconds?: number,
): Promise<void> {
  await supabase
    .from('conversations')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      ...(durationSeconds !== undefined ? { duration: durationSeconds } : {}),
    })
    .eq('id', conversationId);
}
