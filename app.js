
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');

var http = require('http');
var path = require('path');

var MongoStore = require('connect-mongo')(express);
var settings = require('./settings');
//flash模块添加
var flash = require('connect-flash');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(express.favicon());
app.use(express.logger('dev'));

//app.use(express.bodyParser());

app.use(express.bodyParser({keepExtensions: true, uploadDir: './public/images'}));
app.use(express.methodOverride());
//cookie解析中间件
app.use(express.cookieParser());
app.use(express.session({
	secret:settings.cookieSecret,
	key:settings.db,
	cookie:{maxAge: 1000*60*60*24*30},
	store:new MongoStore({
		db:settings.db
	})
}));

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

routes(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
