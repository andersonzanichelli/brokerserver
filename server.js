var restify = require('restify');
var mongodb = require('mongodb');
var request = require('request');

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
    //console.log('Going to answer...');
    if(params.docs.length > 0) {
        console.log('User logged!');
        params.response.json({"logged": true});
        return;
    }

    console.log('User not logged!');
    params.response.json({"logged": false});
};

brokerserver.find = function(params) {
    //console.log('Searching something...');
    var collection = params.db.collection(params.collection);
    //console.log('collection ' + params.collection);
    collection.find(params.filter).toArray(function(err, docs) {
        if(err) {
            //console.log('Error...');
            params.response.json(err);
            return;
        }

        if(params.callback){
            params.docs = docs;
            //console.log('calling callback');
            //console.log(params.docs);
            params.callback(params);
        } else {
            //console.log('Yes, I have found!');
            //console.log(docs);
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
        //console.log(params.config);
        collection.insert(params.config);
        params.response.json({"insert": true});
    } catch(ex) {
        params.response.json({"insert": false, "err": "Error on trying to save the configuration."});
    }
};

brokerserver.myServices = function(req, res, next){

    var filter = {
        "user": req.body.user
    };

    //console.log(filter);

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

    //console.log(j);

    var config = {
        "url": j.url,
        "email": j.email,
        "password": j.password,
        "service": j.service,
        "user": j.user
    };

    var params = {
        "operation": brokerserver.find,
        "collection": 'link',
        "filter": {"user": j.user, "service": j.service},
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

    //console.log(params.config);

    try {
        if(params.docs.length > 0) {
            collection.update({"user": params.config.user, "service": params.config.service},
                { $push: { url: params.config.url }});
        } else {
            collection.insert({
                "email": params.config.email,
                "password": params.config.password,
                "service": params.config.service,
                "user": params.config.user,
                url: [params.config.url]
            });
        }
        params.response.json({"success": true});
    } catch(ex) {
        params.response.json({"success": false, "err": "Error on trying to save the link."});
    }
};

brokerserver.showService = function(req, res, next) {
    var j = JSON.parse(req.body);

    //console.log(j);

    var params = {
        "operation": brokerserver.find,
        "collection": 'link',
        "filter": {"user": j.email, "service": j.service},
        "response": res,
        "callback": brokerserver.findConfig,
        "request": req,
        "config": {"email": j.email, "service": j.service},
    };

    brokerserver.dbOperations(params);
    next();
};

brokerserver.findConfig = function(params) {
    params.urls = params.docs[0].url;
    params.password = params.docs[0].password;
    params.email = params.config.email;
    params.service = params.config.service;
    params.collection = 'configuration';
    params.callback = brokerserver.choosingService;

    brokerserver.dbOperations(params);
}

brokerserver.choosingService = function(params) {

    //console.log(params.docs);
    if(params.docs.length > 0) {
        var urls = params.urls;
        var email = params.email;
        var service = params.service;
        var password = params.password;
        var city = params.docs[0].city;
        var lastUpdate = params.docs[0].last === 'on';
        var result = [];

        //console.log([urls, email, service, password, city, lastUpdate]);

        var callback = function(body){
            var info = JSON.parse(body).filter(function(entry) {
                return entry.city === city;
            });

            result = result.concat(info);
        };

        var escreve = function(chosenone) {
            var updated = function(update) {
                var data = new Date(update);
                return data.getDate() + "/" + data.getMonth() + 1 + "/" + data.getFullYear() + " " + (data.getHours() < 10 ? "0"+data.getHours() : data.getHours()) + ":" + (data.getMinutes() < 10 ? "0"+data.getMinutes(): data.getMinutes()) + ":" + (data.getSeconds() < 10 ? "0"+data.getSeconds() : data.getSeconds());
            }

            return '<div class="weather">'
                   +'   <div class="weather-images '+ chosenone.sky +'"></div>'
                   +'   <element class="temperature">'+ chosenone.temperature +'°C</element>'
                   +'   <div class="weather-images weather-termo '+ chosenone.termo +'"></div>'
                   +'   <br/><br/><br/>'
                   +'   City: '+ chosenone.city +'<br/>'
                   +'   Humidity: '+ chosenone.humidity +'%<br/>'
                   +'   Wind: '+ chosenone.wind +'km/h<br/>'
                   +'   Precipitation: '+ chosenone.preciptation +'%<br/><br/>'
                   +'   Last Update: ' + updated(chosenone.update)
                   +'</div>';
        }

        var headers = {
            'Content-Type': 'application/form-data'
        };

        for(var i = 0; i < urls.length; i++) {
            var options = {
                headers: headers,
                form: {
                    "email": email,
                    "password": password
                }
            };

            request.post(urls[i], options, function (error, response, body) {
                if (!error && response.statusCode == 200){
                    callback(body);
                    if(lastUpdate) {
                        var ord = result.sort(function(a, b){
                            return Date.parse(a.update) - Date.parse(b.update);
                        });

                        var chosenone = ord[ord.length - 1];

                        var html = escreve(chosenone);
                        params.response.end(html);
                    } else {
                        var html = escreve(result[0]);
                        params.response.end(html);
                    }
                } else {
                    params.response.json({"result": "error", "status": response.statusCode});
                }
            });
        }
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
server.post('/showService', brokerserver.showService);

server.listen(port, function() {
  console.log('%s listening at server port %s', 'BrokerServer', port);
});
