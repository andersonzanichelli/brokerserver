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
    var params = {
        "operation": brokerserver.find,
        "collection": 'users',
        "filter": {email: req.params['email']},
        "response": res,
        "callback": brokerserver.insert,
        "request": req
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.insert = function(params){
    console.log(params.request);
    var document = params.db.collection.insert(params.request.params);
    console.log(document);

    params.response.json({"_id": 1});
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
server.post('/signup', brokerserver.signup);

server.listen(port, function() {
  console.log('%s listening at server port %s', 'BrokerServer', port);
});
