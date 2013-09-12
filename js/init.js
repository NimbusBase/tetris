// Generated by CoffeeScript 1.6.3
var Game, Player, sync;

sync = {
  'GDrive': {
    'key': '361504558285.apps.googleusercontent.com',
    "scope": "https://www.googleapis.com/auth/drive",
    "app_name": "tetris"
  }
};

Nimbus.Auth.setup(sync);

Game = Nimbus.Model.setup('Game', ['player0', 'player1', 'state', 'players', 'restart', 'restart0', 'restart1', 'pause', 'resume', 'over', 'owner']);

Player = Nimbus.Model.setup('Player', ['name', 'userid', 'avatar', 'piece', 'index', 'board', 'online']);

if (location.search && location.search.substr(1)) {
  localStorage['doc_id'] = location.search.substr(1);
  Game.destroyAll();
  Player.destroyAll();
  location.href = location.origin + location.pathname;
}

window.realtime_update_handler = function(event, obj, isLocal) {
  var board, boards, canvas, current, game, index, me, online, player, _i, _len;
  if (!window.controllers) {
    return;
  }
  game = Game.first();
  boards = controllers.boards;
  current = JSON.parse(localStorage['current']);
  me = Player.findByAttribute('userid', current.userId);
  online = Player.findAllByAttribute('online', true);
  if (!game) {
    return;
  }
  for (_i = 0, _len = boards.length; _i < _len; _i++) {
    board = boards[_i];
    if (board && board.playerRef) {
      player = Player.findByAttribute('userid', board.playerRef.userid);
      board.snapshot = player.piece;
      board.draw();
    }
  }
  if (game['restart' + (1 - controllers.myPlayerIndex)]) {
    console.log('restart' + (1 - controllers.myPlayerIndex));
    game['restart' + (1 - controllers.myPlayerIndex)] = 0;
    game.save();
    controllers.restartGame();
    $('#pause').text('Pause');
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
    controllers.pause();
    $('#pause').text('Resume');
  }
  if (controllers.boards.length < online.length) {
    console.log('will add the other user to boards');
    index = 1 - controllers.myPlayerIndex;
    canvas = $('#canvas' + index).get(0);
    player = Player.all()[index];
    board = new Tetris.Board(canvas, player, index);
    $('.player_name' + index).text(player.name);
    return controllers.boards.push(board);
  }
};

window.collaborator_left_callback = function(evt) {
  var board, index, player, players, user, _i, _j, _len, _len1, _ref, _results;
  user = evt.collaborator;
  players = Player.all();
  _results = [];
  for (_i = 0, _len = players.length; _i < _len; _i++) {
    player = players[_i];
    if (player.userid === user.userId) {
      player.online = false;
      player.save();
      if (controllers.boards) {
        _ref = controllers.boards;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          board = _ref[_j];
          if (board.playerRef.userid === player.userid) {
            index = controllers.boards.indexOf(board);
            controllers.boards.splice(index, 1);
          }
        }
      }
      break;
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

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
  var collabrators, one, url, _i, _len;
  if (Nimbus.Auth.authorized()) {
    url = location.pathname + '?' + c_file.id;
    window.history.pushState("Game Started", "Nimbus Tetris", url);
    collabrators = doc.getCollaborators();
    for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
      one = collabrators[_i];
      if (one.isMe) {
        localStorage['current'] = JSON.stringify(one);
        break;
      }
    }
    if (app_files && app_files.length < 2) {
      $('.mask').hide();
      return process_game_data();
    } else {
      list_games();
      $('#login').hide();
      return $('.mask .panel').slideDown();
    }
  }
};

window.list_games = function() {
  var current, file, html, is_owner, profile, _i, _len;
  html = '';
  profile = '';
  current = JSON.parse(localStorage['current']);
  $('.panel .profile img').attr('src', current.photoUrl);
  $('.panel .profile span').text(current.displayName);
  for (_i = 0, _len = app_files.length; _i < _len; _i++) {
    file = app_files[_i];
    is_owner = file.owners[0].displayName === current.displayName;
    html += '<li class="game"><a href="#" data-id="' + file.id + '">' + file.owners[0].displayName + '</a>';
    html += '<p class="delete" data-owner="' + is_owner + '" data-id="' + file.id + '">X</p></li>';
  }
  return $('.panel .list ul').html(html);
};

window.process_game_data = function() {
  return Game.sync_all(function() {
    return Player.sync_all(function() {
      check_online();
      return join_me();
    });
  });
};

