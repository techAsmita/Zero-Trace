/**
 * RoomManager.js
 * Creates, stores, and looks up rooms.
 * Also maintains a reverse index: userId → Room for O(1) lookup.
 */

import { Room } from './Room.js';

const MAX_ROOMS = 200;

export class RoomManager {
  #rooms       = new Map(); // roomId → Room
  #userToRoom  = new Map(); // userId → Room  (reverse index)

  getOrCreateRoom(roomId, passcode) {
  if (this.#rooms.has(roomId)) {
    const room = this.#rooms.get(roomId);
    if (room.passcode !== passcode) {
      throw new Error('Incorrect passcode for this room.');
    }
    return room;
  }
    if (this.#rooms.size >= MAX_ROOMS) {
      throw new Error('Server has reached the maximum number of rooms.');
    }
    const room = new Room(roomId, passcode);
    this.#rooms.set(roomId, room);
    console.info(`[RoomManager] Created room: ${roomId}`);
    return room;
  }

  /** Add user to room and update reverse index */
  // (Called inside server/index.js after getOrCreateRoom)
  // We override addUser to also track reverse mapping
  addUserToRoom(roomId, userId, ws) {
    const room  = this.getOrCreateRoom(roomId);
    const users = room.addUser(userId, ws);
    this.#userToRoom.set(userId, room);
    return { room, users };
  }

  getRoomByUser(userId) {
    return this.#userToRoom.get(userId) || null;
  }

  removeUserGlobal(userId) {
    const room = this.#userToRoom.get(userId);
    if (room) {
      room.removeUser(userId);
      this.#userToRoom.delete(userId);
    }
  }

  /** Delete rooms that have become empty */
  cleanEmpty() {
    for (const [id, room] of this.#rooms) {
      if (room.isEmpty()) {
        this.#rooms.delete(id);
        console.info(`[RoomManager] Deleted empty room: ${id}`);
      }
    }
  }

  roomCount()   { return this.#rooms.size; }
  clientCount() { return this.#userToRoom.size; }
}