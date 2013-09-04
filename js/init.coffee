if location.search and location.search.substr(1)
	localStorage['doc_id'] = location.search.substr(1)
	location.href = location.origin+location.pathname

sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
window.realtime_update_handler = (event,obj,isLocal)->
	if !window.controllers
		return
	# stats
	game = Game.first()
	boards = controllers.boards
	# do the drawing
	for board in boards
		if board and board.playerRef
			board.snapshot = board.playerRef
			board.draw()
	# restart the game
	if game.restart
		controllers.myBoard.clear()
		if !isLocal
			game.restart = 0
			game.over = 0
			game.pause = 0
			game.resume = 0
			game.save()
		
		controllers.restartGame()
		return
	# game over
	if game.over
		controllers.pause()
		return

	# watch for pause
	if game.pause
		$('#pause').text('Resume')
		controllers.pause()
	
	# watch for resume
	if game.resume
		controllers.resume()
		$('#pause').text('Pause')
		if !isLocal
			game.restart = 0
			game.over = 0
			game.pause = 0
			game.resume = 0
			game.save()
		return

	# watch for join
	if controllers.playercount!=online.length and controllers.playercount<2
		join = Player.findByAttribute('state',1)
		if join
			canvas = $('#canvas'+controllers.playercount).get(0)
			boards.push(new Tetris.Board(canvas,join))

			if join.avatar.indexOf('http') is -1 
				avatar = 'https:'+join.avatar 
			else
				avatar = join.avatar
			$('#avatar'+controllers.playercount).attr('src',avatar)
			$('.player_name'+controllers.playercount).text(join.name)
			controllers.playercount++

Game = Nimbus.Model.setup('Game',['player0','player1','state','players','restart','pause','resume','over','owner'])

Nimbus.Auth.set_app_ready(()->
	search = localStorage['doc_id']
	if search and search isnt c_file.id
		load_new_file(search,()->
			console.log 'loading new file'
			sync_players_on_callback()
		,(e)->
			if e.type is gapi.drive.realtime.ErrorType.TOKEN_REFRESH_REQUIRED
				authorizer.authorize()
			else if e.type is gapi.drive.realtime.ErrorType.CLIENT_ERROR
				if localStorage['doc_id']
					localStorage.clear()
					location.reload()
				else
					alert "An Error happened: " + e.message
			else
				console.log 'Unknown error:'+e.message

		)
		return
	else
		sync_players_on_callback()
	
)

# sync_on_start
window.sync_players_on_callback = ()->
	# check auth
	if Nimbus.Auth.authorized()
		$('#login').text('Logout')
		$('.mask').hide()

		Game.sync_all(()->
			check_online()
			me = {}
			collabrators = doc.getCollaborators()
			for one in collabrators
				if one.isMe
					localStorage['current'] = JSON.stringify(one);
					me = one
			game = Game.first()
			player = 
				'name' : me.displayName
				'userid':me.userId
				'avatar':me.photoUrl
				'board' : []
				'piece' : null
				'online': true
			if !game
				game = Game.create()
				game.owner = me.userId
				game.player0 = player
				game.state = 2
				game.restart = 0
				game.over = 0
				game.pause = 0
				game.resum = 0
				game.save()
			else
				if !game.player0 or !game.player0.online
					# join as player0
					game.player0 = player
				else if !game.player1 or !game.player1.online
					# join as player1
					game.player1 = player
				else
					console.log 'waiting'

			window.controllers = new Tetris.Controller(Game.first())
		)
		
window.check_online = ()->
	original = game = Game.first()
	collabrators = doc.getCollaborators()
	for one in collabrators
		if game.player0
			if !game.player0.online and game.player0.userid is one.userId
				game.player0.online = true
		if game.player1
			if !game.player1.online and game.player1.userid is one.userId
				game.player1.online = true
		
	if original isnt game
		game.save()
	
	
$ ()->

	$('a#login').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
		false
	)

	$('a#logout').click(()->
		Nimbus.Auth.logout()
		location.reload()
		false
	)

	$('#pause').click(()->
		game = Game.first()
		if $(this).text() is 'Pause'
			game.pause = 1
			game.resume = 0
			game.save()
		else if $(this).text() is 'Resume'
			# ...game = Game.first()
			game.pause = 0
			game.resume = 1
			game.save()
		false
	)

	$('#restart').click(()->
		game = Game.first()
		game.restart = 1
		game.resume = 0
		game.pause = 0
		game.save()
		false
	)

	$('#invite').click(()->
		email = $('#invite_email').val()

		# check email
		Nimbus.Share.add_share_user_real(email,(user)->
			console.log('file shared')
			link = location.origin + location.pathname + '?'+ window.c_file.id
			$.prompt('Copy and send this link to your friend: ' + link)
		)
		false
	)
	true
