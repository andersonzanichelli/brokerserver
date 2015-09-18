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
        "callback": brokerserver.saveuser,
        "request": req,
        "user": user
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.saveuser = function(params){
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

brokerserver.login = function(req, res, next) {
    var user = {
        "email": req.params['email'],
        "password": req.params['password']
    };

    console.log('User trying login...');

    var params = {
        "operation": brokerserver.find,
        "collection": 'users',
        "filter": user,
        "response": res,
        "callback": brokerserver.logged,
        "request": req
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.logged = function(params) {
    console.log('Going to answer...');
    if(params.docs.length > 0) {
        console.log('User logged!');
        params.response.json({"logged": true});
        return;
    }

    params.response.json({"logged": false});
};

brokerserver.find = function(params) {
    console.log('Searching something...');
    var collection = params.db.collection(params.collection);
    collection.find(params.filter).toArray(function(err, docs) {
        if(err) {
            params.response.json(err);
            return;
        }

        if(params.callback){
            params.docs = docs;
            console.log('Yes, I have found!');
            params.callback(params);
        } else
            params.response.json(docs);
    });
};

brokerserver.beforeSavePreferences = function(req, res, next){
    //var config = {
    //    "name": req.params['name'],
    //    "email": req.params['email'],
    //    "password": req.params['password']
    //};

    console.log("req");
    console.log(req);
    console.log("resp");
    console.log(res);

    var params = {
        "operation": brokerserver.saveConfig,
        "collection": 'configuration',
        "response": res,
        "request": req,
        "config": {}
    };

  //  brokerserver.dbOperations(params);
    next();
};

brokerserver.savePreferences = function(){
    var collection = params.db.collection(params.collection);

    try {
        collection.insert(params.config);
        params.response.json({"insert": true});
    } catch(ex) {
        params.response.json({"insert": false, "err": "Error on trying to save the configuration."});
    }
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
server.get('/login/:email/:password', brokerserver.login);
server.get('/savePreferences', brokerserver.beforeSavePreferences);

server.listen(port, function() {
  console.log('%s listening at server port %s', 'BrokerServer', port);
});
