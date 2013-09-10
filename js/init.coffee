
sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
Game = Nimbus.Model.setup('Game',['player0','player1','state','players','restart','restart0','restart1','pause','resume','over','owner'])
Player = Nimbus.Model.setup('Player',['name','userid','avatar','piece','index','board','online'])

if location.search and location.search.substr(1)
	localStorage['doc_id'] = location.search.substr(1)
	Game.destroyAll()
	Player.destroyAll()
	location.href = location.origin+location.pathname

window.realtime_update_handler = (event,obj,isLocal)->
	if !window.controllers
		return
	# stats
	game = Game.first()
	boards = controllers.boards
	current = JSON.parse(localStorage['current'])
	me = Player.findByAttribute('userid',current.userId)
	online = Player.findAllByAttribute('online',true)
	return unless game
	# do the drawing
	for board in boards
		if board and board.playerRef
			player = Player.findByAttribute('userid',board.playerRef.userid)
			board.snapshot = player.piece
			board.draw()

	if game['restart' + (1-controllers.myPlayerIndex)]
		console.log('restart' + (1-controllers.myPlayerIndex))
		game['restart' + (1-controllers.myPlayerIndex)] = 0
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
		controllers.pause()
		$('#pause').text('Resume')

	if controllers.boards.length < online.length
		#login new user
		console.log 'will add the other user to boards'
		index = 1-controllers.myPlayerIndex
		canvas = $('#canvas' + index).get(0)
		player = Player.all()[index]
		board = new Tetris.Board(canvas,player,index)
		$('.player_name'+index).text(player.name)
		controllers.boards.push(board)

window.collaborator_left_callback = (evt)->
	# process user left event 
	user = evt.collaborator
	players = Player.all()
	for player in players
		if player.userid is user.userId
			player.online = false
			player.save()

			# stop the board
			if controllers.boards
				for board in controllers.boards
					if board.playerRef.userid is player.userid
						index = controllers.boards.indexOf(board)
						controllers.boards.splice(index,1)

			break


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
		$('.mask').hide()

		Game.sync_all(()->
			Player.sync_all(()->
				# check all player status
				check_online()
				# join current user
				join_me()
			)
			
		)
window.join_me = ()->
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
		game.restart0 = 0
		game.restart1 = 0
		game.over = 0
		game.pause = 0
		game.resume = 0
		game.players = 1

		# add user 
		one  = Player.create()
		one.name = player.name
		one.userid = player.userid
		one.avatar = player.avatar
		one.piece = player.piece
		one.board = player.board
		one.online = true
		one.index = 0
		joined = true
		one.save()
	else
		joined = false
		for i in [0...2]
			continue if joined
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
		# still not joined ,check offline user
		if !joined
			for i in [0...2]
				one = players[i]
				if !one.online
					one.name = player.name
					one.userid = player.userid
					one.avatar = player.avatar
					one.piece = player.piece
					one.board = player.board
					one.online = true
					one.index = i
					one.save()
					joined = true
					break
	# not available ,set waiting 
	if !joined
		console.log 'waiting...'
	game.restart0 = 0		
	game.restart1 = 0		
	game.save()
	
	window.controllers = new Tetris.Controller(game)		
window.check_online = (clear)->
	original = game = Game.first()
	return if !game
	players = Player.all()
	collabrators = doc.getCollaborators()
	for i in [0...2]
		player = players[i]
		continue if !player
		player.online = false
		for one in collabrators
			if player
				if player.userid is one.userId
					player.online = true
		if !player.online and clear
			player.board = []
			player.piece = null
		player.save()
				
	game.save()
	
$ ()->
	# login user
	$('a#login').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
		false
	)
	# start a new game
	$('a#new_game').click(()->
		# delete file is being used
		controllers.pause()
		controllers.boards = []
		controllers.new_game()
		Game.destroyAll()
		Player.destroyAll()

		if c_file.userPermission.role is 'writer'
			delete localStorage['doc_id']
			Nimbus.Share.get_current_user((user)->
				Nimbus.Share.get_shared_users_real((res)->
					for item in res
						if item.id is user.id
							Nimbus.Share.remove_share_user_real(item.id,()->
								startRealtime()
							)
							break
				)
			)
		else
			startRealtime()
		
		false
	)
	# logout user
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
			game.pause = 0
			game.resume = 1
			game.save()
			$(this).text('Pause')
		false
	)

	$('#restart').click(()->
		check_online(true)
		game = Game.first()
		game['restart'+controllers.myPlayerIndex] = 1
		game.resume = 0
		game.pause = 0
		game.over = 0
		game.save()
		$('#pause').text('Pause')
		controllers.restartGame()
		false
	)

	$('#invite').click(()->
		email = $('#invite_email').val()
		# check email
		Nimbus.Share.add_share_user_real(email,(user)->
			console.log('file shared')
			id = if !localStorage['doc_id'] then  window.c_file.id else localStorage['doc_id']
			link = location.origin + location.pathname + '?'+ id
			$.prompt('Copy and send this link to your friend: ' + link)
		)
		false
	)
	true
