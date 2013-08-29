(()->
	#board area
	Tetris.width = 10
	Tetris.height = 20
	Tetris.gravity = 300
	Tetris.block_pixel = 25
	# blocks

	Tetris.colors =
		'X': 'black'
		'b': 'cyan'
		'B': 'blue'
		'O': 'orange'
		'Y': 'yellow'
		'G': 'green'
		'P': '#9370D8'
		'R': 'red'

	# pieces array with rotation configuration
	Tetris.pieces = []
	for i in [0...4]
		Tetris.PIECES[i] = []

	Tetris.pieces[0][0] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ]
	Tetris.pieces[0][1] = [ "    ",   "B   ",   "  O ",   " YY ",   " GG ",   " P  ",   "RR  " ]
	Tetris.pieces[0][2] = [ "bbbb",   "BBB ",   "OOO ",   " YY ",   "GG  ",   "PPP ",   " RR " ]
	Tetris.pieces[0][3] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ]
	Tetris.pieces[1][0] = [ " b  ",   "    ",   "    ",   "    ",   "    ",   "    ",   "  R " ]
	Tetris.pieces[1][1] = [ " b  ",   " B  ",   "OO  ",   " YY ",   " G  ",   " P  ",   " RR " ]
	Tetris.pieces[1][2] = [ " b  ",   " B  ",   " O  ",   " YY ",   " GG ",   " PP ",   " R  " ]
	Tetris.pieces[1][3] = [ " b  ",   "BB  ",   " O  ",   "    ",   "  G ",   " P  ",   "    " ]
	Tetris.pieces[2][0] = [ "    ",   "    ",   "    ",   "    ",   "    ",   "    ",   "    " ]
	Tetris.pieces[2][1] = [ "    ",   "    ",   "    ",   " YY ",   " GG ",   "    ",   "RR  " ]
	Tetris.pieces[2][2] = [ "bbbb",   "BBB ",   "OOO ",   " YY ",   "GG  ",   "PPP ",   " RR " ]
	Tetris.pieces[2][3] = [ "    ",   "  B ",   "O   ",   "    ",   "    ",   " P  ",   "    " ]
	Tetris.pieces[3][0] = [ " b  ",   "    ",   "    ",   "    ",   "    ",   "    ",   "  R " ]
	Tetris.pieces[3][1] = [ " b  ",   " BB ",   " O  ",   " YY ",   " G  ",   " P  ",   " RR " ]
	Tetris.pieces[3][2] = [ " b  ",   " B  ",   " O  ",   " YY ",   " GG ",   "PP  ",   " R  " ]
	Tetris.pieces[3][3] = [ " b  ",   " B  ",   " OO ",   "    ",   "  G ",   " P  ",   "    " ]

	# tetris board 
	Tetris.board = (canvas,player)->
		self = @
		this.context = canvas.getContext('2d')

	Tetris.board.prototype.draw = ()->


	#draw single piece
	Tetris.board.prototype.drawPiece =(piece)->


	#check if the piece can fit the grid below
	Tetris.board.prototype.checkCollision = (piece)->


	# clear canvas
	Tetris.board.prototype.clear = ()->


	# current falling piece
	Tetris.current = (num,x,y,rotation)->



)