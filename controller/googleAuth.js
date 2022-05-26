var GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();
const user = require('../model/user');
const clientId = process.env.CLIENTID;
const clientSecreT = process.env.CLIENTSECRET;

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecreT,
        callbackURL: "https://sort-s.herokuapp.com/google/callback"
    }, (accessToken, refreshToken, profile, done) => {

        // find if a user exist with this email or not
        user.findOne({ email: profile.emails[0].value }).then((data) => {
            if (data) {
                // user exists
                // update data
                // I am skipping that part here, may Update Later
                return done(null, data);
            } else {
                // create a user
                user({
                  
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    password: null,
                    provider: 'google',
                    isVerified: true,
                }).save(function (err, data) {
                    return done(null, data);
                });
            }
        });
    }
    ));
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        user.findById(id, function (err, user) {
            done(err, user);
        });
    });

}