class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.members = [];
    (this.gameIsHappaning = false), (this.currentPlayer = null);
    this.songTitle = "";
    this.sogCode = "";
    this.records = {
      chat: [],
      guesses: [],
      tips: [],
    };
    this.numberOfPlayersThatGotRigth = 0
  }
}

class RoomManager {
  constructor() {
    this.rooms = [];
  }

  createRoom(name) {
    const id = generateRoomId();
    const newRoom = new Room(id, name);
    this.rooms.push(newRoom);

    //this.addToRoom(newRoom.id, creator);

    function generateRoomId() {
      const prefix = "ROOM_";
      const randomSufix = Math.random().toString().replace("0.", "");

      return prefix + randomSufix;
    }

    return newRoom;
  }

  removeRoom(roomId) {
    const filteredRooms = this.rooms.filter((room) => {
      return room.id !== roomId;
    });

    this.rooms = filteredRooms;
  }

  addToRoom(roomId, user) {
    let room = this.getRoom(roomId);
    if (room) room.members.push(user);
  }

  removeFromRoom(roomId, userId) {
    const room = this.getRoom(roomId);

    const update = room.members.filter((member) => {
      return userId !== member.id;
    });

    room.members = update;
    //this.updateRoom(roomId, update);
  }

  getRoom(id) {
    const room = this.rooms.filter((room) => {
      return room.id === id;
    });

    return room[0];
  }

  getRoomIndex(roomId) {
    const roomsIds = this.rooms.map((room) => room.id);
    return roomsIds.indexOf(roomId);
  }

  updateRoom(roomId, updatedVersion) {
    if (!this.rooms.length) return;
    const roomsIds = this.rooms.map((room) => room.id);
    const roomIndex = roomsIds.indexOf(roomId);
    this.rooms[roomIndex] = updatedVersion;
  }

  getRoomMember(roomId, memberId) {
    const room = this.getRoom(roomId);
    const members = room.members;

    const member = members.filter((member) => member.id === memberId)[0];
    return member;
  }
}

class RoomHandler {
  constructor({ socket, io }, roomManager, gameManager) {
    this.roomManager = roomManager;
    this.gameManager = gameManager
    this.socket = socket;
    this.io = io;
  }

  handleCreateRoom(name) {
    const room = this.roomManager.createRoom(name);
    this.socket.emit("room_created", room);
  }

  handleRoomEnter({ roomId, user }) {

    const roomsId = this.roomManager.rooms.map((room) => room.id);
    this.roomManager.addToRoom(roomId, user);

    if (roomsId.includes(roomId)) {
      this.socket.join(roomId);
      this.io.of("/").to(roomId).emit("user_enter_room", user);
    }

    this.socket.on("disconnect", () => {
      handleDiconnect.call(this);
    });

    function handleDiconnect() {
      const room = this.roomManager.getRoom(roomId);
      const game = this.gameManager.getGame(roomId)
      this.roomManager.removeFromRoom(roomId, user.id);
      this.io.of("/").in(roomId).emit("user_leave_room", user);

      if (room?.members.length === 0) {
        this.roomManager.removeRoom(roomId);
        this.gameManager.removeGame(roomId)
      }
    }
  }

  handleUserIsInRoom(roomId) {
    const room = this.roomManager.getRoom(roomId);
    if (room?.members?.length >= 1 && !room?.gameIsHappaning) {
      this.roomManager.updateRoom(roomId, {
        ...room,
        gameIsHappaning: true,
      });

      this.socket.emit("game_can_start", room.id);
    }
  }

  handleGetAllRoomsRequest() {
    this.socket.emit("rooms_recived", this.roomManager.rooms);
  }

  handleGetRoomRequest(roomId) {
    this.socket.emit("room_recived", this.roomManager.getRoom(roomId));
  }
}

module.exports = { RoomManager, RoomHandler };
