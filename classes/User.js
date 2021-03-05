class User {
    constructor({id, username, currentRoom}) {
        this.id = id,
        this.username = username,
        this.currentRoom = currentRoom
        this.points = 0
    }
}

class UserManager {
  constructor() {
    this.users = [];
  }

  createUser(userOptions) {
    //const lastIndex = this.users[this.users.length - 1]?.id || 0;
    const user = new User({...userOptions});
    this.users.push(user);

    return user;
  }

}

class UserHandler {
  constructor({ socket, io }, userManager) {
    this.socket = socket
    this.userManager = userManager
    this.io = io
  }

  handleCreateUser({username, roomId, id}) {
    const userOptions = {
      username,
      roomId,
      id,
    };

    let user = this.userManager.createUser(userOptions);
    this.socket.emit("user_created", user);

    return user
  }

  handleDisconnect() {

  }
}

module.exports = {UserManager, UserHandler}