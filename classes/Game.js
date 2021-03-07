const { response } = require("express");

class Game {
  constructor(room) {
    this.id = room.id;
    this.hasStarted = false;
    this.room = room;
    this.timeOut = null;
    this.currentQueueIndex = 0;
    this.timer = 2 * 60;
    this.timerInterval = null;
  }

  startGame() {
    this.startGameTime();
  }

  startGameTime(callback) {
    this.hasStarted = true;

    this.timeOut = setTimeout(() => {
      this._dispatchNewRoundActions()

      callback();
    }, 2 * 1000 * 60);
  }

  clearGameTime(callback) {
    clearTimeout(this.timeOut);
    this._dispatchNewRoundActions();

    callback();
  }

  _dispatchNewRoundActions() {
    this.currentQueueIndex++;

    if (this.currentQueueIndex > this.room.members.length - 1) {
      this.currentQueueIndex = 0;
    }
  }

  get currentPlayer() {
    return this.room?.members[this.currentQueueIndex];
  }
}

class GameManager {
  constructor() {
    this.games = [];
  }

  removeGame(id) {
    const filteredGames = this.games.filter((game) => {
      return game.id !== id;
    });

    this.games = filteredGames;
  }

  getGame(id) {
    const game = this.games.filter((game) => {
      return game.id === id;
    });

    return game[0];
  }
}

class GameHandler {
  constructor({ socket, io }, roomManger, gameManager) {
    this.socket = socket;
    this.io = io;
    this.roomManager = roomManger;
    this.game = null;
    this.gameManager = gameManager;
  }

  handleStartGame({ roomId, user }) {
    const roomIndex = this.roomManager.getRoomIndex(roomId);
    this.game = new Game(this.roomManager.rooms[roomIndex]);
    this.gameManager.games.push(this.game);

    this._handleNewCurrentPlayer(roomId);

    this._startRound(roomId);
  }

  handleNewSongCode({ roomId, songCode, songTitle }) {
    this._handleUpdateRoomInfo(roomId);
    const room = this.roomManager.getRoom(roomId);
    const update = { ...room, songTitle, songCode };
    this.roomManager.updateRoom(roomId, update);

    this.io.of("/").to(roomId).emit("song_code_arrived", songCode);
    this.io.of("/").to(roomId).emit("room_changed", update);
  }

  handleNewGuess({ roomId, guess, user }) {
    guess = guess.toLowerCase().trim();
    const room = this.roomManager.getRoom(roomId);

    if (!room.songTitle) return;
    const songTitle = room?.songTitle
      .split("by")[0]
      .toLowerCase()
      .replace(/\([^()]*\)/, "")
      .trim();

    const responseObj = {
      status: null,
      guess,
      user,
    };

    if (guess == songTitle) {
      responseObj.status = "rigth";
      this._handleRigthGuess({ room, userId: user.id });
    } else if (songTitle.includes(guess)) {
      responseObj.status = "close";
    } else {
      responseObj.status = "no";
    }

    this.io.of("/").to(roomId).emit("new_guess_arrived", responseObj);

    return responseObj;
  }

  _handleRigthGuess({ room, userId }) {
    room.numberOfPlayersThatGotRigth++;
    const currentPlayerId = room?.currentPlayer?.id;
    const guessOwner = this.roomManager.getRoomMember(room.id, userId);
    const currentPlayer = this.roomManager.getRoomMember(
      room.id,
      currentPlayerId
    );

    if (!currentPlayer) return;
    currentPlayer.points += 2;
    guessOwner.points++;

    this._checkIfAllPlayersGotRigth(room);
  }

  _startRound(roomId) {
    console.log("- - start round called - -");
    const room = this.roomManager.getRoom(roomId);
    const game = this.gameManager.getGame(roomId);
    if (!room || room?.members === 0 || !game) return;
    game.room = room;
    clearInterval(game.timerInterval);
    game.timerInterval = null;
    game.timer = 2 * 60;

    game.timerInterval = setInterval(() => {
      game.timer--;

      this.io.of("/").to(roomId).emit("timer_update", game.timer);
    }, 1000);

    game.startGameTime(() => {
      this._dispatchNewRoundActions(roomId, game);
    });
  }

  _dispatchNewRoundActions(roomId, game) {
    this._handleNewCurrentPlayer(roomId);
    this._startRound(roomId);
  }

  _handleUpdateRoomInfo(roomId) {
    const room = this.roomManager.getRoom(roomId);
    const game = this.gameManager.getGame(roomId);
    if (!room || !game) return;
    this._resetRoomInfo(room, game);
  }

  _resetRoomInfo(room, game) {
    room.currentPlayer = game.currentPlayer;
    room.records.guesses = [];
    room.records.tips = [];
    room.songCode = "";
    room.numberOfPlayersThatGotRigth = 0;

    this.io.of("/").to(room.id).emit("room_changed", room);
  }

  _handleNewCurrentPlayer(roomId) {
    const game = this.gameManager.getGame(roomId);
    if(!game) return
    this._handleUpdateRoomInfo(roomId);
    this.io.of("/").to(roomId).emit("new_current_player", game.currentPlayer);
  }

  _checkIfAllPlayersGotRigth(room) {
    if (!room?.records.guesses) return;
    if (room.numberOfPlayersThatGotRigth === room.members.length - 1) {
      const game = this.gameManager.getGame(room.id);

      game.clearGameTime(() => {
        this._dispatchNewRoundActions(room.id, game);
      });

      this._resetRoomInfo(room, game);
      this._emmitForAll(room.id, "everyone_got_rigth");
    }
  }

  _emmitForAll(roomId, msg, data) {
    this.io
      .of("/")
      .to(roomId)
      .emit(msg, data ?? "");
  }
}

module.exports = { GameManager, GameHandler };
