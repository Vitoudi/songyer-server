const { getSong, searchSong } = require("genius-lyrics-api");

class Requester {
  constructor() {
    this.secret =
      "aXxHClXc4yEoPLmYG-AByGvZ4EE7kHY6UtTo3rYilRvnPik63CPPCxXpHW5XSliT";
  }

  getSong(song) {
    const formatedSong = song.title.split('by')
    const title = formatedSong[0]
    const artist = formatedSong[formatedSong.length - 1].replace(/\([^()]*\)/, '');

    return getSong({
      apiKey: this.secret,
      title,
      artist,
      optimizeQuery: true,
    });
  }

  getSearchResults({ artist = "", song = "" }) {
    return searchSong({
      apiKey: this.secret,
      title: song,
      artist: artist,
      optimizeQuery: true,
    })

  }
}

class RequestHandler {
  constructor({ socket, io }) {
    this.socket = socket;
    this.io = io;
    this.requester = new Requester();
  }

  async handleGetSearchResults(options) {
    const data = await this.requester.getSearchResults(options)
    const results = data.slice(0, 5)    
    this.socket.emit('results_arrived', results)
  }

  async handleGetSong(song) {
      try {
        const result = await this.requester.getSong(song);
        this.socket.emit("song_data_arrived", result);
      } catch(err) {
          console.log(err)
      }
    
  }
}

module.exports = { Requester, RequestHandler };
