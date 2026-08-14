import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { and, eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(
    id: number,
    userId: string,
  ): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(
    userId: string,
  ): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(
    userId: string,
    title: string,
  ): Promise<typeof conversations.$inferSelect>;
  updateConversationTitle(
    id: number,
    userId: string,
    title: string,
  ): Promise<boolean>;
  deleteConversation(id: number, userId: string): Promise<boolean>;
  getMessagesByConversation(
    conversationId: number,
    userId: string,
  ): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(
    conversationId: number,
    userId: string,
    role: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<typeof messages.$inferSelect | undefined>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number, userId: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  },

  async getAllConversations(userId: string) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  },

  async createConversation(userId: string, title: string) {
    const [conversation] = await db
      .insert(conversations)
      .values({ userId, title })
      .returning();
    return conversation;
  },

  async updateConversationTitle(id: number, userId: string, title: string) {
    const updated = await db
      .update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning({ id: conversations.id });
    return updated.length > 0;
  },

  async deleteConversation(id: number, userId: string) {
    const conversation = await this.getConversation(id, userId);
    if (!conversation) return false;

    await db.delete(messages).where(eq(messages.conversationId, id));
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return true;
  },

  async getMessagesByConversation(conversationId: number, userId: string) {
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) return [];

    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  async createMessage(
    conversationId: number,
    userId: string,
    role: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ) {
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) return undefined;

    const [message] = await db
      .insert(messages)
      .values({ conversationId, role, content, metadata })
      .returning();
    return message;
  },
};
