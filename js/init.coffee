sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
Player 	=  Nimbus.Model.setup('Player', ['id','name','role','online','board','piece','restart'])

Nimbus.Auth.set_app_ready(()->
	# check auth
	if Nimbus.Auth.authorized()
		Nimbus.Share.get_me((me)->
			# init player
			console.log 'init myself'
			fill_player(me)

			player = Player.findByAttribute('email',me.email)
			new Tetris(player)
		)
		# sync player,board
		Player.sync_all(()->
			console.log('players synced')
		)
	
)

window.set_player = (player,data)->
	player.email = data.email
	player.role = data.role
	player.id = data.id
	player.name = data.name

window.fill_player = (user)->
	console.log user
	user.online = true
	# save user to player according to role
	players = Player.all();
	if user.role is 'owner'
		set_player(players[0],user) if players[0]
	else if user.role is 'writer'
		set_player(players[1],user) if players[1]
	else
		console.log('error'+JSON.stringify(user))

$ ()->
	console.log 'ready'

	$('a#login').click(()->
		console.log 'auth start...'
		Nimbus.Auth.authorize('GDrive')
	)

	$('#invite').click(()->
		email = $('invite_email').val();

		# check email
		Nimbus.Share.add_share_user_real(email,(user)->
			fill_player(user)
		)
	)
	true
