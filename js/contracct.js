"use strict";

var CBPlayer = function (text) {
  if (text) {
    var obj = JSON.parse(text);
    this.balance = obj.balance;
    this.nick = obj.nick;
  } else {
    this.balance = new BigNumber(0);
    this.nick = "player";
  }
};

CBPlayer.prototype = {
  toString: function () {
    return JSON.stringify(this);
  }
};

var CBGame = function (text) {
  if (text) {
    var obj = JSON.parse(text);
    this.balance = obj.balance;
    this.address = obj.address;
  } else {
    this.balance = new BigNumber(0);
    this.address = "";
  }
};

CBGame.prototype = {
  toString: function () {
    return JSON.stringify(this);
  }
};

var CBSession = function (text) {
  if (text) {
    var obj = JSON.parse(text);
    this.pool = obj.pool;
    this.scores = obj.scores;
  } else {
    this.pool = new BigNumber(0);
    this.scores = {};
  }
};

CBSession.prototype = {
  toString: function () {
    return JSON.stringify(this);
  }
};

var Cryptobird = function () {
  LocalContractStorage.defineMapProperty(this, "gameConfig", {
    stringify: function (obj) {
        return obj.toString();
    },
    parse: function (str) {
        return new BigNumber(str);
    }
  });
  LocalContractStorage.defineMapProperty(this, "players", {
    stringify: function (obj) {
      return obj.toString();
    },
    parse: function (str) {
      return new CBPlayer(str);
    }
  });
  LocalContractStorage.defineMapProperty(this, "sessions", {
    stringify: function (obj) {
      return obj.toString();
    },
    parse: function (str) {
      return new CBSession(str);
    }
  });
  LocalContractStorage.defineMapProperty(this, "games", {
    stringify: function (obj) {
      return obj.toString();
    },
    parse: function (str) {
      return new CBGame(str);
    }
  });
};
//
Cryptobird.prototype = {
  init: function () {
    this.gameConfig.put("blindBid", "1000000000000000"); // 0.001 NAS;
  },
  // start To Play
  startToPlay: function () {
    var bid = new BigNumber(Blockchain.transaction.value);
    var blindBid = this.gameConfig.get("blindBid");
    if (bid.lt(blindBid)) {
      throw new Error("bid too low"+ "; bid: " + bid + "; blindBid: " + blindBid);
    }

    // if player not signed, signup.
    var from = Blockchain.transaction.from;
    var myPlayer = this.players.get(from);
    if (!myPlayer) {
      myPlayer = new CBPlayer();
      this.players.put(from, myPlayer);
    }

    var gameId = Blockchain.transaction.hash;
    var myGame = new CBGame();
    myGame.address = from;
    myGame.balance = bid;
    this.games.put(gameId, myGame);
    return gameId;
  },

  // submit score
  submitScore: function (score, gameId) {

    // if player not signed, signup.
    var from = Blockchain.transaction.from;
    var myPlayer = this.players.get(from);
    if (!myPlayer) {
      throw new Error("player not exist!" );
    }

    // get game
    var myGame = this.games.get(gameId);
    if (!myGame) {
      throw new Error("gameId invalid! gameId:" + gameId + "score:" + score);
    }

    if (myGame.address != from) {
      throw new Error("not your game! PlayerId:" + myGame.address );
    }

    // get session
    var date = new Date();
    var sessionId = parseInt(date / (3600 * 1000));
    var mySession = this.sessions.get(sessionId);
    if (!mySession) {
      mySession = new CBSession();
    }

    mySession.pool =  (new BigNumber(mySession.pool)).plus(myGame.balance);
    var myScore = mySession.scores[from];
    if (!myScore || myScore < score) {
      mySession.scores[from] = score;
    }
    this.sessions.put(sessionId, mySession);
    return sessionId;
  },

  // get current pool
  getPool: function () {
    var date = new Date();
    var sessionId = parseInt(date / (3600 * 1000));
    var mySession = this.sessions.get(sessionId);
    if (!mySession) {
      return 0;
    }
    return mySession.pool;
  },

  // get player info
  getPlayer: function(playerId) {
    var player = this.players.get(playerId);
    if (!player) {
      throw new Error("player not exist!");
    }
    return player.toString();
  },

  // get leader board of current session
  getLeaderBoard: function () {
    var date = new Date();
    var sessionId = parseInt(date / (3600 * 1000));
    var mySession = this.sessions.get(sessionId);
    if (!mySession) {
      return null;
    }
    var _scores = mySession.scores;
    var _leaderBoard = Object.keys(_scores).map(function(playerId) {
      var playerInfo = {
        id: playerId,
        score: _scores[playerId]
      }
      return playerInfo;
    });
    return _leaderBoard;
  },

  getGame: function(gameId) {
    var game = this.games.get(gameId);
    if (!game) {
      throw new Error("game not exist!");
    }
    return game.toString();
  },

  getSession: function(sessionId) {
    var session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("session not exist!");
    }
    return session.toString();
  },

  // get Nick name of player
  getNick: function () {
    var addr = Blockchain.transaction.from;
    var player = this.players.get(addr);
    if (!player) {
      return "player";
    }
    return player.nick;
  },

  // get balance of player
  getBalance: function () {
    var addr = Blockchain.transaction.from;
    var player = this.players.get(addr);
    if (!player) {
      return 0;
    }
    return player.balance;
  }
};

module.exports = Cryptobird;
