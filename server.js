var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var session = require('express-session');
var logout = require('express-passport-logout');



var sess = {
 secret: 'VWxg1w8m2QSvXabuw4h5-mLKc8UCQmIFfd3TvdPB06b1pB_rG4Q2rswdBVtadMH4',
 cookie: {},
 resave: false,
 saveUninitialized: true
};

if (app.get('env') === 'production') {
  sess.cookie.secure = true; // serve secure cookies, requires https
 }

 app.use(session(sess));
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

var Message = mongoose.model('Message',{
  name : String,
  message : String
})

var dbUrl = 'mongodb://default:default123@ds223763.mlab.com:23763/messages'

app.use(function(req, res, next) {
  res.locals.loggedIn = false;
  if (req.session.passport && typeof req.session.passport.user !== 'undefined') {
    res.locals.loggedIn = true;
  }
  next();
});


 var Auth0Strategy = require('passport-auth0'),
     passport = require('passport');

 var strategy = new Auth0Strategy({
   domain: 'chatwithme.auth0.com',
   clientID: 'ulgUQIh2lY2psL3tu4iaq8078YjE4b6c',
   clientSecret: 'VWxg1w8m2QSvXabuw4h5-mLKc8UCQmIFfd3TvdPB06b1pB_rG4Q2rswdBVtadMH4',
   callbackURL: 'http://localhost:3000/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    return done(null, profile);
  }
 );

 passport.use(strategy);

 app.use(passport.initialize());
 app.use(passport.session());


 passport.serializeUser(function(user, done) {
   done(null, user);
 });

 passport.deserializeUser(function(user, done) {
   done(null, user);
 });

io.on('connection', () =>{
  console.log('User connected')
})

mongoose.connect(dbUrl,(err) => {
  console.log('mongodb error = ',err);
})

app.get('/messages', (req, res) => {
    Message.find({},(err, messages)=> {
      res.send(messages);
    })
  })


  app.get('/messages/:user', (req, res) => {
    var user = req.params.user
    Message.find({name: user},(err, messages)=> {
      res.send(messages);
    })
  })


  app.post('/messages', async (req, res) => {
    try{
      var message = new Message(req.body);

      var savedMessage = await message.save()
        console.log('saved');

      var censored = await Message.findOne({message:'badword'});
        if(censored)
          await Message.remove({_id: censored.id})
        else
          io.emit('message', req.body);
        res.sendStatus(200);
    }
    catch (error){
      res.sendStatus(500);
      return console.log('error',error);
    }
    finally{
      console.log('Message Posted')
    }

  })

  app.get('/login',
    passport.authenticate('auth0', {scope: 'openid email profile'}), function (req, res) {
    res.redirect("/");
  });

  app.get('/callback',
    passport.authenticate('auth0', { failureRedirect: '/login' }),
    function(req, res) {
      if (!req.user) {
        throw new Error('user null');
      }
      res.redirect("/");
    }
  );

  /* GET user profile. */
  // app.get('/user', ensureLoggedIn, function(req, res, next) {
  //   res.render('user', {
  //     user: req.user ,
  //     userProfile: JSON.stringify(req.user, null, '  ')
  //   });
  // });

  

  // Perform session logout and redirect to homepage
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
    app.get('/logout', logout());
  });

//GET USERNAME

// var request = require("request");

// var options = { method: 'GET',
//   url: 'https://chatwithme.auth0.com/api/v2/users/user_id',
//   qs: { fields: 'user_metadata', include_fields: 'true' },
//   headers: 
//    { 'content-type': 'application/json',
//      authorization: 'Bearer ABCD' } };

// request(options, function (error, response, body) {
//   if (error) throw new Error(error);

//   console.log(body);
// });

var server = http.listen(3000, () => {
  console.log('Running on port', server.address().port);
});