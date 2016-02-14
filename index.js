var express = require('express'),
  methodOverride = require('method-override'),
  passport = require('passport'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  morgan = require('morgan'),
  util = require('util'),
  ForceDotComStrategy = require('passport-forcedotcom').Strategy
  lazyproxy = require('lazy-proxy');

var CF_CLIENT_ID = '3MVG9uudbyLbNPZP87L462HahzK4g50qp1INc3XG.FG8dWx1eFnE6WblYYcpjcyMQGBjRb4KNU6yr1sFPjItV';
var CF_CLIENT_SECRET = '7783851447526722561';

var CF_CALLBACK_URL = 'http://localhost:3000/auth/forcedotcom/callback';

var SF_AUTHORIZE_URL = 'https://login.salesforce.com/services/oauth2/authorize';

var SF_TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';


var sfStrategy = new ForceDotComStrategy({
  clientID: CF_CLIENT_ID,
  clientSecret: CF_CLIENT_SECRET,
  callbackURL: CF_CALLBACK_URL,
  authorizationURL: SF_AUTHORIZE_URL,
  tokenURL: SF_TOKEN_URL
}, function(accessToken, refreshToken, profile, done) {

  // asynchronous verification, for effect...
  process.nextTick(function() {

    // To keep the example simple, the user's forcedotcom profile is returned to
    // represent the logged-in user.  In a typical application, you would want
    // to associate the forcedotcom account with a user record in your database,
    // and return that user instead.
    //
    // We'll remove the raw profile data here to save space in the session store:
    
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    delete profile._raw;

    // console.log(profile);
    return done(null, profile);
  });
});

passport.use(sfStrategy);


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var ensureAuthenticated = function(req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    next();
  }
}


var app = express();



app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
//app.use(morgan());
app.use(bodyParser.json()); // automatically parses the body of all POST requests
app.use(bodyParser.urlencoded({extended: true})); // only accept url encoded requests
app.use(methodOverride());
app.use(session({
  secret: 'keyboard cat',
  saveUninitialized: true,
  resave: true

}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  console.log(req.user);
  if(!req.user) {
    req.session.destroy();
    req.logout();
    return res.redirect('/login');
  }
  res.render('index', {
    user: req.user
  });
});

app.get('/account', function(req, res) {
  if (!req.user) {
    req.session.destroy();
    req.logout();
    return res.redirect('/login');
  }
  // console.log(req.user);
  res.render('account', {
    user: req.user
  });
});

app.get('/login', passport.authenticate('forcedotcom'));
app.get('/token',
  passport.authenticate('forcedotcom', { failureRedirect: '/error' }),
  function(req, res){
    req.session["forcedotcom"] = req.session["passport"]["user"];
    res.render("index",checkSession(req));
});

app.get('/auth/forcedotcom', passport.authenticate('forcedotcom'), function(req, res) {
  // The request will be redirected to Force.com for authentication, so this
  // function will not be called.
});

app.get('/auth/forcedotcom/callback', passport.authenticate('forcedotcom', {
  failureRedirect: '/login'
}), function(req, res) {
  req.session["forcedotcom"] = req.session["passport"]["user"];

  res.redirect('/');
});

app.get('/logout', function(req, res) {
  res.redirect('/login');
});



app.get('/list', ensureAuthenticated, function(req, res){
  if(req.session["forcedotcom"]) {
    debugger;
    var restOptions = {
      useHTTPS: true,
      host: req.session["forcedotcom"].access_token.params.instance_url.replace('https://',''),
      headers: {
        'Authorization': 'OAuth '+req.session["forcedotcom"].access_token,
        'Accept':'application/jsonrequest',
        'Cache-Control':'no-cache,no-store,must-revalidate'
      }
    };
    lazyproxy.send(restOptions,req,res);
    debugger;
  }
});

app.listen(3000);
