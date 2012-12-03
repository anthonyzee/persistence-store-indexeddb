var strVcap = process.env.VCAP_SERVICES || '{"mysql-5.1":[{"name":"mysql-d70a3","label":"mysql-5.1","plan":"free","tags":["mysql","mysql-5.1","relational"],"credentials":{"name":"todoappdb","hostname":"localhost","host":"localhost","port":3306,"user":"root","username":"root","password":"MyNewPass"}}]}';
var jsonVcap = JSON.parse(strVcap);

//persistence declaration
var persistence = require('persistencejs/lib/persistence').persistence;
var persistenceStore = require('persistencejs/lib/persistence.store.mysql');
var persistenceSync = require('persistencejs/lib/persistence.sync.server');

persistenceStore.config(persistence, jsonVcap["mysql-5.1"][0].credentials.host, jsonVcap["mysql-5.1"][0].credentials.port, jsonVcap["mysql-5.1"][0].credentials.name, jsonVcap["mysql-5.1"][0].credentials.username, jsonVcap["mysql-5.1"][0].credentials.password);
persistenceSync.config(persistence); 

//init sync
var Todo = persistence.define('todo', {
	content: 'TEXT',
	done: 'BOOL'
});
Todo.enableSync(); //this create table with sync attribute

//nodejs module declaration
var express = require("express");
var app = express();

//init express
app.use(express.static(__dirname));
app.use(express.bodyParser());
app.use(function(req, res, next) {
	//res.setHeader("Access-Control-Allow-Origin", "*");
	//res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	var end = res.end;

	req.conn = persistenceStore.getSession();
	req.conn.schemaSync();
	res.end = function() {
		req.conn.close();
		end.apply(res, arguments);
	};
	req.conn.transaction(function(tx) {
			req.tx = tx;
			next();
		});
});

app.get('/todoUpdates',  function(req, res) {
	console.log(" - get /todoUpdates - " + req.params.uid);
	persistenceSync.pushUpdates(req.conn, req.tx, Todo, req.query.since, function(updates) {
		res.send(updates);
	});
});

app.post('/todoUpdates',  function(req, res) {
	console.log(" - post /todoUpdates - " + req.params.uid);
	persistenceSync.receiveUpdates(req.conn, req.tx, Todo, req.body, function(result) {
		res.send(result);
	});
});

app.get('/markAllDone', function(req, res) {
	Todo.all(req.conn).list(req.tx, function(todo) {
			todo.forEach(function(todo) {
					todo.done = true;
				});
			req.conn.flush(req.tx, function() {
					res.send({status: 'ok'});
				});
		});
});

app.get('/markAllUndone', function(req, res) {
	Todo.all(req.conn).list(req.tx, function(todo) {
			todo.forEach(function(todo) {
					todo.done = false;
				});
			req.conn.flush(req.tx, function() {
					res.send({status: 'ok'});
				});
		});
});

app.listen(process.env.VCAP_APP_PORT || 3300);
console.log('-- Server running at http://127.0.0.1:3300/ --');