window.join_me = function() {
  var game, i, joined, me, one, player, players, _i, _j;
  me = JSON.parse(localStorage['current']);
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
    game.restart0 = 0;
    game.restart1 = 0;
    game.over = 0;
    game.pause = 0;
    game.resume = 0;
    game.players = 1;
    one = Player.create(player);
    one.index = 0;
    joined = true;
    one.save();
  } else {
    joined = false;
    for (i = _i = 0; _i < 2; i = ++_i) {
      if (joined) {
        continue;
      }
      one = players[i];
      if (one && one.userid === player.userid) {
        one.online = true;
        joined = true;
      } else if (!one) {
        one = Player.create(player);
        one.index = i;
        joined = true;
      }
      one.save();
    }
    if (!joined) {
      for (i = _j = 0; _j < 2; i = ++_j) {
        one = players[i];
        if (!one.online) {
          one.name = player.name;
          one.userid = player.userid;
          one.avatar = player.avatar;
          one.piece = player.piece;
          one.board = player.board;
          one.online = true;
          one.index = i;
          one.save();
          joined = true;
          break;
        }
      }
    }
  }
  if (!joined) {
    console.log('waiting...');
  }
  game.restart0 = 0;
  game.restart1 = 0;
  game.save();
  return window.controllers = new Tetris.Controller(game);
};

window.check_online = function(clear) {
  var collabrators, game, i, one, original, player, players, _i, _j, _len;
  original = game = Game.first();
  if (!game) {
    return;
  }
  players = Player.all();
  collabrators = doc.getCollaborators();
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
        }
      }
    }
    if (!player.online && clear) {
      player.board = [];
      player.piece = null;
    }
    player.save();
  }
  return game.save();
};

window.erase_indexedDB = function(callback) {
  var indexedDB, req;
  indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
  req = indexedDB.open('tetris', 1);
  req.onsuccess = function(evt) {
    var db, store, tx;
    db = evt.target.result;
    tx = db.transaction('models', "readwrite");
    store = tx.objectStore('models');
    store.put({
      key: 'Game',
      data: ''
    });
    store.put({
      key: 'Player',
      data: ''
    });
    if (callback) {
      return callback();
    }
  };
};

$(function() {
  $('.panel .list').on('click', function(evt) {
    var current, file_id;
    file_id = $(evt.target).data('id');
    if ($(evt.target)[0].tagName === 'P') {
      if ($(evt.target).data('owner')) {
        Nimbus.Client.GDrive.deleteFile(file_id);
        console.log('file deleted');
        $(evt.target).parent('li').remove();
      } else {
        current = JSON.pares(localStorage['current']);
        if (current.permissionId) {
          Nimbus.Share.remove_shared_user_real(current.permissionId, function() {
            console.log('file removed');
            return $(evt.target).remove();
          });
        } else {
          Nimbus.Share.get_me(function(me) {
            current.permissionId = me.id;
            localStorage['current'] = JSON.stringify(current);
            return Nimbus.Share.remove_shared_user_real(current.permissionId, function() {
              console.log('file removed');
              return $(evt.target).remove();
            });
          });
        }
      }
    } else if ($(evt.target)[0].tagName === 'A') {
      erase_indexedDB(function() {
        if (window.controllers) {
          window.controllers.new_game();
        }
        load_new_file(file_id, function() {
          var url;
          url = location.pathname + '?' + c_file.id;
          window.history.pushState("New Game Loaded", "Nimbus Tetris", url);
          return process_game_data();
        });
        return $('.mask').fadeOut();
      });
    } else {
      if (window.controllers) {
        $('.mask').fadeOut();
      }
    }
    return false;
  });
  $('#login_btn').click(function() {
    console.log('auth start...');
    Nimbus.Auth.authorize('GDrive');
    return false;
  });
  $('#new_game').click(function() {
    if (window.controllers) {
      controllers.new_game();
    }
    erase_indexedDB(function() {
      return Nimbus.Client.GDrive.insertFile("", Nimbus.Auth.app_name, 'application/vnd.google-apps.drive-sdk', null, function(data) {
        var k, v, _ref;
        log("finished insertFile", data);
        window.c_file = data;
        if (Nimbus.dictModel != null) {
          _ref = Nimbus.dictModel;
          for (k in _ref) {
            v = _ref[k];
            v.records = {};
          }
        }
        return gapi.drive.realtime.load(data.id, onFileLoaded, initializeModel);
      });
    });
    return false;
  });
  $('a#choose_file').click(function() {
    Nimbus.Client.GDrive.getMetadataList("title = '" + Nimbus.Auth.app_name + "'", function(data) {
      var file, list, _i, _len, _ref;
      list = [];
      _ref = data.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        if (file.mimeType.indexOf("application/vnd.google-apps.drive-sdk") >= 0) {
          list.push(file);
        }
      }
      if (list.length && list) {
        window.app_files = list;
        list_games();
        $('.mask .panel').show();
        $('#login').hide();
        return $('.mask').fadeIn();
      } else {
        return startRealtime();
      }
    });
    return false;
  });
  $('a#logout').click(function() {
    erase_indexedDB(function() {
      Nimbus.Auth.logout();
      return location.reload();
    });
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
    check_online(true);
    game = Game.first();
    game['restart' + controllers.myPlayerIndex] = 1;
    game.resume = 0;
    game.pause = 0;
    game.over = 0;
    game.save();
    $('#pause').text('Pause');
    controllers.restartGame();
    return false;
  });
  $('#invite').click(function() {
    var email;
    email = $('#invite_email').val();
    Nimbus.Share.add_share_user_real(email);
    ios.notify({
      title: 'Success',
      message: 'Copy the url and send it to your friend'
    });
    return false;
  });
  return true;
});
