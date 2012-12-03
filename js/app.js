var store = new Lawnchair({name:'testing1'}, function(store) {
		
		// Create an object
		var me = {key:'brian'};

		// Save it
		store.save(me);

		// Access it later... Yes even after a page refresh!
		store.get('brian', function(me) {
				console.log(me);
		});
});
