const { response } = require("express");

class Game {
  constructor(room) {
    this.hasStarted= false
    this.room = room
    this.timeOut = null;
    this.currentQueueIndex = 0;
    this.timer = 1 * 60
  }

  startGame() {
    this.startGameTime();
  }

  startGameTime(callback) {
      this.hasStarted = true
      //console.log(this.room)

    this.timeOut = setTimeout(() => {
      this.currentQueueIndex++;

      if (this.currentQueueIndex > this.room.members.length - 1) {
        this.currentQueueIndex = 0;
      }

    callback();

    }, 1 * 1000 * 60);
  }

  clearGameTime() {
    clearTimeout(this.timeOut);
  }

  get currentPlayer() {
    return this.room?.members[this.currentQueueIndex];
  }
}

class GameHandler {
  constructor({ socket, io }, roomManger) {
    this.socket = socket;
    this.io = io;
    this.roomManager = roomManger;
    this.game = null;
  }

  handleStartGame({ roomId, user }) {
    console.log('handleStartGameWasCalled')
    const roomIndex = this.roomManager.getRoomIndex(roomId)
    //console.log('room_id: ' + roomId)
    this.game = new Game(this.roomManager.rooms[roomIndex]);
    //console.log('room: ' + this.game.room)

    this._handleNewCurrentPlayer(roomId);
   
    this._startRound(roomId)

    const currentPlayer = this.game.currentPlayer;

    if (currentPlayer.id === user.id) {
      this.socket.emit("user_is_the_current_player");
    }
  }

  handleNewSongCode({roomId, songCode, songTitle}) {
    const room = this.roomManager.getRoom(roomId)
    const update = {...room, songTitle, songCode}
    this.roomManager.updateRoom(roomId, update)

    this.io
      .of("/")
      .to(roomId)
      .emit("song_code_arrived", songCode);
    
      this.io.of("/").to(roomId).emit("room_changed", update);
  }

  handleNewGuess({roomId, guess, user}) {
    guess = guess.toLowerCase().trim();
    const room = this.roomManager.getRoom(roomId)

    if(!room.songTitle) return
    const songTitle = room?.songTitle
      .split("by")[0]
      .toLowerCase()
      .replace(/\([^()]*\)/, "")
      .trim()

    const responseObj = {
        status: null,
        guess,
        user
    }

    if(guess == songTitle) {
        responseObj.status = 'rigth'
        this._handleRigthGuess({room, userId: user.id})
    } else if(songTitle.includes(guess)) {
        responseObj.status = 'close'
    } else {
        responseObj.status = 'no'
    }

    this.io.of("/").to(roomId).emit("new_guess_arrived", responseObj);

    return responseObj
  }

  _handleRigthGuess({room, userId}) {
    const currentPlayerId = room?.currentPlayer?.id
    const guessOwner = this.roomManager.getRoomMember(room.id, userId)
    const currentPlayer = this.roomManager.getRoomMember(room.id, currentPlayerId)

    currentPlayer.points += 2
    guessOwner.points++
  }

  _startRound(roomId) {
      console.log('- - start round called - -')
      //console.log(this.game.currentPlayer)
      let timer = 1 * 60

      const timerInterval = setInterval(() => {
        timer--;

        this.io
          .of("/")
          .to(roomId)
          .emit("timer_update", timer);
      }, 1000);
      
    this.game.startGameTime(() => {
      clearInterval(timerInterval);
      this._handleNewCurrentPlayer(roomId);
      this._startRound(roomId);
    });
  }

  _handleUpdateRoomInfo(roomId) {
      const room = this.roomManager.getRoom(roomId)
      room.currentPlayer = this.game.currentPlayer
      room.records.guesses = []
      room.records.tips = [];
      room.songCode = ''

      this.io
        .of("/")
        .to(roomId)
        .emit("room_changed", room)

  }


  _handleNewCurrentPlayer(roomId) {
      this._handleUpdateRoomInfo(roomId)
    this.io
      .of("/")
      .to(roomId)
      .emit("new_current_player", this.game.currentPlayer);
  }
}

module.exports = { Game, GameHandler };
