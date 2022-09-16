const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
var passport = require('passport');
var crypto = require('crypto');
var LocalStrategy = require('passport-local').Strategy;
const nodemailer = require('nodemailer')
const methodOverride = require('method-override')
const port = 3333 || process.env.PORT

const User = require('./models/user')

const stripe = require('stripe')('sk_test_51JJIqEB7xOd0avEgcpHRiiczUzqqgaucUJfzaEMxb2jxybky1KHKOShWJFTc8cuMZVeHq5EpMPHvbEqvquFLnm9C00Y1JV6aJD');

// Get the route folder
const indexRoutes = require('./routes/index')
const dashRoutes = require('./routes/dash')


// Package documentation - https://www.npmjs.com/package/connect-mongo
const MongoStore = require('connect-mongo');


/**
 * -------------- GENERAL SETUP ----------------
 */

// Gives us access to variables set in the .env file via `process.env.VARIABLE_NAME` syntax
require('dotenv').config();

// Create the Express application
var app = express()

app.use(methodOverride('_method'))
app.set('view engine','ejs')
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/public', express.static('public'))

/**
 * -------------- DATABASE ----------------
 */

/**
 * Connect to MongoDB Server using the connection string in the `.env` file.  To implement this, place the following
 * string into the `.env` file
 * 
 * DB_STRING=mongodb://<user>:<password>@localhost:27017/database_name
 */ 

const conn = process.env.DB_STRING;
mongoose.connect(conn, {useNewUrlParser: true, useUnifiedTopology: true})
    .then( () =>console.log('DB Ok'))
    .catch(err => console.log(err))


/*connection.on('', () => { 
    console.log('connected');
});*/

// Creates simple schema for a User.  The hash and salt are derived from the user's given password when they register



/**
 * This function is called when the `passport.authenticate()` method is called.
 * 
 * If a user is found an validated, a callback is called (`cb(null, user)`) with the user
 * object.  The user object is then serialized with `passport.serializeUser()` and added to the 
 * `req.session.passport` object. 
*/
passport.use(new LocalStrategy(
    function(username, password, cb) {
        User.findOne({ username: username })
            .then((user) => {

                if (!user) { return cb(null, false) }
                
                // Function defined at bottom of app.js
                const isValid = validPassword(password, user.hash, user.salt);
                
                if (isValid) {
                    return cb(null, user);
                } else {
                    return cb(null, false);
                }
            })
            .catch((err) => {   
                cb(err);
            });
}));
  
/**
 * This function is used in conjunction with the `passport.authenticate()` method.  See comments in
 * `passport.use()` above ^^ for explanation
 */
passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

/**
 * This function is used in conjunction with the `app.use(passport.session())` middleware defined below.
 * Scroll down and read the comments in the PASSPORT AUTHENTICATION section to learn how this works.
 * 
 * In summary, this method is "set" on the passport object and is passed the user ID stored in the `req.session.passport`
 * object later on.
 */
passport.deserializeUser(function(id, cb) {
    User.findById(id, function (err, user) {
        if (err) { return cb(err); }
        cb(null, user);
    });
});


/**
 * -------------- SESSION SETUP ----------------
 */

/**
 * The MongoStore is used to store session data.  We will learn more about this in the post.
 * 
 * Note that the `connection` used for the MongoStore is the same connection that we are using above
 */
//const sessionStore = new MongoStore({ mongooseConnection: connection, collection: 'sessions' })

/**
 * See the documentation for all possible options - https://www.npmjs.com/package/express-session
 * 
 * As a brief overview (we will add more later): 
 * 
 * secret: This is a random string that will be used to "authenticate" the session.  In a production environment,
 * you would want to set this to a long, randomly generated string
 * 
 * resave: when set to true, this will force the session to save even if nothing changed.  If you don't set this, 
 * the app will still run but you will get a warning in the terminal
 * 
 * saveUninitialized: Similar to resave, when set true, this forces the session to be saved even if it is unitialized
 *
 * store: Sets the MemoryStore to the MongoStore setup earlier in the code.  This makes it so every new session will be 
 * saved in a MongoDB database in a "sessions" table and used to lookup sessions
 * 
 * cookie: The cookie object has several options, but the most important is the `maxAge` property.  If this is not set, 
 * the cookie will expire when you close the browser.  Note that different browsers behave slightly differently with this
 * behaviour (for example, closing Chrome doesn't always wipe out the cookie since Chrome can be configured to run in the
 * background and "remember" your last browsing session)
 */
