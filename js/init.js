// Generated by CoffeeScript 1.6.3
var Player, sync;

sync = {
  'GDrive': {
    'key': '361504558285.apps.googleusercontent.com',
    "scope": "https://www.googleapis.com/auth/drive",
    "app_name": "tetris"
  }
};

Nimbus.Auth.setup(sync);

window.realtime_update_handler = function(event, obj, isLocal) {
  var avatar, board, boards, canvas, join, one, online, over, pause, player, restart, resume, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m;
  if (!window.controllers) {
    return;
  }
  online = Player.findAllByAttribute('online', true);
  restart = Player.findAllByAttribute('restart', 1);
  over = Player.findAllByAttribute('over', 1);
  boards = controllers.boards;
  pause = Player.findAllByAttribute('pause', 1);
  resume = Player.findAllByAttribute('resume', 1);
  for (_i = 0, _len = boards.length; _i < _len; _i++) {
    board = boards[_i];
    if (board && board.playerRef) {
      board.snapshot = board.playerRef;
      board.draw();
    }
  }
  if (restart.length) {
    for (_j = 0, _len1 = restart.length; _j < _len1; _j++) {
      one = restart[_j];
      if (one.restart && !isLocal) {
        one.restart = 0;
        one.save();
      }
    }
    controllers.myBoard.clear();
    controllers.resetGravity();
  }
  if (over.length) {
    controllers.pause();
    if (controllers.playercount === 2 && over.length === 2) {
      console.log('even..');
    } else if (controllers.playercount === 2) {
      for (_k = 0, _len2 = players.length; _k < _len2; _k++) {
        player = players[_k];
        if (!player.over) {
          log('player ' + player.name + ' win');
          break;
        }
      }
    } else {
      console.log('game over');
    }
    for (_l = 0, _len3 = over.length; _l < _len3; _l++) {
      one = over[_l];
      if (one.over && !isLocal) {
        one.over = 0;
        one.save();
      }
    }
    return;
  }
  if (pause.length) {
    controllers.pause();
  }
  if (resume.length) {
    controllers.resume();
    if (!isLocal) {
      for (_m = 0, _len4 = resume.length; _m < _len4; _m++) {
        one = resume[_m];
        one.resume = 0;
        one.pause = 0;
        one.save();
      }
      return;
    }
  }
  if (controllers.playercount !== online.length && controllers.playercount < 2) {
    join = Player.findByAttribute('state', 1);
    if (join) {
      canvas = $('#canvas' + controllers.playercount).get(0);
      boards.push(new Tetris.Board(canvas, join));
      if (join.avatar.indexOf('http') === -1) {
        avatar = 'https:' + join.avatar;
      } else {
        avatar = join.avatar;
      }
      $('#avatar' + controllers.playercount).attr('src', avatar);
      $('.player_name' + controllers.playercount).text(join.name);
      return controllers.playercount++;
    }
  }
};

Player = Nimbus.Model.setup('Player', ['userid', 'name', 'online', 'board', 'piece', 'avatar', 'restart', 'pause', 'resume', 'state', 'over']);

Player.prototype.child = function(key) {
  var i, keys, result;
  key = key.toString();
  result = this;
  keys = key.split('/');
  i = 0;
  while (i < keys.length) {
    result = result[keys[i]];
    i++;
  }
  return result;
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
      }
    });
  } else {
    return sync_players_on_callback();
  }
});

window.sync_players_on_callback = function() {
  if (Nimbus.Auth.authorized()) {
    return Player.sync_all(function() {
      var collabrators, data, me, one, player, _i, _j, _k, _len, _len1, _len2, _ref;
      $('#login').text('Logout');
      $('.mask').hide();
      collabrators = doc.getCollaborators();
      for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
        one = collabrators[_i];
        if (one.isMe) {
          localStorage['current'] = JSON.stringify(one);
          fill_player(one);
          me = one;
        }
      }
      data = Player.findByAttribute('userid', me.userId);
      _ref = Player.all();
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        player = _ref[_j];
        player.online = false;
        player.state = 0;
        for (_k = 0, _len2 = collabrators.length; _k < _len2; _k++) {
          one = collabrators[_k];
          if (one.userId === player.userid) {
            console.log('player ' + player.name + ' online');
            player.online = true;
          }
          player.over = 0;
          player.restart = 0;
        }
        player.save();
      }
      return window.controllers = new Tetris.Controller(Player.all());
    });
  }
};

window.set_player = function(data, target) {
  var player;
  player = Player.findByAttribute('userid', data.userId);
  if (!player) {
    player = Player.create();
    player.userid = data.userId;
    player.name = data.displayName;
    player.avatar = data.photoUrl;
  }
  player.online = true;
  player.state = 1;
  player.restart = 0;
  player.over = 0;
  player.avatar = data.photoUrl;
  return player.save();
};

window.fill_player = function(user) {
  var offline, player, players;
  players = Player.all();
  if (players.length < 2) {
    set_player(user);
    return;
  } else if (players.length === 2) {
    player = Player.findByAttribute('userid', user.userId);
    if (player) {
      player.online = true;
      player.avatar = user.photoUrl;
      player.state = 1;
      player.restart = 0;
      player.over = 0;
      player.save();
      return;
    } else {
      offline = Player.findByAttribute('offline', false);
      if (offline) {
        offline.destroy();
        set_player(user);
        return;
      }
    }
  }
  return console.log('waiting...');
};

$(function() {
  if (location.search && location.search.substr(1) && localStorage['doc_id'] !== location.search.substr(1)) {
    localStorage['doc_id'] = location.search.substr(1);
    location.href = location.origin + location.pathname;
  }
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
    var me;
    me = Player.findByAttribute('userid', controllers.myPlayerRef.userid);
    if ($(this).text() === 'Pause') {
      me.pause = 1;
      me.save();
      controllers.pause();
      return $(this).text('Resume');
    } else {
      me.resume = 1;
      me.save();
      controllers.resume();
      return $(this).text('Pause');
    }
  });
  $('#restart').click(function() {
    var id, player;
    id = controllers.myPlayerRef.userid;
    player = Player.findByAttribute('userid', id);
    player.restart = 1;
    player.save();
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
