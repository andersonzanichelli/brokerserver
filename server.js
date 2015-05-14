var restify = require('restify');
var mongodb = require('mongodb');

var server = restify.createServer();
var uri = 'mongodb://broker:BrokerServer2015@ds063180.mongolab.com:63180/brokerserver';
var port = process.env.PORT || 9000;

var brokerserver = {};

brokerserver.types = function(req, res, next){
    console.error('Client connected at ' + new Date());
    brokerserver.consulta('types', res, {});
    next();
};

brokerserver.email = function(req, res, next) {
    brokerserver.consulta('users', res, {email: req.params['email']});
    next();
};

brokerserver.consulta = function(collections, res, filter) {
    mongodb.MongoClient.connect(uri, function(err, db) {
        if(err) throw err;

        var collection = db.collection(collections);
        collection.find(filter).toArray(function(err, docs) {
            if(err) {
                res.json(err);
                return;
            }
            res.json(docs);
        });
    });
};

server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

server.get('/types', brokerserver.types);
server.get('/email/:email', brokerserver.email);

server.listen(port, function() {
  console.log('%s listening at port %s', 'BrokerServer', port);
});
