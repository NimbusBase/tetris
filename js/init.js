// Generated by CoffeeScript 1.6.3
var Player, sync;

sync = {
  'GDrive': {
    'key': '361504558285.apps.googleusercontent.com',
    "scope": "https://www.googleapis.com/auth/drive",
    "app_name": "tetris"
  }
};
delete localStorage['Player'];
Nimbus.Auth.setup(sync);

window.realtime_update_callback = function() {
  if (!controllers) {
    return;
  };
  var players = Player.all(),
      online = Player.findAllByAttribute('online',true);

  //watch for restart

  //watch for join
  if (controllers.playercount != online.length && controllers.playercount<2) {
    console.log('new player coming in and will be added');
    var join = Player.findByAttribute('state',1);
    if (join) {
      var canvas = $('#canvas' + controllers.playercount).get(0);
      controllers.boards.push(new Tetris.Board(canvas,join));

      var avatar = join.avatar.indexOf('http')== -1 ? 'https:'+join.avatar : join.avatar;
      $('#avatar'+controllers.playercount).attr('src',avatar);
      $('.player_name'+controllers.playercount).text(join.name);
      controllers.playercount++;

    };
  };
  //check offline


  for (var i = 0; i < controllers.boards.length; i++) {
    var board = controllers.boards[i];
    
    if (board && board.playerRef) {
      board.snapshot = board.playerRef;
      board.draw();
    }
  };
};

window.is_player_online = function(id){
  return true;
}

Player = Nimbus.Model.setup('Player', ['userid', 'name', 'online', 'board', 'piece', 'avatar','restart','state']);

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
  var collabrators, data, me, one, player, _i, _j, _k, _len, _len1, _len2, _ref, _results;
  if (Nimbus.Auth.authorized()) {
    $('#login').text('Logout');
    collabrators = doc.getCollaborators();
    for (_i = 0, _len = collabrators.length; _i < _len; _i++) {
      one = collabrators[_i];
      if (one.isMe) {
        localStorage['current'] = JSON.stringify(one);
        fill_player(one);
        me = one;
      }
    }
    
    _ref = Player.all();
    _results = [];
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
        player.save();
      }
      _results.push(player.save());
    }
    window.controllers = new Tetris.Controller(Player.all());
    return _results;
  }
});

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
  player.avatar = data.photoUrl;

  return player.save();
};

window.fill_player = function(user) {
  var player, players, _i, _len;
  players = Player.all();
  if (players.length < 2) {
    set_player(user);
    return;
  }else if(players.length==2){
    //replace offline player or waint
    player = Player.findByAttribute('userid',user.userId);
    if (player) {
      player.online = true;
      player.avatar = data.photoUrl;
      player.state = 1;
      player.save();
      return;
    }else{
      //find offline player
      offline = Player.findByAttribute('online',false);
      if (offline) {
        offline.destroy();
        set_player(user);
        return;
      };
    };
  }

  return console.log('waiting...');
};

$(function() {
  $('a#login').click(function() {
    if ($(this).text() == 'Logout') {
      //stop the game first
      contrllers.pause();      
      Nimbus.Auth.logout();
    }else{
      console.log('auth start...');
      Nimbus.Auth.authorize('GDrive');
    };
   
    return false;
  });
  $('#invite').click(function() {
    var email;
    email = $('#invite_email').val();
    Nimbus.Share.add_share_user_real(email, function(user) {
      console.log('permission granted...');
    });
    return false;
  });
  return true;
});
