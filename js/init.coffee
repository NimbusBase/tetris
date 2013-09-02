sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

delete localStorage['Player']
Nimbus.Auth.setup(sync)
window.realtime_update_callback = ()->
	console.log('updated...')
	online = Player.findAllByAttribute('online',true)
	restart = Player.findAllByAttribute('restart',1)
	over = Player.findAllByAttribute('over',1)
	boards = controllers.boards
	# do the drawing
	for board in boards
		if board and board.playerRef
			board.snapshot = board.playerRef
			board.draw()
	# restart the game
	if restart.length
		for one in restart
			one.restart = 0
			one.save()

		controllers.myBoard.clear()
		controllers.resetGravity()
	# game over
	if over.length
		for one in over
			one.over = 0
			one.save()

		for player in players
			if player.over!=1
				log 'player '+player.name+' win'
				controllers.pause()
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

		
Player = Nimbus.Model.setup('Player', ['userid', 'name', 'online', 'board', 'piece', 'avatar','restart','state','over'])
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
	# check auth
	if Nimbus.Auth.authorized()
		$('#login').text('Logout')
		$('.mask').hide()
		Player.sync_all()
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
	else if player.length is 2
		player = Player.findByAttribute('userid',userId)
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
	$('a#login').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
		false
	)

	$('a#logout').click(()->
		controllers.pause()
		Nimbus.Auth.logout()
		location.reload()
		false
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
		)
		false
	)
	true
