// Generated by CoffeeScript 1.6.3
var Game, Player, sync;

if (location.search && location.search.substr(1)) {
  localStorage['doc_id'] = location.search.substr(1);
  location.href = location.origin + location.pathname;
}

sync = {
  'GDrive': {
    'key': '361504558285.apps.googleusercontent.com',
    "scope": "https://www.googleapis.com/auth/drive",
    "app_name": "tetris"
  }
};

Nimbus.Auth.setup(sync);

window.realtime_update_handler = function(event, obj, isLocal) {
  var board, boards, current, game, me, online, player, _i, _len;
  if (!window.controllers) {
    return;
  }
  game = Game.first();
  boards = controllers.boards;
  current = JSON.parse(localStorage['current']);
  me = Player.findByAttribute('userid', current.userId);
  online = Player.findAllByAttribut('online', true);
  for (_i = 0, _len = boards.length; _i < _len; _i++) {
    board = boards[_i];
    if (board && board.playerRef) {
      player = Player.findByAttribute('userid', board.playerRef.userid);
      board.snapshot = player.piece;
      board.draw();
    }
  }
  if (game.restart0 || game.restart1) {
    if (game['restart' + me.index]) {
      game['restart' + me.index] = 0;
      game.save();
      controllers.restartGame();
      $('#pause').text('Pause');
    }
  }
  if (game.resume) {
    if (!isLocal) {
      game.resume = 0;
      game.save();
    }
    controllers.resume();
    $("#pause").text('Pause');
  }
  if (game.pause) {
    controller.pause();
    return $('#pause').text('Resume');
  }
};

Game = Nimbus.Model.setup('Game', ['player0', 'player1', 'state', 'players', 'restart', 'restart0', 'restart1', 'pause', 'resume', 'over', 'owner']);

Player = Nimbus.Model.setup('Player', ['name', 'userid', 'avatar', 'piece', 'index', 'board', 'online']);

Nimbus.Auth.set_app_ready(function() {
  var search;
  search = localStorage['doc_id'];
  if (search && search !== c_file.id) {
    load_new_file(search, function() {
      console.log('loading new file');
      return sync_players_on_callback();
    }, function(e) {
      if (e.type === gapi.drive.realtime.ErrorType.TOKEN_REFRESH_REQUIRED) {
        return authorizer.authorize();
      } else if (e.type === gapi.drive.realtime.ErrorType.CLIENT_ERROR) {
        if (localStorage['doc_id']) {
          localStorage.clear();
          return location.reload();
        } else {
          return alert("An Error happened: " + e.message);
        }
      } else {
        return console.log('Unknown error:' + e.message);
      }
    });
  } else {
    return sync_players_on_callback();
  }
});

window.sync_players_on_callback = function() {
  if (Nimbus.Auth.authorized()) {
    $('#login').text('Logout');
    $('.mask').hide();
    return Game.sync_all(function() {
      return Player.sync_all(function() {
        var collabrators, game, i, joined, me, one, player, players, _i, _j, _len;
        me = {};
        collabrators = doc.getCollaborators();
        for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
          one = collabrators[_i];
          if (one.isMe) {
            localStorage['current'] = JSON.stringify(one);
            me = one;
          }
        }
        game = Game.first();
        players = Player.all();
        player = {
          'name': me.displayName,
          'userid': me.userId,
          'avatar': me.photoUrl,
          'board': [],
          'piece': null,
          'online': true
        };
        if (!game) {
          game = Game.create();
          game.owner = me.userId;
          game.state = 2;
          game.restart = 0;
          game.over = 0;
          game.pause = 0;
          game.resum = 0;
          game.players = 1;
          one = Player.create();
          one.name = player.name;
          one.userid = player.userid;
          one.avatar = player.avatar;
          one.piece = player.piece;
          one.board = player.board;
          one.online = true;
          one.index = i;
          joined = true;
          one.save();
        } else {
          check_online();
          joined = false;
          for (i = _j = 0; _j < 2; i = ++_j) {
            if (!joined) {
              continue;
            }
            one = players[i];
            if (one && one.userid === player.userid) {
              one.online = true;
              joined = true;
            } else if (!one) {
              one = Player.create();
              one.name = player.name;
              one.userid = player.userid;
              one.avatar = player.avatar;
              one.piece = player.piece;
              one.board = player.board;
              one.online = true;
              one.index = i;
              joined = true;
            }
            one.save();
          }
        }
        if (!joined) {
          console.log('waiting...');
        }
        game.restart0 = 0;
        game.restart1 = 0;
        game.save();
        return window.controllers = new Tetris.Controller(game);
      });
    });
  }
};

window.check_online = function() {
  var collabrators, game, i, one, online, original, player, players, _i, _j, _len;
  original = game = Game.first();
  if (!game) {
    return;
  }
  players = Player.all();
  collabrators = doc.getCollaborators();
  online = 0;
  for (i = _i = 0; _i < 2; i = ++_i) {
    player = players[i];
    if (!player) {
      continue;
    }
    player.online = false;
    for (_j = 0, _len = collabrators.length; _j < _len; _j++) {
      one = collabrators[_j];
      if (player) {
        if (player.userid === one.userId) {
          player.online = true;
          online++;
        }
      }
    }
    player.save();
  }
  game.players = online;
  return game.save();
};

$(function() {
  $('a#login').click(function() {
    console.log('auth start...');
    Nimbus.Auth.authorize('GDrive');
    return false;
  });
  $('a#logout').click(function() {
    Nimbus.Auth.logout();
    location.reload();
    return false;
  });
  $('#pause').click(function() {
    var game;
    game = Game.first();
    if ($(this).text() === 'Pause') {
      game.pause = 1;
      game.resume = 0;
      game.save();
      $(this).text('Resume');
    } else if ($(this).text() === 'Resume') {
      game.pause = 0;
      game.resume = 1;
      game.save();
      $(this).text('Pause');
    }
    return false;
  });
  $('#restart').click(function() {
    var game;
    game = Game.first();
    game.restart0 = 1;
    game.restart1 = 1;
    game.resume = 0;
    game.pause = 0;
    game.save();
    $('#pause').text('Pause');
    return false;
  });
  $('#invite').click(function() {
    var email;
    email = $('#invite_email').val();
    Nimbus.Share.add_share_user_real(email, function(user) {
      var link;
      console.log('file shared');
      link = location.origin + location.pathname + '?' + window.c_file.id;
      return $.prompt('Copy and send this link to your friend: ' + link);
    });
    return false;
  });
  return true;
});
