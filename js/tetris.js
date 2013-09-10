var Tetris = { };

  /**
   * Various constants related to board size / drawing.
   */
  Tetris.BOARD_WIDTH = 10; // (in "blocks", not pixels)
  Tetris.BOARD_HEIGHT = 20;

  Tetris.BLOCK_SIZE_PIXELS = 25;
  Tetris.BOARD_HEIGHT_PIXELS = Tetris.BOARD_HEIGHT * Tetris.BLOCK_SIZE_PIXELS;
  Tetris.BOARD_WIDTH_PIXELS = Tetris.BOARD_WIDTH * Tetris.BLOCK_SIZE_PIXELS;

  Tetris.BLOCK_BORDER_COLOR = "#484848";
  Tetris.BLOCK_COLORS = { 'X': 'black', 'b': '#0066cc', 'B': '#00a6d5', 'O': 'orange', 
                          'Y': '#ffbc89', 'G': 'green', 'P': '#9370D8', 'R': 'red' };

  Tetris.GRAVITY_DELAY = 300; // 300ms

  Tetris.EMPTY_LINE  = "          ";
  Tetris.FILLED_LINE = "XXXXXXXXXX";
  Tetris.COMPLETE_LINE_PATTERN = /[^ ]{10}/;

  // Pieces.  (Indexed by piece rotation (0-3), row (0-3), piece number (0-6))
  Tetris.PIECES = [];
  for (var i = 0; i < 4; i++) { Tetris.PIECES[i] = []; }
  Tetris.PIECES[0][0] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ];
  Tetris.PIECES[0][1] = [ "    ",   "B   ",   "  O ",   " YY ",   " GG ",   " P  ",   "RR  " ];
  Tetris.PIECES[0][2] = [ "bbbb",   "BBB ",   "OOO ",   " YY ",   "GG  ",   "PPP ",   " RR " ];
  Tetris.PIECES[0][3] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ];
  Tetris.PIECES[1][0] = [ " b  ",   "    ",   "    ",   "    ",   "    ",   "    ",   "  R " ];
  Tetris.PIECES[1][1] = [ " b  ",   " B  ",   "OO  ",   " YY ",   " G  ",   " P  ",   " RR " ];
  Tetris.PIECES[1][2] = [ " b  ",   " B  ",   " O  ",   " YY ",   " GG ",   " PP ",   " R  " ];
  Tetris.PIECES[1][3] = [ " b  ",   "BB  ",   " O  ",   "    ",   "  G ",   " P  ",   "    " ];
  Tetris.PIECES[2][0] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ];
  Tetris.PIECES[2][1] = [ "    ",   "    ",   "    ",   " YY ",   " GG ",   "    ",   "RR  " ];
  Tetris.PIECES[2][2] = [ "bbbb",   "BBB ",   "OOO ",   " YY ",   "GG  ",   "PPP ",   " RR " ];
  Tetris.PIECES[2][3] = [ "    ",   "  B ",   "O   ",   "    ",   "    ",   " P  ",   "    " ];
  Tetris.PIECES[3][0] = [ " b  ",   "    ",   "    ",   "    ",   "    ",   "    ",   "  R " ];
  Tetris.PIECES[3][1] = [ " b  ",   " BB ",   " O  ",   " YY ",   " G  ",   " P  ",   " RR " ];
  Tetris.PIECES[3][2] = [ " b  ",   " B  ",   " O  ",   " YY ",   " GG ",   "PP  ",   " R  " ];
  Tetris.PIECES[3][3] = [ " b  ",   " B  ",   " OO ",   "    ",   "  G ",   " P  ",   "    " ];



  /**
   * Stores the state of a tetris board and handles drawing it.
   */
  Tetris.Board = function (canvas, playerRef,index) {
    this.context = canvas.getContext('2d');
    this.playerRef = playerRef;
    this.snapshot = null;
    this.isMyBoard = false;
    this.key = 'player'+index;
  };


  /**
   * Draws the contents of the board as well as the current piece.
   */
  Tetris.Board.prototype.draw = function () {
    // Clear canvas.
    this.context.clearRect(0, 0, Tetris.BOARD_WIDTH_PIXELS, Tetris.BOARD_HEIGHT_PIXELS);
    // Iterate over columns / rows in board data and draw each non-empty block.
    for (var x = 0; x < Tetris.BOARD_WIDTH; x++) {
      for (var y = 0; y < Tetris.BOARD_HEIGHT; y++) {
        var colorValue = this.getBlockVal(x, y);
        if (colorValue != ' ') {
          // Calculate block position and draw a correctly-colored square.
          var left = x * Tetris.BLOCK_SIZE_PIXELS;
          var top = y * Tetris.BLOCK_SIZE_PIXELS;
          this.context.fillStyle = Tetris.BLOCK_COLORS[colorValue];
          var radius = 3,height=24,width=24;
          
          this.context.beginPath();  
          this.context.moveTo(left,top+radius);  
          this.context.lineTo(left,top+height-radius);  
          this.context.quadraticCurveTo(left,top+height,left+radius,top+height);  
          this.context.lineTo(left+width-radius,top+height);  
          this.context.quadraticCurveTo(left+width,top+height,left+width,top+height-radius);  
          this.context.lineTo(left+width,top+radius);  
          this.context.quadraticCurveTo(left+width,top,left+width-radius,top);  
          this.context.lineTo(left+radius,top);  
          this.context.quadraticCurveTo(left,top,left,top+radius);
          this.context.fill();
        }
      }
    }
    
    // If there's a falling piece, draw it.
    if (this.playerRef !== null) {
      var player = Player.findByAttribute('userid',this.playerRef.userid);
      if (player.piece) {
        var piece = Tetris.Piece.fromSnapshot(player.piece);
        this.drawPiece(piece);
        this.fallingPiece = piece;
      };
    }

    // If this isn't my board, dim it out with a 25% opacity black rectangle.
    if (!this.isMyBoard) {
      this.context.fillStyle = "rgba(0, 0, 0, 0.25)";
      this.context.fillRect(0, 0, Tetris.BOARD_WIDTH_PIXELS, Tetris.BOARD_HEIGHT_PIXELS);
    }

  };


  /**
   * Draw the currently falling piece.
   */
  Tetris.Board.prototype.drawPiece = function (piece) {
    var self = this;
    this.forEachBlockOfPiece(piece,
      function (x, y, colorValue) {
        var left = x * Tetris.BLOCK_SIZE_PIXELS;
        var top = y * Tetris.BLOCK_SIZE_PIXELS;
        
        self.context.fillStyle = Tetris.BLOCK_COLORS[colorValue];
        var radius = 3,height=24,width=24;
        self.context.beginPath();  
        self.context.moveTo(left,top+radius);  
        self.context.lineTo(left,top+height-radius);  
        self.context.quadraticCurveTo(left,top+height,left+radius,top+height);  
        self.context.lineTo(left+width-radius,top+height);  
        self.context.quadraticCurveTo(left+width,top+height,left+width,top+height-radius);  
        self.context.lineTo(left+width,top+radius);  
        self.context.quadraticCurveTo(left+width,top,left+width-radius,top);  
        self.context.lineTo(left+radius,top);  
        self.context.quadraticCurveTo(left,top,left,top+radius);
        self.context.fill();
      });
  };


  /**
   * Clear the board contents.
   */
  // Tetris.Board.prototype.empty = function () {
  //   var player = Player.findByAttribute('userid',this.playerRef.userid);
  //   player.board = [];
  //   player.save();
  // };

  Tetris.Board.prototype.clear = function () {
    for (var row = 0; row < Tetris.BOARD_HEIGHT; row++) {
      this.setRow(row, Tetris.EMPTY_LINE);
    }
  };




  /**
   * Given a Tetris.Piece, returns true if it has collided with the board (i.e. its current position
   * and rotation causes it to overlap blocks already on the board).
   */
  Tetris.Board.prototype.checkForPieceCollision = function (piece) {
    var collision = false;
    var self = this;
    this.forEachBlockOfPiece(piece,
      function (x, y, colorValue) {
        // NOTE: we explicitly allow y < 0 since pieces can be partially visible.
        if (x < 0 || x >= Tetris.BOARD_WIDTH || y >= Tetris.BOARD_HEIGHT) {
          collision = true;
        }
        else if (y >= 0 && self.getBlockVal(x, y) != ' ') {
          collision = true; // collision with board contents.
        }
      }, /*includeInvalid=*/ true);

    return collision;
  };


  /**
   * Given a Tetris.Piece that has landed, add it to the board contents.
   */
  Tetris.Board.prototype.addLandedPiece = function (piece) {
    var self = this;
    // We go out of our way to set an entire row at a time just so the rows show up as
    // child_added in the graphical debugger, rather than child_changed.
    var rowY = -1, rowContents = null;
    this.forEachBlockOfPiece(piece,
      function (x, y, val) {
        if (y != rowY) {
          if (rowY !== -1)
            self.setRow(rowY, rowContents);

          rowContents = self.getRow(y);
          rowY = y;
        }
        rowContents = rowContents.substring(0, x).concat(val)
          .concat(rowContents.substring(x + 1, Tetris.BOARD_WIDTH));
      });

    if (rowY !== -1)
      self.setRow(rowY, rowContents);
  };


  /**
   * Check for any completed lines (no gaps) and remove them, then return the number
   * of removed lines.
   */
  Tetris.Board.prototype.removeCompletedRows = function () {
    // Start at the bottom of the board, working up, removing completed lines.
    var copyFrom = Tetris.BOARD_HEIGHT - 1;
    var copyTo = copyFrom;

    var completedRows = 0;
    while (copyFrom >= 0) {
      var fromContents = this.getRow(copyFrom);

      // See if the line is complete (if so, we'll skip it)
      if (fromContents.match(Tetris.COMPLETE_LINE_PATTERN)) {
        copyFrom--;
        completedRows++;
      } else {
        // Copy the row down (to fill the gap from any removed rows) and continue on.
        this.setRow(copyTo, fromContents);
        copyFrom--;
        copyTo--;
      }
    }

    return completedRows;
  };

  /**
   * Helper to enumerate the blocks that make up a particular piece.  Calls fn() for each block,
   * passing the x and y position of the block and the color value.  If includeInvalid is true, it
   * includes blocks that would fall outside the bounds of the board.
   */
  Tetris.Board.prototype.forEachBlockOfPiece = function (piece, fn, includeInvalid) {
    for (var blockY = 0; blockY < 4; blockY++) {
      for (var blockX = 0; blockX < 4; blockX++) {
        var colorValue = Tetris.PIECES[piece.rotation][blockY][piece.pieceNum].charAt(blockX);
        if (colorValue != ' ') {
          var x = piece.x + blockX, y = piece.y + blockY;
          if (includeInvalid || (x >= 0 && x < Tetris.BOARD_WIDTH && y >= 0 && y < Tetris.BOARD_HEIGHT)) {
            fn(x, y, colorValue);
          }
        }
      }
    }
  };


  Tetris.Board.prototype.getRow = function (y) {
    var row = y; // Pad row so they sort nicely in debugger. :-)
    var rowContents;
    var player = Player.findByAttribute('userid',this.playerRef.userid);

    rowContents = player.board[row] ? player.board[row] : null;

    return rowContents || Tetris.EMPTY_LINE;
  };


  Tetris.Board.prototype.getBlockVal = function (x, y) {
    return this.getRow(y).charAt(x);
  };


  Tetris.Board.prototype.setRow = function (y, rowContents) {
    var row = y; // Pad row so they sort nicely in debugger. :-)

    if (rowContents === Tetris.EMPTY_LINE)
      rowContents = null; // delete empty lines so we get remove / added events in debugger. :-)
    // console.log('set row: '+row+' for '+this.playerRef.board);
    var player = Player.findByAttribute('userid',this.playerRef.userid);
    player.board[row] = rowContents;
    player.save();
  };


  Tetris.Board.prototype.setBlockVal = function (x, y, val) {
    var rowContents = this.getRow(y);
    rowContents = rowContents.substring(0, x) + val + rowContents.substring(x+1);
    this.setRow(y, rowContents);
  };

  /**
   * Immutable object representing a falling piece along with its rotation and board position.
   * Has helpers for generating mutated Tetris.Piece objects (e.g. rotated or dropped).
   */
  Tetris.Piece = function (pieceNum, x, y, rotation) {
    if (arguments.length > 0) {
      this.pieceNum = pieceNum;
      this.x = x;
      this.y = y;
      this.rotation = rotation;
    } else {
      // Initialize new random piece.
      this.pieceNum = Math.floor(Math.random() * 7);
      this.x = 4; // "center" it.
      this.y = -2; // this will make the bottom line of the piece visible.
      this.rotation = 0;
    }
  };


  /**
   * Create a piece from a game snapshot representing a piece.
   */
  Tetris.Piece.fromSnapshot = function (snapshot) {
    var piece = snapshot;
    return new Tetris.Piece(piece.pieceNum, piece.x, piece.y, piece.rotation);
  };


  /**
   * Writes the current piece data into game.
   */

  Tetris.Piece.prototype.saveToBoard = function(board){
    var data = {
      pieceNum: this.pieceNum,
      rotation: this.rotation,
      x: this.x,
      y: this.y
    }
    var player = Player.findByAttribute('userid',board.playerRef.userid);

    player.piece = data;
    player.save();
  }


  Tetris.Piece.prototype.drop = function () {
    var p = new Tetris.Piece(this.pieceNum, this.x, this.y + 1, this.rotation);
    return p;
  };


  Tetris.Piece.prototype.rotate = function () {
    return new Tetris.Piece(this.pieceNum, this.x, this.y, (this.rotation + 1) % 4);
  };


  Tetris.Piece.prototype.moveLeft = function () {
    return new Tetris.Piece(this.pieceNum, this.x - 1, this.y, this.rotation);
  };


  Tetris.Piece.prototype.moveRight = function () {
    return new Tetris.Piece(this.pieceNum, this.x + 1, this.y, this.rotation);
  };



  /**
   * Manages joining the game, responding to keypresses, making the piece drop, etc.
   */
  Tetris.PlayingState = { Watching: 0, Joining: 1, Playing: 2 };
  Tetris.Controller = function (tetrisRef) {
    this.tetrisRef = tetrisRef;
    this.createBoards();

    this.tryToJoin();
  };


  Tetris.Controller.prototype.createBoards = function () {
    this.boards = [];
    var current = JSON.parse(localStorage['current']);
    var game =Game.first();
    var players = Player.all();
    for(var i = 0; i < 2; i++) {
      var playerRef = players[i];
      if (playerRef && playerRef.online) {
        //set current player
        if (playerRef.userid == current.userId) {
          this.myPlayerRef = playerRef;
          this.snapshot = playerRef.piece;
          this.myPlayerIndex = i;
        };

        var canvas = $('#canvas' + i).get(0);
        this.boards.push(new Tetris.Board(canvas, playerRef,i));
        display = playerRef.name;

        $('.player_name'+i).text(display);
        var avatar = playerRef.avatar.indexOf('http')== -1 ? 'https:'+playerRef.avatar : playerRef.avatar;
        $('#avatar'+i).attr('src',avatar);
        this.playercount = i+1;
      };
    }
  };

  /**
   * Try to join the game as the specified playerNum.
   */
  Tetris.Controller.prototype.tryToJoin = function(playerNum) {
    // join the current user
    var current = JSON.parse(localStorage['current']),self=this;

    for (var i = 0; i < self.boards.length; i++) {
      var board = self.boards[i];
      if (board.playerRef.userid == current.userId) {
        this.myBoard = board;
        this.myBoard.isMyBoard = true;
      };
    };

    self.playingState = Tetris.PlayingState.Playing;
    self.startPlaying();

  };


  /**
   * Once we've joined, enable controlling our player.
   */
  Tetris.Controller.prototype.startPlaying = function () {
    //set playing
    // var id = this.myPlayerRef.userid,
    //     player;
    if (this.myBoard) {
      this.myBoard.draw();
    };

    this.initializePiece();
    this.enableKeyboard();
    this.resetGravity();
  };


  Tetris.Controller.prototype.initializePiece = function() {
    this.fallingPiece = null;
    var self = this;
    // Watch for changes to the current piece (and initialize it if it's null).
    var snapshot = this.snapshot;
    if (snapshot === null || !snapshot) {
      console.log('brand new start...');
      var newPiece = new Tetris.Piece();
      this.fallingPiece = newPiece;
      newPiece.saveToBoard(this.myBoard);
    } else {
      console.log('resuming old game...');
      self.fallingPiece = Tetris.Piece.fromSnapshot(snapshot);
    }
  
  };


  /**
   * Sets up handlers for all keyboard commands.
   */
  Tetris.Controller.prototype.enableKeyboard = function () {
    var self = this;
    console.log('config keyboard...');
    $(document).on('keydown', function (evt) {
      if (self.fallingPiece === null)
        return; // piece isn't initialized yet.
      var game = Game.first();
      if (game.pause) {
        return;
      };
      var keyCode = evt.which;
      var key = { space:32, left:37, up:38, right:39, down:40 };

      var newPiece = null;
      switch (keyCode) {
        case key.left:
          newPiece = self.fallingPiece.moveLeft();
          break;
        case key.up:
          newPiece = self.fallingPiece.rotate();
          break;
        case key.right:
          newPiece = self.fallingPiece.moveRight();
          break;
        case key.down:
          newPiece = self.fallingPiece.drop();
          break;
        case key.space:
          // Drop as far as we can.
          var droppedPiece = self.fallingPiece;
          do {
            newPiece = droppedPiece;
            droppedPiece = droppedPiece.drop();
          } while (!self.myBoard.checkForPieceCollision(droppedPiece));
          break;
      }

      if (newPiece !== null) {
        // If the new piece position / rotation is valid, update self.fallingPiece.
        if (!self.myBoard.checkForPieceCollision(newPiece)) {
          // If the keypress moved the piece down, reset gravity.
          if (self.fallingPiece.y != newPiece.y) {
            self.resetGravity();
          }
          self.fallingPiece = newPiece;
          newPiece.saveToBoard(self.myBoard);
        }
        return false; // handled
      }

      return true;
    });
  };


  /**
   * Sets a timer to make the piece repeatedly drop after GRAVITY_DELAY ms.
   */
  Tetris.Controller.prototype.resetGravity = function () {
    // If there's a timer already active, clear it first.
    if (this.gravityIntervalId !== null) {
      clearInterval(this.gravityIntervalId);
    }
    var self = this;
  
    this.gravityIntervalId = setInterval(function() {
      self.doGravity(); 
    }, Tetris.GRAVITY_DELAY);

  };


  Tetris.Controller.prototype.doGravity = function () {
    if (this.fallingPiece === null)
      return; // piece isn't initialized yet.

    var newPiece = this.fallingPiece.drop();
    // If we've hit the bottom, add the (pre-drop) piece to the board and create a new piece.
    if (this.myBoard.checkForPieceCollision(newPiece)) {
      this.myBoard.addLandedPiece(this.fallingPiece);
      // Check for completed lines and if appropriate, push extra rows to our opponent.
      var completedRows = this.myBoard.removeCompletedRows();
      // var rowsToPush = (completedRows === 4) ? 4 : completedRows - 1;
      // if (rowsToPush > 0)
      //   this.opponentPlayerRef.child('extrarows').push(rowsToPush);

      // Create new piece (it'll be initialized to a random piece at the top of the screen).
      newPiece = new Tetris.Piece();

      // Is the board full?
      if (this.myBoard.checkForPieceCollision(newPiece)){
        var game = Game.first();
        game.over = 1;
        game.save();
        this.gameOver();
      }
    }

    newPiece.saveToBoard(this.myBoard);
    this.fallingPiece = newPiece;
    // this.myBoard.draw();
  };


  /**
   * Detect when our opponent pushes extra rows to us.
   */
  Tetris.Controller.prototype.watchForExtraRows = function () {
    var self = this;
    var extraRowsRef = this.myPlayerRef.child('extrarows');
    extraRowsRef.on('child_added', function(snapshot) {
      var rows = snapshot.val();
      extraRowsRef.child(snapshot.name()).remove();

      var overflow = self.myBoard.addJunkRows(rows);
      if (overflow)
        self.gameOver();

      // Also move piece up to avoid collisions.
      if (self.fallingPiece) {
        self.fallingPiece.y -= rows;
        self.fallingPiece.saveToBoard(self.myBoard);
      }
    });
  };


  /** 
   * Detect when our opponent restarts the game.
   */
  Tetris.Controller.prototype.watchForRestart = function () {
    var self = this;
    var restartRef = this.myPlayerRef.child('restart');
    restartRef.on('value', function(snap) {
      if (snap.val() === 1) {
        restartRef.set(0);
        self.resetMyBoardAndPiece();
      }
    });
  };


  Tetris.Controller.prototype.gameOver = function () {
    clearInterval(this.gravityIntervalId);
    //show scrores ,win or lose

  };

  Tetris.Controller.prototype.pause = function(){
    clearInterval(this.gravityIntervalId);
  }


  Tetris.Controller.prototype.restartGame = function () {
    // this.opponentPlayerRef.child('restart').set(1);
    this.resetMyBoardAndPiece();
    this.resetGravity();
    this.restarted = true;
  };

  Tetris.Controller.prototype.resume = function(){
    this.resetGravity();
  }

  Tetris.Controller.prototype.new_game = function(){
    for (var i =0; i <2; i++) {
      var context = $('#canvas'+i).get(0).getContext('2d');
      context.clearRect(0, 0, Tetris.BOARD_WIDTH_PIXELS, Tetris.BOARD_HEIGHT_PIXELS);
      $('.player_name'+i).text('Player'+(i+1));
      var avatar = 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/s128/photo.jpg';
      $('#avatar'+i).attr('src',avatar);
    };
  }

  Tetris.Controller.prototype.resetMyBoardAndPiece = function () {
    this.myBoard.clear();
    var newPiece = new Tetris.Piece();
    this.fallingPiece = newPiece;
    newPiece.saveToBoard(this.myBoard);
  };