const app = require("express")();
const http = require("http").createServer(app);
const PORT = 8080;

const { RoomManager, RoomHandler } = require("./classes/Rooms");
const { UserManager, UserHandler } = require("./classes/User");
const { GameHandler } = require('./classes/Game.js');
const { ChatHandler } = require("./classes/Chat");
const { RequestHandler } = require("./classes/Requester");

const userManager = new UserManager();
const roomManager = new RoomManager();

const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});



io.of('/').on("connection", (socket) => {
  const handlerOptions = { socket, io };
  const roomHandler = new RoomHandler(handlerOptions, roomManager)
  const userHandler = new UserHandler(handlerOptions, userManager)
  const gameHandler = new GameHandler(handlerOptions, roomManager)
  const chatHandler = new ChatHandler(handlerOptions, roomManager)
  const requestHandler = new RequestHandler(handlerOptions)

  //USER_RELATED ACTIONS:
  let user;
  socket.emit("user_connected");

  socket.on("create_user", ({ username, roomId }) => {
    const id = socket.client.id;
    user = userHandler.handleCreateUser({username, roomId, id})
  });


  //ROOM RALATED ACTIONS:
  socket.on("create_room", (name) => {
    roomHandler.handleCreateRoom(name)
  });

  socket.on("get_rooms", () => {
    roomHandler.handleGetAllRoomsRequest()
  });

  socket.on("get_room", (roomId) => {
    roomHandler.handleGetRoomRequest(roomId)
  });

  socket.on("enter_room", ({ roomId, user }) => {
    roomHandler.handleRoomEnter({roomId, user})
  });

  socket.on("user_is_in_room", roomId => {
    roomHandler.handleUserIsInRoom(roomId)
  });


  //GAME RELATED ACTIONS
  socket.on("start_game", ({roomId, user}) => {
    gameHandler.handleStartGame({roomId, user})
  });

  socket.on('new_chat_msg', data => {
    chatHandler.handleNewMsg(data)
  })

  socket.on('get_song', song => {
    requestHandler.handleGetSong(song)
  })

  socket.on("get_search_results", options => {
    requestHandler.handleGetSearchResults(options)
  });

  socket.on('new_song_code', options => {
    gameHandler.handleNewSongCode(options)
  })

  socket.on('new_guess', options => {
    const guess = gameHandler.handleNewGuess(options)
    chatHandler.handleNewGuess({...options, guess})
  })

  socket.on('new_tip', options => {
    chatHandler.handleNewTip(options)
  })
});

io.of("/room").on("connection", (socket) => {});

http.listen(PORT, () => {
  console.log("listening in port " + PORT);
});

