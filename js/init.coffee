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
	current = JSON.parse(localStorage['current'])
	me = Player.findByAttribute('userid',current.userId)
	online = Player.findAllByAttribut('online',true)
	# do the drawing
	for board in boards
		if board and board.playerRef
			player = Player.findByAttribute('userid',board.playerRef.userid)
			board.snapshot = player.piece
			board.draw()

	if game.restart0 or game.restart1
		if game['restart'+me.index]
			game['restart'+me.index] =0
			game.save()
			controllers.restartGame()
			$('#pause').text('Pause')
	
	if game.resume
		if !isLocal
			game.resume = 0
			game.save()
		controllers.resume()
		$("#pause").text('Pause')
	if game.pause
		controller.pause()
		$('#pause').text('Resume')

	# if controllers.boards.length isnt online.length
		#login new user

Game = Nimbus.Model.setup('Game',['player0','player1','state','players','restart','restart0','restart1','pause','resume','over','owner'])
Player = Nimbus.Model.setup('Player',['name','userid','avatar','piece','index','board','online'])

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
			Player.sync_all(()->
				me = {}
				collabrators = doc.getCollaborators()
				for one in collabrators
					if one.isMe
						localStorage['current'] = JSON.stringify(one);
						me = one
				game = Game.first()
				players = Player.all()

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
					game.state = 2
					game.restart = 0
					game.over = 0
					game.pause = 0
					game.resum = 0
					game.players = 1

					# add user 
					one  = Player.create()
					one.name = player.name
					one.userid = player.userid
					one.avatar = player.avatar
					one.piece = player.piece
					one.board = player.board
					one.online = true
					one.index = i
					joined = true
					one.save()
				else
					check_online()
					joined = false
					for i in [0...2]
						continue if !joined
						one = players[i]
						if one and one.userid is player.userid
							one.online = true
							joined = true
						else if !one
							one  = Player.create()
							one.name = player.name
							one.userid = player.userid
							one.avatar = player.avatar
							one.piece = player.piece
							one.board = player.board
							one.online = true
							one.index = i
							joined = true
						one.save()
				if !joined
					console.log 'waiting...'
				game.restart0 = 0		
				game.restart1 = 0		
				game.save()
				
				window.controllers = new Tetris.Controller(game)
			)
			
		)
		
window.check_online = ()->
	original = game = Game.first()
	return if !game
	players = Player.all()
	collabrators = doc.getCollaborators()
	online = 0
	for i in [0...2]
		player = players[i]
		continue if !player
		player.online = false
		for one in collabrators
			if player
				if player.userid is one.userId
					player.online = true
					online++
		player.save()

	game.players = online
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
			$(this).text('Resume')
		else if $(this).text() is 'Resume'
			# ...game = Game.first()
			game.pause = 0
			game.resume = 1
			game.save()
			$(this).text('Pause')
		false
	)

	$('#restart').click(()->
		game = Game.first()
		game.restart0 = 1
		game.restart1 = 1
		game.resume = 0
		game.pause = 0
		game.save()
		$('#pause').text('Pause')
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
