import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup } from '../helpers/setup.js';

describe('Messenger', () => {
  let tempDir: string;
  let imece: ImeceManager;

  beforeEach(async () => {
    tempDir = await createTempImece();
    imece = new ImeceManager(tempDir);
    await imece.init();

    // Register agents for testing
    await imece.agents.register({ name: 'ali', role: 'dev' });
    await imece.agents.register({ name: 'zeynep', role: 'dev' });
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  describe('send', () => {
    it('should send message to agent', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Hello',
        body: 'How are you?',
        priority: 'normal'
      });

      expect(msg.from).toBe('ali');
      expect(msg.to).toBe('zeynep');
      expect(msg.subject).toBe('Hello');
      expect(msg.body).toBe('How are you?');
      expect(msg.read).toBe(false);
      expect(msg.id).toBeDefined();
    });

    it('should default to normal priority', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Test'
      });

      expect(msg.priority).toBe('normal');
    });

    it('should default to message type', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Test'
      });

      expect(msg.type).toBe('message');
    });

    it('should reject invalid agent names', async () => {
      await expect(
        imece.messages.send({ from: 'invalid!', to: 'zeynep', subject: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('getInbox', () => {
    it('should return unread messages', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test 1' });
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test 2' });

      const inbox = await imece.messages.getInbox('zeynep');
      expect(inbox).toHaveLength(2);
    });

    it('should not include read messages by default', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test' });
      const inbox = await imece.messages.getInbox('zeynep');
      await imece.messages.markAsRead('zeynep', inbox[0]!.id);

      const unread = await imece.messages.getInbox('zeynep', false);
      expect(unread).toHaveLength(0);
    });

    it('should include read messages when specified', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test' });
      const inbox = await imece.messages.getInbox('zeynep');
      await imece.messages.markAsRead('zeynep', inbox[0]!.id);

      const all = await imece.messages.getInbox('zeynep', true);
      expect(all).toHaveLength(1);
    });

    it('should return empty array for empty inbox', async () => {
      const inbox = await imece.messages.getInbox('zeynep');
      expect(inbox).toEqual([]);
    });
  });

  describe('unreadCount', () => {
    it('should count unread messages', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test 1' });
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Test 2' });

      const count = await imece.messages.unreadCount('zeynep');
      expect(count).toBe(2);
    });

    it('should return 0 for no messages', async () => {
      const count = await imece.messages.unreadCount('zeynep');
      expect(count).toBe(0);
    });
  });

  describe('getMessage', () => {
    it('should retrieve specific message', async () => {
      const sent = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Specific'
      });

      const retrieved = await imece.messages.getMessage('zeynep', sent.id);
      expect(retrieved?.subject).toBe('Specific');
    });

    it('should return null for non-existent message', async () => {
      const msg = await imece.messages.getMessage('zeynep', 'nonexistent');
      expect(msg).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const sent = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Test'
      });

      const updated = await imece.messages.markAsRead('zeynep', sent.id);
      expect(updated?.read).toBe(true);
    });

    it('should return null for non-existent message', async () => {
      const result = await imece.messages.markAsRead('zeynep', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all messages as read', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: '1' });
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: '2' });

      const count = await imece.messages.markAllAsRead('zeynep');
      expect(count).toBe(2);

      const unread = await imece.messages.unreadCount('zeynep');
      expect(unread).toBe(0);
    });
  });

  describe('reply', () => {
    it('should send reply to message', async () => {
      const original = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Question'
      });

      const reply = await imece.messages.reply('zeynep', original.id, 'Here is the answer');

      expect(reply?.from).toBe('zeynep');
      expect(reply?.to).toBe('ali');
      expect(reply?.subject).toBe('Re: Question');
      expect(reply?.body).toBe('Here is the answer');
      expect(reply?.replyTo).toBe(original.id);
    });

    it('should return null for non-existent message', async () => {
      const reply = await imece.messages.reply('zeynep', 'nonexistent', 'Test');
      expect(reply).toBeNull();
    });
  });

  describe('getThread', () => {
    it('should return conversation between two agents', async () => {
      // Ali sends to Zeynep
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Q1' });
      // Zeynep replies to Ali
      await imece.messages.send({ from: 'zeynep', to: 'ali', subject: 'A1' });
      // Ali sends to Zeynep again
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Q2' });

      const thread = await imece.messages.getThread('ali', 'zeynep');
      expect(thread).toHaveLength(3);
    });
  });
});
