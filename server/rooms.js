class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  addUser(roomId, user) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    this.rooms.get(roomId).set(user.id, user);
  }

  removeUser(roomId, userId) {
    if (!this.rooms.has(roomId)) return null;

    const room = this.rooms.get(roomId);
    const user = room.get(userId);
    room.delete(userId);

    if (room.size === 0) {
      this.rooms.delete(roomId);
    }

    return user;
  }

  getUsers(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values());
  }

  getRoomByUserId(userId) {
    for (const [roomId, users] of this.rooms.entries()) {
      if (users.has(userId)) {
        return roomId;
      }
    }
    return null;
  }

  updateUserCursor(roomId, userId, cursor) {
    if (!this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const user = room.get(userId);
    if (user) {
      user.cursor = cursor;
    }
  }
}

module.exports = { RoomManager };
