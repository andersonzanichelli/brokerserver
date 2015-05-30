var restify = require('restify');
var mongodb = require('mongodb');

var server = restify.createServer();
var uri = 'mongodb://broker:BrokerServer2015@ds063180.mongolab.com:63180/brokerserver';
var port = process.env.PORT || 9000;

var brokerserver = {};

brokerserver.types = function(req, res, next){
    var params = {
        "operation": brokerserver.find,
        "collection": 'types',
        "filter": {},
        "response": res,
        "callback": undefined
    };
    brokerserver.dbOperations(params);
    next();
};

brokerserver.email = function(req, res, next) {
    var params = {
        "operation": brokerserver.find,
        "collection": 'users',
        "filter": {email: req.params['email']},
        "response": res,
        "callback": undefined
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.signup = function(req, res, next) {
    var user = {
        "name": req.params['name'],
        "email": req.params['email'],
        "password": req.params['password']
    };

    var params = {
        "operation": brokerserver.find,
        "collection": 'users',
        "filter": {email: req.params['email']},
        "response": res,
        "callback": brokerserver.insert,
        "request": req,
        "user": user
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.insert = function(params){
    var collection = params.db.collection(params.collection);
    if(params.docs.length > 0) {
        params.response.json({"insert": false, "err": "Error, email used."});
        return;
    }
    try {
        collection.insert(params.user);
        params.response.json({"insert": true});
    } catch(ex) {
        params.response.json({"insert": false, "err": "Error on trying to save the user."});
    }
};

brokerserver.find = function(params) {
    var collection = params.db.collection(params.collection);
    collection.find(params.filter).toArray(function(err, docs) {
        if(err) {
            params.response.json(err);
            return;
        }

        if(params.callback){
            params.docs = docs;
            params.callback(params);
        } else
            params.response.json(docs);
    });
};

brokerserver.dbOperations = function(params) {
    mongodb.MongoClient.connect(uri, function(err, db) {
        if(err) throw err;

        params.db = db;
        params.operation(params);
    });
};

server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

server.get('/types', brokerserver.types);
server.get('/email/:email', brokerserver.email);
server.get('/signup/:name/:email/:password', brokerserver.signup);

server.listen(port, function() {
  console.log('%s listening at server port %s', 'BrokerServer', port);
});
