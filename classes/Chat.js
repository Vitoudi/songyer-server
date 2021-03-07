class ChatHandler {
  constructor({ socket, io }, roomManager) {
    this.socket = socket;
    this.io = io;
    this.roomManager = roomManager
  }

  handleNewMsg({ msgText, currentUser: user, roomId }) {
    const msg = { msgText, user, roomId };
    const update = this._updateRoom(roomId, "chat", msg);

    this._emit(roomId, "room_changed", update);
      
  }

  handleNewGuess({guess, user, roomId}) {
    const guessData = { guess, user, roomId };
    const update = this._updateRoom(roomId, 'guesses', guessData)

    this._emit(roomId, "room_changed", update);
  }

  handleNewTip({roomId, text}) {
    const update = this._updateRoom(roomId, "tips", text);

    this._emit(roomId, "room_changed", update);
  }

  _emit(roomId, msg, data) {
    this.io.of("/").to(roomId).emit(msg, data);
  }

  _updateRoom(roomId, field, data) {
    const room = this.roomManager.getRoom(roomId);

    if (!room) return;
    const chatRecord = room.records[field] || [];
    room.records[field] = [...room.records[field], data];
    return room
  }
  
}

module.exports = { ChatHandler };
