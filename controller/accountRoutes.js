const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const resetToken = require('../model/resetTokens');
const user = require('../model/user');
const mailer = require('./sendMail');
const bcryptjs = require('bcryptjs');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}

router.get('/user/send-verification-email', checkAuth, async (req, res) => {
    // check if user is google or already verified
    if (req.user.isVerified || req.user.provider == 'google') {
        // already verified or google user
        res.redirect('/dashboard');
    } else {
        // generate a token 
        var token = crypto.randomBytes(32).toString('hex');
        // add that to database
        await resetToken({ token: token, email: req.user.email }).save();
        // send an email for verification
        mailer.sendVerifyEmail(req.user.email, token);
        res.render('dashboard', { username: req.user.username, verified: req.user.isVerified, emailsent: true,
            logged: true, csrfToken: req.csrfToken(), urls : []
        });
    }
});


router.get('/user/verifyemail', async (req, res) => {
    // grab the token
    const token = req.query.token;
    if (token) {
        var check = await resetToken.findOne({ token: token });
        if (check) {
            var userData = await user.findOne({ email: check.email });
            userData.isVerified = true;
            await userData.save();
            // delete the token now itself
            await resetToken.findOneAndDelete({ token: token });
            res.redirect('/dashboard');
        } else {
            res.render('profile', { username: req.user.username, verified: req.user.isVerified, err: "Invalid token or Token has expired, Try again." });
        }
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/user/forgot-password', async (req, res) => {
    res.render('forgot-password.ejs', { csrfToken: req.csrfToken() });

});

router.post('/user/forgot-password', async (req, res) => {
    const { email } = req.body;
    var userData = await user.findOne({ email: email });
    console.log(userData);
    if (userData) {
        if (userData.provider == 'google') {
            // type is for bootstrap alert types
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "User exists with Google account. Try resetting your google account password or logging using it.", type: 'danger' });
        } else {
            var token = crypto.randomBytes(32).toString('hex');
            // add that to database
            await resetToken({ token: token, email: email }).save();
            // send an email for verification
            mailer.sendResetEmail(email, token);

            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "Reset email sent. Check your email for more info.", type: 'success' });
        }
    } else {
        res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "No user Exists with this email.", type: 'danger' });

    }
});

router.get('/user/reset-password', async (req, res) => {

    const token = req.query.token;
    if (token) {
        var check = await resetToken.findOne({ token: token });
        if (check) {
            // token verified        
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, email: check.email });
        } else {
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "Token Tampered or Expired.", type: 'danger' });
        }
    } else {
        // doesnt have a token
        // I will simply redirect to profile 
        res.redirect('/login');
    }

});


router.post('/user/reset-password', async (req, res) => {
    // get passwords
    const { password, password2, email } = req.body;
    console.log(password);
    console.log(password2);
    if (!password || !password2 || (password2 != password)) {
        res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, err: "Passwords Don't Match !", email: email });
    } else {
        // encrypt the password
        var salt = await bcryptjs.genSalt(12);
        if (salt) {
            var hash = await bcryptjs.hash(password, salt);
            await user.findOneAndUpdate({ email: email }, { $set: { password: hash } });
            res.redirect('/login');
        } else {
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, err: "Unexpected Error Try Again", email: email });

        }
    }
});


module.exports = router;