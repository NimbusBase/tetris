sync = 
	'GDrive':
		'key':'361504558285.apps.googleusercontent.com'
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
Player 	=  Nimbus.Model.setup('Player', ['userid','name','role','online','board','piece','restart'])
Player.prototype.child = (key)->
	key = key.toString()
	players = Player.all()
	keys = key.split('/')
	i=0
	while i<keys.length
		result = result[keys[i]]
	result
Nimbus.Auth.set_app_ready(()->
	# check auth
	if Nimbus.Auth.authorized()
		Nimbus.Share.get_me((me)->
			me.role = 'owner'
			fill_player(me)
			player = Player.findByAttribute('userid', me.id)
			new Tetris.Controller(player)
		)
		# sync player,board
		Player.sync_all(()->
			console.log('players synced')
		)
	
)

window.set_player = (data)->
	player = Player.findByAttribute('userid',data.id)
	if !player
		player = Player.create()	
		player.email = data.email
		player.role = data.role
		player.userid = data.id
		player.name = data.name
	player.online = true
	player.save()

window.fill_player = (user)->
	user.online = true
	# save user to player according to role
	if user.role is 'owner'
		set_player(user)
	else if user.role is 'writer'
		writer = Player.findByAttribute('role','writer')
		set_player(user) if !writer or !writer.online
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
