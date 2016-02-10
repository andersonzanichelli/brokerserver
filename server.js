var restify = require('restify');
var mongodb = require('mongodb');

var server = restify.createServer();
//var uri = 'mongodb://broker:BrokerServer2015@ds063180.mongolab.com:63180/brokerserver';
var uri = 'mongodb://brokerserver:BrokerServer2015@ds051873.mongolab.com:51873/broker'
var port = process.env.PORT || 9000;

server.use(restify.bodyParser({ mapParams: true }));

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
    var j = JSON.parse(req.body);

    var user = {
        "email": j.email,
        "password": j.password
    };

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
    console.log('collection...');
    collection.find(params.filter).toArray(function(err, docs) {
        if(err) {
            console.log('Error...');
            params.response.json(err);
            return;
        }

        if(params.callback){
            params.docs = docs;
            console.log('calling callback');
            params.callback(params);
        } else {
            console.log('Yes, I have found!');
            console.log(docs);
            params.response.json(docs);
        }
    });
};

brokerserver.beforeSavePreferences = function(req, res, next){
    var prefs = brokerserver.prefsBuilder(req._url.query);

    var params = {
        "operation": brokerserver.savePreferences,
        "collection": 'configuration',
        "response": res,
        "request": req,
        "config": JSON.parse(prefs)
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.savePreferences = function(params){
    var collection = params.db.collection(params.collection);

    try {
        collection.insert(params.config);
        params.response.json({"insert": true});
    } catch(ex) {
        params.response.json({"insert": false, "err": "Error on trying to save the configuration."});
    }
};

brokerserver.myServices = function(req, res, next){
    var filter = {
        "email": req.body.email
    };

    var params = {
        "operation": brokerserver.find,
        "collection": 'link',
        "filter": filter,
        "response": res,
        "request": req
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.saveLink = function(req, res, next) {
    var j = JSON.parse(req.body);

    var config = {
        "url": j.url,
        "email": j.email,
        "service": j.service
    };

    var params = {
        "operation": brokerserver.find,
        "collection": 'link',
        "filter": {"email": j.email, "service": j.service},
        "response": res,
        "callback": brokerserver.persistLink,
        "request": req,
        "config": config
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.persistLink = function(params) {
    var collection = params.db.collection(params.collection);

    if(params.docs.length > 0) {
        collection.update({"email": params.config.email, "service": params.config.service},
            { $push: { url: params.config.url }});
    } else {
        collection.insert({"email": params.config.email, "service": params.config.service, url: [params.config.url]});
    }
};

brokerserver.dbOperations = function(params) {
    mongodb.MongoClient.connect(uri, function(err, db) {
        if(err) throw err;

        params.db = db;
        params.operation(params);
    });
};

brokerserver.prefsBuilder = function(query) {

    var valueType = function(value) {
        if(isNaN(value * 1) && typeof value === 'string')
            return value;

        return value * 1;
    }

    var array = query.split('&');
    var obj = {}

    for (var i in array) {
        var attr = array[i].split('=');

        var key = attr[0];
        var value = unescape(attr[1]);

        obj[key] = valueType(value);
    }

    return JSON.stringify(obj);
};

server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

server.get('/types', brokerserver.types);
server.get('/email/:email', brokerserver.email);
server.get('/signup/:name/:email/:password', brokerserver.signup);
server.post('/login', brokerserver.login);
server.get('/savePreferences', brokerserver.beforeSavePreferences);
server.post('/myServices', brokerserver.myServices);
server.post('/saveLink', brokerserver.saveLink);

server.listen(port, function() {
  console.log('%s listening at server port %s', 'BrokerServer', port);
});
