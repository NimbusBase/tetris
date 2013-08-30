(()->
	# start game
	Nimbus.Share.get_me((me)->
		# init player
		console.log 'init myself'
		fill_player(me)

		player = Player.findByAttribute('email',me.email)
		new Tetris(player)
	)
)()