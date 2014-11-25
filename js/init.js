// Generated by CoffeeScript 1.8.0
var Game, Player, sync;

sync = {
  'GDrive': {
    'key': '361504558285.apps.googleusercontent.com',
    "scope": "openid https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/plus.me",
    "app_name": "tetris",
    "app_id": '361504558285'
  },
  'synchronous': true
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

window.realtime_update_handler = Nimbus.realtime.realtime_update_handler = function(event, obj, isLocal) {
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
  if (search && search !== Nimbus.realtime.c_file.id) {
    Nimbus.realtime.load_new_file(search, function() {
      console.log('loading new file');
      return sync_players_on_callback();
    }, function(e) {
      if (e.type === gapi.drive.realtime.ErrorType.TOKEN_REFRESH_REQUIRED) {
        return authorizer.authorize();
      } else if (e.type === gapi.drive.realtime.ErrorType.CLIENT_ERROR) {
        if (localStorage['doc_id']) {
          delete localStorage['doc_id'];
          return location.reload();
        } else {
          return alert("An Error happened: " + e.message);
        }
      } else {
        return console.log('Unknown error:' + e.message);
      }
    });
    return;
  } else {
    sync_players_on_callback();
  }
});

window.sync_players_on_callback = function() {
  var collabrators, one, url, _i, _len;
  if (Nimbus.Auth.authorized()) {
    url = location.pathname + '?' + Nimbus.realtime.c_file.id;
    window.history.pushState("Game Started", "Nimbus Tetris", url);
    localStorage['doc_id'] = Nimbus.realtime.c_file.id;
    collabrators = Nimbus.realtime.doc.getCollaborators();
    for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
      one = collabrators[_i];
      if (one.isMe) {
        localStorage['current'] = JSON.stringify(one);
        break;
      }
    }
    process_game_data();
    return $('.mask').fadeOut();
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
    if (file.id === Nimbus.realtime.c_file.id) {
      html += '</li>';
      continue;
    }
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
  var collabrators, e, game, i, one, original, player, players, _i, _j, _len;
  original = game = Game.first();
  if (!game) {
    return;
  }
  players = Player.all();
  collabrators = Nimbus.realtime.doc.getCollaborators();
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
    try {
      player.save();
    } catch (_error) {
      e = _error;
      alert(e.n);
      location.reload();
    }
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

window.remove_file = function(file_id, evt) {
  var current;
  if ($(evt.target).data('owner')) {
    Nimbus.Client.GDrive.deleteFile(file_id);
    console.log('file deleted');
    return $(evt.target).parent('li').slideUp(function() {
      return $(this).remove();
    });
  } else {
    current = JSON.parse(localStorage['current']);
    if (current.permissionId) {
      return Nimbus.Share.remove_share_user_real(current.permissionId, function() {
        console.log('file removed');
        return $(evt.target).parent('li').slideUp(function() {
          return $(this).remove();
        });
      }, file_id);
    } else {
      return Nimbus.Share.get_me(function(me) {
        current.permissionId = me.id;
        localStorage['current'] = JSON.stringify(current);
        return Nimbus.Share.remove_share_user_real(current.permissionId, function() {
          console.log('file removed');
          return $(evt.target).parent('li').slideUp(function() {
            return $(this).remove();
          });
        }, file_id);
      });
    }
  }
};

$(function() {
  $('.panel .list').on('click', function(evt) {
    var file_id;
    file_id = $(evt.target).data('id');
    if ($(evt.target)[0].tagName === 'P' && Nimbus.realtime.c_file.id !== file_id) {
      remove_file(file_id, evt);
    } else if ($(evt.target)[0].tagName === 'A' && Nimbus.realtime.c_file.id !== file_id) {
      erase_indexedDB(function() {
        var e;
        if (window.controllers) {
          window.controllers.new_game();
        }
        try {
          Nimbus.realtime.doc.close();
        } catch (_error) {
          e = _error;
          console.log(e);
        }
        Nimbus.Client.GDrive.switch_to_app_file_real(file_id, function() {
          var url;
          url = location.pathname + '?' + Nimbus.realtime.c_file.id;
          window.history.pushState("New Game Loaded", "Nimbus Tetris", url);
          return localStorage['doc_id'] = Nimbus.realtime.c_file.id;
        });
        $('.mask').fadeOut();
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
    window.new_game = true;
    erase_indexedDB(function() {
      Nimbus.Client.GDrive.insertFile("", Nimbus.Auth.app_name, 'application/vnd.google-apps.drive-sdk', null, function(data) {
        var e, k, v, _ref;
        log("finished insertFile", data);
        Nimbus.realtime.c_file = data;
        if (Nimbus.dictModel != null) {
          _ref = Nimbus.dictModel;
          for (k in _ref) {
            v = _ref[k];
            v.records = {};
          }
        }
        try {
          Nimbus.realtimeclose();
        } catch (_error) {
          e = _error;
          console.log(e);
        }
        return gapi.drive.realtime.load(data.id, onFileLoaded, initializeModel);
      });
    });
    return false;
  });
  $('a#choose_file').click(function() {
    Nimbus.Client.GDrive.getMetadataList("title = '" + Nimbus.Auth.app_name + "' and mimeType != 'application/vnd.google-apps.folder'", function(data) {
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
      return location.href = location.origin + location.pathname;
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
