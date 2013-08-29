sync = 
	'GDrive':
		'key':''
		"scope": "https://www.googleapis.com/auth/drive"
		"app_name": "tetris"

Nimbus.Auth.setup(sync)
Board 	=  Nimbus.Model.setup('Board', ['owner','pieces','current'])
Player 	=  Nimbus.Model.setup('Player', ['id','name','role','online'])

Nimbus.Auth.set_app_ready(()->
	# check auth
	if Nimbus.Auth.authorized()
		# sync player,board
		Player.sync_all(()->
			console.log('players synced')
		)
	
)

$ ()->
	$('#login').click = ()->
		Nimbus.Auth.authorize('GDrive')

	$('#invite').click = ()->
		email = $('invite_email').val();

		# check email
		Nimbus.Client.GDrive.add_share_user_real(email,(user)->
			console.log user
			user.online = true
			# save user to player according to role
			players = Player.all();
			if user.role is 'owner'
				players[0]=user if players[0]
			else if user.role is 'writer'
				players[1]=user if players[1]
			
		)
		
