/**
 * Room.js
 * A single collaborative room — holds user WebSocket references
 * and handles broadcasting.
 */

const MAX_USERS_PER_ROOM = 10;

export class Room {
  #id;
  #users = new Map(); // userId → WebSocket

  constructor(id, passcode) {
  this.#id = id;
  this.passcode = passcode;
}

  get id() { return this.#id; }

  /** Add a user and return updated user list */
  addUser(userId, ws) {
    if (this.#users.size >= MAX_USERS_PER_ROOM) {
      throw new Error(`Room "${this.#id}" is full (max ${MAX_USERS_PER_ROOM} users).`);
    }
    this.#users.set(userId, ws);
    return this.getUserList();
  }

  removeUser(userId) {
    this.#users.delete(userId);
  }

  /** Send a message to everyone EXCEPT the sender */
  broadcast(senderId, type, data) {
    const payload = JSON.stringify({ type, data });
    for (const [uid, ws] of this.#users) {
      if (uid === senderId) continue;
      try {
        if (ws.readyState === ws.OPEN) ws.send(payload);
      } catch (err) {
        console.warn(`[Room:${this.#id}] Failed to send to ${uid.slice(0,8)}:`, err.message);
      }
    }
  }

  getUserList() {
    return [...this.#users.keys()];
  }

  isEmpty() {
    return this.#users.size === 0;
  }

  userCount() {
    return this.#users.size;
  }
}