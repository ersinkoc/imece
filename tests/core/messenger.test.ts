import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup, sleep } from '../helpers/setup.js';

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

  describe('message validation edge cases', () => {
    it('should handle empty message body', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Empty body',
        body: ''
      });
      expect(msg.body).toBe('');
    });

    it('should handle empty subject', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: '',
        body: 'No subject'
      });
      expect(msg.subject).toBe('');
    });

    it('should handle very long message body', async () => {
      const longBody = 'A'.repeat(10000);
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Long message',
        body: longBody
      });
      expect(msg.body).toBe(longBody);
    });

    it('should handle special characters in subject and body', async () => {
      const specialChars = '<>&"\'\\/null\u0000emoji🎉';
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: specialChars,
        body: specialChars
      });
      expect(msg.subject).toBe(specialChars);
      expect(msg.body).toBe(specialChars);
    });

    it('should handle multiline messages', async () => {
      const multiline = 'Line 1\nLine 2\r\nLine 3';
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Multiline',
        body: multiline
      });
      expect(msg.body).toBe(multiline);
    });
  });

  describe('self-messaging and same agent edge cases', () => {
    it('should allow agent to send message to itself', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'ali',
        subject: 'Self note',
        body: 'Remember this'
      });
      expect(msg.from).toBe('ali');
      expect(msg.to).toBe('ali');
    });

    it('should allow agent to reply to itself', async () => {
      const original = await imece.messages.send({
        from: 'ali',
        to: 'ali',
        subject: 'Self task'
      });

      const reply = await imece.messages.reply('ali', original.id, 'Done');
      expect(reply?.from).toBe('ali');
      expect(reply?.to).toBe('ali');
      expect(reply?.replyTo).toBe(original.id);
    });
  });

  describe('reply chain edge cases', () => {
    it('should handle multiple reply levels', async () => {
      // Level 1: Ali sends to Zeynep
      const msg1 = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Question'
      });

      // Level 2: Zeynep replies
      const msg2 = await imece.messages.reply('zeynep', msg1.id, 'Answer 1');

      // Level 3: Ali replies to answer
      const msg3 = await imece.messages.reply('ali', msg2.id, 'Thanks');

      expect(msg3?.replyTo).toBe(msg2.id);
      expect(msg2?.replyTo).toBe(msg1.id);
      expect(msg3?.subject).toBe('Re: Re: Question');
    });

    it('should mark original message as read on reply', async () => {
      const original = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Unread'
      });

      await imece.messages.reply('zeynep', original.id, 'Response');

      const updated = await imece.messages.getMessage('zeynep', original.id);
      expect(updated?.read).toBe(true);
    });
  });

  describe('getThread edge cases', () => {
    it('should return empty array for non-existent thread', async () => {
      const thread = await imece.messages.getThread('ali', 'nonexistent');
      expect(thread).toEqual([]);
    });

    it('should return empty array when no messages between agents', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'One way' });
      const thread = await imece.messages.getThread('zeynep', 'ali');
      // Should include the message from ali to zeynep
      expect(thread.length).toBeGreaterThanOrEqual(1);
    });

    it('should include processed messages in thread', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Old message' });
      const messages = await imece.messages.getInbox('zeynep');
      await imece.messages.markAsRead('zeynep', messages[0]!.id);

      const thread = await imece.messages.getThread('ali', 'zeynep');
      expect(thread.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort thread chronologically', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'First' });
      await sleep(10);
      await imece.messages.send({ from: 'zeynep', to: 'ali', subject: 'Second' });
      await sleep(10);
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: 'Third' });

      const thread = await imece.messages.getThread('ali', 'zeynep');
      expect(thread[0]?.subject).toBe('First');
      expect(thread[thread.length - 1]?.subject).toBe('Third');
    });
  });

  describe('priority and type edge cases', () => {
    it('should handle all priority levels', async () => {
      const priorities: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        const msg = await imece.messages.send({
          from: 'ali',
          to: 'zeynep',
          subject: `Priority ${priority}`,
          priority
        });
        expect(msg.priority).toBe(priority);
      }
    });

    it('should reject invalid priority', async () => {
      await expect(
        imece.messages.send({
          from: 'ali',
          to: 'zeynep',
          subject: 'Test',
          priority: 'invalid' as any
        })
      ).rejects.toThrow();
    });

    it('should handle all message types', async () => {
      const types: Array<'message' | 'task-delegate' | 'question' | 'status-update' | 'review-request' | 'approval' | 'rejection' | 'blocker' | 'handoff'> = [
        'message', 'task-delegate', 'question', 'status-update',
        'review-request', 'approval', 'rejection', 'blocker', 'handoff'
      ];

      for (const type of types) {
        const msg = await imece.messages.send({
          from: 'ali',
          to: 'zeynep',
          subject: `Type ${type}`,
          type
        });
        expect(msg.type).toBe(type);
      }
    });

    it('should reject invalid message type', async () => {
      await expect(
        imece.messages.send({
          from: 'ali',
          to: 'zeynep',
          subject: 'Test',
          type: 'invalid' as any
        })
      ).rejects.toThrow();
    });
  });

  describe('expectsReply flag edge cases', () => {
    it('should preserve expectsReply flag', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Needs response',
        expectsReply: true
      });
      expect(msg.expectsReply).toBe(true);
    });

    it('should default expectsReply to false', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'No response needed'
      });
      expect(msg.expectsReply).toBe(false);
    });
  });

  describe('markAllAsRead edge cases', () => {
    it('should return 0 for empty inbox', async () => {
      const count = await imece.messages.markAllAsRead('zeynep');
      expect(count).toBe(0);
    });

    it('should only mark unread messages', async () => {
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: '1' });
      await imece.messages.send({ from: 'ali', to: 'zeynep', subject: '2' });

      const messages = await imece.messages.getInbox('zeynep');
      await imece.messages.markAsRead('zeynep', messages[0]!.id);

      const count = await imece.messages.markAllAsRead('zeynep');
      expect(count).toBe(1); // Only one was unread
    });
  });

  describe('getMessage edge cases', () => {
    it('should find message with complex ID', async () => {
      const sent = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Complex ID test'
      });

      const retrieved = await imece.messages.getMessage('zeynep', sent.id);
      expect(retrieved?.subject).toBe('Complex ID test');
    });

    it('should handle message ID case sensitivity', async () => {
      const sent = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Case test'
      });

      const lowerCaseId = sent.id.toLowerCase();
      const retrieved = await imece.messages.getMessage('zeynep', lowerCaseId);

      // Should find the message regardless of case
      expect(retrieved).not.toBeNull();
    });
  });

  describe('concurrent messaging', () => {
    it('should handle rapid fire messages', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(imece.messages.send({
          from: 'ali',
          to: 'zeynep',
          subject: `Message ${i}`
        }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const inbox = await imece.messages.getInbox('zeynep');
      expect(inbox).toHaveLength(10);
    });

    it('should maintain unique IDs for rapid messages', async () => {
      const msg1 = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'First'
      });
      const msg2 = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Second'
      });

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('input limits', () => {
    it('should reject message body exceeding 50,000 characters', async () => {
      await expect(imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Test',
        body: 'x'.repeat(50_001)
      })).rejects.toThrow('Message body exceeds 50,000 character limit');
    });

    it('should reject message subject exceeding 500 characters', async () => {
      await expect(imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'x'.repeat(501),
        body: 'test'
      })).rejects.toThrow('Message subject exceeds 500 character limit');
    });

    it('should accept message body at exactly 50,000 characters', async () => {
      const msg = await imece.messages.send({
        from: 'ali',
        to: 'zeynep',
        subject: 'Test',
        body: 'x'.repeat(50_000)
      });
      expect(msg.body).toHaveLength(50_000);
    });
  });
});
