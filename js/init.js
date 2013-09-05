// Generated by CoffeeScript 1.6.3
var Game, sync;

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
window.get_player_piece = function(player){
  var game = Game.first();
  if (game.player0 && game.player0.userid==player.userid) {
    return game.player0.piece;
  };
  if (game.player1 && game.player1.userid==player.userid) {
    return game.player1.piece;
  };
  return null;
}
window.realtime_update_handler = function(event, obj, isLocal) {
  var avatar, board, boards, canvas, game, join, _i, _len;
  if (!window.controllers || event!='UPDATE') {
    return;
  }
  boards = controllers.boards;
  game = Game.first();

  for (_i = 0, _len = boards.length; _i < _len; _i++) {
    board = boards[_i];
    if (board && board.playerRef) {
      board.snapshot = get_player_piece(board.playerRef);
      board.draw();
    }
  }
  if (game.restart) {
    controllers.myBoard.clear();
      game.restart = 0;
      game.over = 0;
      game.pause = 0;
      game.resume = 0;
      game.save();
    
    $('#pause').text('Pause');
    controllers.restartGame();
    return;
  }
  if (game.over) {
    controllers.pause();
    return;
  }
  if (game.pause) {
    $('#pause').text('Resume');
    controllers.pause();
    return;
  }
  if (game.resume) {
    controllers.resume();
    $('#pause').text('Pause');
    if (!isLocal) {
      game.restart = 0;
      game.over = 0;
      game.pause = 0;
      game.resume = 0;
      game.save();
    }
    return;
  }
  // will code join

};

Game = Nimbus.Model.setup('Game', ['player0', 'player1', 'state', 'players', 'restart', 'pause', 'resume', 'over', 'owner']);

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
      var collabrators, game, me, one, player, _i, _len;
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
        game.player0 = player;
        
      } else {
        check_online();
        if (!game.player0) {
          game.player0 = player;
        }else if(!game.player1){
          game.player1 = player;
        }else{
          if (!game.player0.online) {
            if ( game.player0.userid != player.userid) {
              game.player0 = player;
            }else{
              game.player0.online = true;
            };
          } else if (!game.player1.online) {
            if (game.player1.userid != player.userid) {
              game.player1 = player;
            }else if(game.player1.userid == player.userid){
              game.player1.online = true;
            };
          } else {
            console.log('waiting');
          }
        };
      }

      game.state = 2;
      game.restart = 0;
      game.over = 0;
      game.pause = 0;
      game.resum = 0;
      game.save();
      return window.controllers = new Tetris.Controller(game);
    });
  }
};

window.check_online = function() {
  var collabrators, game, one, original, _i, _len;
  original = game = Game.first();
  collabrators = doc.getCollaborators();
  for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
    one = collabrators[_i];
    if (game.player0) {
      if (!game.player0.online && game.player0.userid === one.userId) {
        game.player0.online = true;
      }
    }
    if (game.player1) {
      if (!game.player1.online && game.player1.userid === one.userId) {
        game.player1.online = true;
      }
    }
  }
  if (original !== game) {
    return game.save();
  }
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
      $(this).text('Resume');
    } else if ($(this).text() === 'Resume') {
      game.pause = 0;
      game.resume = 1;
      $(this).text('Pause');
    }
    game.save();

    return false;
  });
  $('#restart').click(function() {
    var game;
    game = Game.first();
    game.restart = 1;
    game.resume = 0;
    game.pause = 0;
    game.over = 0;
    game.save();
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