app.use(session({
    //secret: process.env.SECRET,
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.DB_STRING
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // Equals 1 day (1 day * 24 hr/1 day * 60 min/1 hr * 60 sec/1 min * 1000 ms / 1 sec)
    }
}));




/**
 * -------------- PASSPORT AUTHENTICATION ----------------
 */

/**
 * Notice that these middlewares are initialized after the `express-session` middleware.  This is because
 * Passport relies on the `express-session` middleware and must have access to the `req.session` object.
 * 
 * passport.initialize() - This creates middleware that runs before every HTTP request.  It works in two steps: 
 *      1. Checks to see if the current session has a `req.session.passport` object on it.  This object will be
 *          
 *          { user: '<Mongo DB user ID>' }
 * 
 *      2.  If it finds a session with a `req.session.passport` property, it grabs the User ID and saves it to an 
 *          internal Passport method for later.
 *  
 * passport.session() - This calls the Passport Authenticator using the "Session Strategy".  Here are the basic
 * steps that this method takes:
 *      1.  Takes the MongoDB user ID obtained from the `passport.initialize()` method (run directly before) and passes
 *          it to the `passport.deserializeUser()` function (defined above in this module).  The `passport.deserializeUser()`
 *          function will look up the User by the given ID in the database and return it.
 *      2.  If the `passport.deserializeUser()` returns a user object, this user object is assigned to the `req.user` property
 *          and can be accessed within the route.  If no user is returned, nothing happens and `next()` is called.
 */
app.use(passport.initialize());
app.use(passport.session());



/**
 * -------------- ROUTES ----------------
 */

app.use('/', indexRoutes)
app.use('/:username/dashboard/', dashRoutes)

/*/*
app.get('/', (req, res, next) => {
    res.render('index');
});

// When you visit http://localhost:3000/login, you will see "Login Page"
app.get('/login', (req, res, next) => {
   res.render('login')
});

// Since we are using the passport.authenticate() method, we should be redirected no matter what 
*/

app.post('/login', passport.authenticate('local', { failureRedirect: '/login-failure', successRedirect: '/login-success' }), (err, req, res, next) => {
    if (err) next(err);
});


app.post('/register', async(req, res, next) => {
    console.log(req.body);
    const saltHash = genPassword(req.body.password);
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = new User({
        username: req.body.username,
        hash: hash,
        salt: salt
    });
    console.log(newUser);
    newUser.save()
    .then((user) => {
        console.log(user);
    });

    const customer = await stripe.customers.create({
        description: `${newUser.username} - client `,
        email: newUser.username
    });

    newUser.customerId = customer.id
    newUser.settingsOptions.emailFooterHtml = `Best Regards, ${newUser.username}`
    newUser.settingsOptions.emailFooterTitle = `EmailFooter1`

    const trialStart = newUser.createdAt
    var trialEnd = new Date(trialStart)
    trialEnd.setDate(trialEnd.getDate() + 7)
    newUser.trial.start = trialStart
    newUser.trial.end = trialEnd
    newUser.trial.status = 'active'

    newUser.save()

    res.redirect('/login');
});

app.get('/*', (req,res) => {
    res.status(404).render('layouts/404', {
        homeUrl: '/'
    })
})




/**
 * -------------- SERVER ----------------
*/

// Server listens on http://localhost:3000
app.listen(process.env.PORT || port, () => console.log(`Server listening on port ${port}`))

function validPassword(password, hash, salt) {
    var hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}

function genPassword(password) {
    var salt = crypto.randomBytes(32).toString('hex');
    var genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    return {
      salt: salt,
      hash: genHash
    };
}