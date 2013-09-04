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
	online = Player.findAllByAttribute('online',true)
	restart = Player.findAllByAttribute('restart',1)
	over = Player.findAllByAttribute('over',1)
	boards = controllers.boards
	pause = Player.findAllByAttribute('pause',1)
	resume = Player.findAllByAttribute('resume',1)

	# do the drawing
	for board in boards
		if board and board.playerRef
			board.snapshot = board.playerRef
			board.draw()
	# restart the game
	if restart.length
		for one in restart
			if one.restart and !isLocal
				one.restart = 0
				one.save()

		controllers.myBoard.clear()
		controllers.resetGravity()
	# game over
	if over.length
		controllers.pause()
		if controllers.playercount is 2 and over.length is 2
			console.log 'even..'
		else if controllers.playercount is 2
			for player in players
				if !player.over
					log 'player '+player.name+' win'
					break;			
		else
			console.log 'game over'
		for one in over
			if one.over and !isLocal
				one.over = 0
				one.save()
		return

	# watch for pause
	if pause.length
		controllers.pause()
	
	# watch for resume
	if resume.length
		controllers.resume()
		if !isLocal
			for one in resume
				one.resume = 0
				one.pause = 0
				one.save()
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

		
Player = Nimbus.Model.setup('Player', ['userid', 'name', 'online', 'board', 'piece', 'avatar','restart','pause','resume','state','over'])
Player.prototype.child = (key)->
	key = key.toString()
	result = this
	keys = key.split('/')
	i=0
	while i<keys.length
		result = result[keys[i]]
		i++
	result
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
		Player.sync_all(()->
			$('#login').text('Logout')
			$('.mask').hide()
			# sync player,board
			collabrators = doc.getCollaborators()
			for one in collabrators
				if one.isMe
					localStorage['current'] = JSON.stringify(one);
					fill_player(one)
					me = one

			data = Player.findByAttribute('userid',me.userId)

			for player in Player.all()
				player.online = false
				player.state = 0;
				for one in collabrators
					if one.userId is player.userid
						console.log('player '+player.name+' online')
						player.online=true 
					player.over = 0
					player.restart = 0

				player.save()
			window.controllers = new Tetris.Controller(Player.all())
		)
		


window.set_player = (data,target)->
	player = Player.findByAttribute('userid',data.userId)
	if !player
		player = Player.create()
		player.userid = data.userId
		player.name = data.displayName
		player.avatar = data.photoUrl
	player.online = true
	player.state = 1
	player.restart = 0
	player.over = 0
	player.avatar = data.photoUrl
	player.save()

window.fill_player = (user)->
	players = Player.all()
	if players.length<2
		set_player(user)
		return
	else if players.length is 2
		player = Player.findByAttribute('userid',user.userId)
		if player
			player.online = true
			player.avatar = user.photoUrl
			player.state = 1
			player.restart = 0
			player.over = 0
			player.save()
			return
		else
			offline = Player.findByAttribute('offline',false)
			if offline
				offline.destroy()
				set_player(user)
				return

	console.log 'waiting...'
		
$ ()->
	if location.search and location.search.substr(1) and localStorage['doc_id']!=location.search.substr(1)
		localStorage['doc_id'] = location.search.substr(1)
		location.href = location.origin+location.pathname

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
		me = Player.findByAttribute('userid',controllers.myPlayerRef.userid)

		if $(this).text() is 'Pause'
			me.pause = 1
			me.save()
			controllers.pause()
			$(this).text('Resume')
		else
			me.resume = 1
			me.save()
			controllers.resume()
			$(this).text('Pause')
	)

	$('#restart').click(()->
		id = controllers.myPlayerRef.userid
		player = Player.findByAttribute('userid',id)
		player.restart = 1
		player.save()
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
