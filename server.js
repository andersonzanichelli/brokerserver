var restify = require('restify');
var mongodb = require('mongodb');

var server = restify.createServer();
var uri = 'mongodb://broker:BrokerServer2015@ds063180.mongolab.com:63180/brokerserver';

var brokerserver = {};

brokerserver.types = function(req, res, next){
    console.error('Client connected at ' + new Date());
    brokerserver.consulta('types', res);
    next();
};

brokerserver.consulta = function(collections, res) {
    mongodb.MongoClient.connect(uri, function(err, db) {
        if(err) throw err;

        var collection = db.collection(collections);
        collection.find().toArray(function(err, docs) {
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

server.listen(9000, function() {
  console.log('%s listening at %s', server.name, server.url);
});
