
sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"
	'synchronous': true

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
					delete localStorage['doc_id']
					location.reload()
				else
					alert "An Error happened: " + e.message
			else
				console.log 'Unknown error:'+e.message
		)
		return
	else
		sync_players_on_callback()
	return

)

# sync_on_start
window.sync_players_on_callback = ()->
	# check auth
	if Nimbus.Auth.authorized()
		url = location.pathname+'?'+c_file.id
		window.history.pushState("Game Started", "Nimbus Tetris", url)
		localStorage['doc_id'] = c_file.id
		collabrators = doc.getCollaborators()
		for one in collabrators
			if one.isMe
				localStorage['current'] = JSON.stringify(one)
				break
		process_game_data()
		$('.mask').fadeOut()
window.list_games = ()->
	html = ''
	profile = ''
	current = JSON.parse(localStorage['current'])
	$('.panel .profile img').attr('src',current.photoUrl)
	$('.panel .profile span').text(current.displayName)
	for file in app_files
		is_owner = file.owners[0].displayName is current.displayName
		html += '<li class="game"><a href="#" data-id="' + file.id + '">' + file.owners[0].displayName + '</a>'
		if file.id == c_file.id
			html +='</li>'
			continue
		html += '<p class="delete" data-owner="'+is_owner+'" data-id="'+file.id+'">X</p></li>'
	$('.panel .list ul').html(html)

window.process_game_data = ()->
	Game.sync_all(()->
		Player.sync_all(()->
			# check all player status
			check_online()
			# join current user
			join_me()
		)
	)

window.join_me = ()->
	me = JSON.parse(localStorage['current'])
	
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
		one  = Player.create(player)
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
				one  = Player.create(player)
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
		try
			player.save()
		catch e
			alert(e.n)
			location.reload()
				
	game.save()
window.erase_indexedDB = (callback)->
	indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB
	req = indexedDB.open('tetris',1)
	req.onsuccess = (evt)->
		db = evt.target.result
		tx = db.transaction('models', "readwrite")
		store = tx.objectStore('models')
		store.put(
			key: 'Game'
			data: ''
		)
		store.put(
			key:'Player'
			data: ''
		)
		callback() if callback
	return

window.remove_file = (file_id,evt)->
	#delete file
	if $(evt.target).data('owner')
		Nimbus.Client.GDrive.deleteFile(file_id)
		console.log 'file deleted'
		$(evt.target).parent('li').slideUp(()->
			$(this).remove()
		)
	else
		current = JSON.parse(localStorage['current'])
		if current.permissionId
			Nimbus.Share.remove_share_user_real(current.permissionId,()->
				console.log 'file removed'
				$(evt.target).parent('li').slideUp(()->
					$(this).remove()
				)
			,file_id)
		else
			Nimbus.Share.get_me((me)->
				current.permissionId = me.id
				localStorage['current'] = JSON.stringify(current)
				Nimbus.Share.remove_share_user_real(current.permissionId,()->
					console.log 'file removed'
					$(evt.target).parent('li').slideUp(()->
						$(this).remove()
					)
				,file_id)
			)

$ ()->
	$('.panel .list').on('click',(evt)->
		file_id = $(evt.target).data('id')
		if $(evt.target)[0].tagName is 'P' and c_file.id isnt file_id
			# remove file
			remove_file(file_id,evt)
		else if $(evt.target)[0].tagName is 'A' and c_file.id isnt file_id
			erase_indexedDB(()->
				window.controllers.new_game() if window.controllers
				try
					doc.close()
				catch e
					console.log e
				Nimbus.Client.GDrive.switch_to_app_file_real(file_id,()->
					url = location.pathname+'?'+c_file.id
					window.history.pushState("New Game Loaded", "Nimbus Tetris", url)
					localStorage['doc_id'] = c_file.id
				)
				
				$('.mask').fadeOut()
				return
			)
		else
			$('.mask').fadeOut() if window.controllers
		false
	)
	# login user
	$('#login_btn').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
		false
	)
	# start a new game
	$('#new_game').click(()->
		controllers.new_game() if window.controllers
		window.new_game = true
		# close doc before contiue
		erase_indexedDB(()->
			Nimbus.Client.GDrive.insertFile("", Nimbus.Auth.app_name, 'application/vnd.google-apps.drive-sdk', null, (data)->
				log("finished insertFile", data);
				window.c_file = data;
				if Nimbus.dictModel?
					for k, v of Nimbus.dictModel
						v.records = {}
				try
					doc.close()
				catch e
					console.log e
				
				gapi.drive.realtime.load(data.id, onFileLoaded, initializeModel);
			)
			return
		)
		false
	)
	# change file
	$('a#choose_file').click(()->
		# delete file is being used
		Nimbus.Client.GDrive.getMetadataList("title = '" + Nimbus.Auth.app_name + "' and mimeType != 'application/vnd.google-apps.folder'", (data)->
			list = []
			for file in data.items
				if file.mimeType.indexOf("application/vnd.google-apps.drive-sdk") >= 0
					list.push(file)

			if list.length and list
				window.app_files = list
				list_games()
				$('.mask .panel').show()
				$('#login').hide()
				$('.mask').fadeIn()
			else
				startRealtime()
		)
		
		false
	)
	# logout user
	$('a#logout').click(()->
		erase_indexedDB(()->
			Nimbus.Auth.logout()
			location.href = location.origin+location.pathname
		)
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
		Nimbus.Share.add_share_user_real(email)
		ios.notify(
			title:'Success'
			message:'Copy the url and send it to your friend'
		)
		false
	)
	true
