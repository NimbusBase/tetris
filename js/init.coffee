sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
window.realtime_update_callback = ()->
	console.log('updated...')
Player 	=  Nimbus.Model.setup('Player', ['userid','name','online','board','piece','restart'])
Player.prototype.child = (key)->
	key = key.toString()
	result = Player.all()
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
		# sync player,board
		collabrators = doc.getCollaborators()
		for one in collabrators
			if one.isMe
				localStorage['current'] = JSON.stringify(one);
				fill_player(one)
				me = one

		data = Player.findByAttribute('userid',me.userId)
		new Tetris.Controller(data)
		for player in Player.all()
			player.online = false
			for one in collabrators
				if one.userId is player.userid
					console.log('player '+player.name+' online')
					player.online=true 
				player.save()
				break
			player.save()

)

window.set_player = (data,target)->
	player = Player.findByAttribute('userid',data.userId)
	if !player
		player = Player.create()	
		player.email = data.email
		player.userid = data.userId
		player.name = data.displayName
	player.online = true
	player.save()

window.fill_player = (user)->
	players = Player.all()
	if players.length<2
		set_player(user)
		return
	for player in players
		if player.userid is user.userId
			player.online = true
			player.save()
			return
		else if !player.online
			player.destroy()
			set_player(user)
			return

	console.log 'waiting...'
		
$ ()->
	$('a#login').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
		false
	)

	$('#invite').click(()->
		email = $('#invite_email').val()

		# check email
		Nimbus.Share.add_share_user_real(email,(user)->
			fill_player(user)
		)
		false
	)
	true
