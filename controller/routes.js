const express = require('express');
const router = express.Router();
const user = require('../model/user');
const urls = require('../model/url');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const crypto = require('crypto');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}


router.get('/login', (req, res) => {
    res.render("login", { csrfToken: req.csrfToken() });
});

router.get('/signup', (req, res) => {
    res.render("signup", { csrfToken: req.csrfToken() });
});

router.post('/signup', async (req, res) => {
    // get all the values 
    const { email, password, confirmpassword } = req.body;
    // check if the are empty 
    if (!email || !password || !confirmpassword) {
        res.render("signup", { err: "All Fields Required !", csrfToken: req.csrfToken() });
    } else if ((!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/.test(password))) {
        res.render("signup", { err: "Password contains Capital Letter, Special Character and Min 8 Characters. ", csrfToken: req.csrfToken() });
    } else if (password != confirmpassword) {
        res.render("signup", { err: "Password and ConfirmPassword Don't Match !", csrfToken: req.csrfToken() });
    } else {
        // validate email and username and password skipping validation check if a user exists
        user.findOne({ email: email }, function (err, data) {
            if (err) throw err;
            if (data) {
                res.render("signup", { err: "User Exists, Try Logging In !", csrfToken: req.csrfToken() });
            } else {
                // generate a salt
                bcryptjs.genSalt(12, (err, salt) => {
                    if (err) throw err;
                    // hash the password
                    bcryptjs.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        // save user in db
                        user({
                            email: email,
                            password: hash,
                            googleId: null,
                            provider: 'email',
                        }).save(async (err, data) => {
                            if (err) throw err;    
                            var token = crypto.randomBytes(32).toString('hex');
                            // add that to database
                            await resetToken({ token: token, email: email }).save();
                            // send an email for verification
                            mailer.sendVerifyEmail(email, token);
                            req.flash('success_messages', "Kindly verify your email !");
                            res.redirect('/login');
                        });
                    })
                });
            }
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        failureRedirect: '/login',
        successRedirect: '/dashboard',
        failureFlash: true,
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy(function (err) {
        res.redirect('/');
    });
});