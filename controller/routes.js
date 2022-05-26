const express = require('express');
const router = express.Router();
const user = require('../model/user');
const urls = require('../model/url');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const mailer = require('./sendMail');
const resetToken = require('../model/resetTokens');
const randomstring = require("randomstring");
const crypto = require('crypto');
require('./passportLocal')(passport);
require('./googleAuth')(passport);
const userRoutes = require('./accountRoutes');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}

router.get('/admin',(req,res)=>{
    user.find().then((data)=>{
        res.render('admin',{users:data});
    })
})
router.get('/admin/delete/:email',(req,res)=>{
   urls.deleteMany({"owned":req.params.email}).then((data)=>{
    user.findOneAndDelete({"email":req.params.email}).then((deleteduser)=>{
        res.redirect('/admin');  
    })
   })
})
router.get('/admin/view/:email',(req,res)=>{
    urls.find({"owned":req.params.email}).then((data)=>{
        res.render('userUrls',{urls:data});
    })
})
router.get('/admin/deleteUrl/:slug',(req,res)=>{
     urls.findOneAndDelete({"slug":req.params.slug}).then((deletedurl)=>{
         const user=deletedurl.owned;
         res.redirect('/admin/view/'+user); 
        
     })
 })

router.get('/admin/delUrl/:slug',(req,res)=>{
    urls.findOneAndDelete({"slug":req.params.slug}).then((deletedurl)=>{
        const user=deletedurl.owned;
        res.redirect('/admin/urls'); 
       
    })
})
 router.get('/admin/urls',(req,res)=>{
    urls.find().then((data)=>{
        res.render('allurls',{urls:data})
    })
 })

router.get('/login', (req, res) => {
    res.render("login", { csrfToken: req.csrfToken() });
});

router.get('/signup', (req, res) => {
    res.render("signup", { csrfToken: req.csrfToken() });
});

router.post('/signup',async (req, res) => {
    // get all the values 
    const { email, password, confirmpassword } = req.body;
    // check if the are empty 
    if (!email || !password || !confirmpassword) {
        res.render("signup", { err: "All Fields Required !", csrfToken: req.csrfToken() });
    }else if((!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/.test(password))){
        res.render("signup",{err:"Password contains Capital Letter, Special Character and Min 8 Characters. ",csrfToken: req.csrfToken() });
    }else if (password != confirmpassword) {
        res.render("signup", { err: "Password and ConfirmPassword Don't Match !", csrfToken: req.csrfToken() });
    } else {

        // validate email and username and password 
        // skipping validation
        // check if a user exists
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
                        }).save (async(err, data) => {
                            if (err) throw err;
                            // login the user
                            // use req.login
                            // redirect , if you don't want to login
                            // res.redirect('/login');
                            var token = crypto.randomBytes(32).toString('hex');
                            // add that to database
                            await resetToken({ token: token, email:email }).save();
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

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email',] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/dashboard');
});

router.get('/dashboard', checkAuth, (req, res) => {


    urls.find({ owned : req.user.email }, (err, data) => {
        if(err) throw err;
        
        res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), urls : data });
        
    });

});


router.post('/create', checkAuth, (req, res) => {
    var { original, short } = req.body;
    short.trim();
    if (!original){
        urls.find({ owned : req.user.email }, (err, data) => {
            if(err) throw err;
            res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), urls : data,err:"Empty Fields !" });
        });
    } else {
        var counturls=original.split(",")
        var arr=[];
        for(var i=0;i<counturls.length;i++){
            if(counturls[i].trim()==''){
                continue;
            }else{
                arr.push(counturls[i]);
            }
        }
        urls.findOne({ slug: short }, (err, data) => {
            if (err) throw err;
            else if (data) {
                urls.find({ owned : req.user.email }, (err, data) => {
                    if(err) throw err;
                    res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(),urls : data, err: "Try Different Short Url, This exists !" });
                });
            }else if(arr.length>1 && short){
                urls.find({ owned : req.user.email }, (err, data) => {
                    if(err) throw err;
                    res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(),urls : data, err: "Slug should be empty for multiple urls." });
                });
            } else {
                var array=[];
                for(var i=0;i<arr.length;i++){
                    if(short==""){
                        short=randomstring.generate(10);
                    }else if(arr.length>1){
                        short=randomstring.generate(10);
                    }
                    array.push({originalUrl:arr[i],slug:short,owned:req.user.email});

                }
                urls.insertMany(array).then((data)=>{
                    res.redirect('/dashboard');
                })
            }
        })
    }

});

router.use(userRoutes);
router.get('/:slug?', async (req, res) => {
    if (req.params.slug != undefined) {
        var data = await urls.findOne({ slug: req.params.slug });
        if (data) {
            data.visits = data.visits + 1;
            var ref = req.query.ref;
            if (ref) {
                switch (ref) {
                    case 'fb':
                        data.visitsFB = data.visitsFB + 1;
                        break;
                    case 'tw':
                        data.visitsTW = data.visitsTW + 1;
                        break;
                    case 'wh':
                        data.visitsWH = data.visitsWH + 1;
                        break;
                }
            }
            await data.save();
            res.redirect(data.originalUrl);
        } else {
            if (req.isAuthenticated()) {
                res.render("index", { logged: true, err: true });
            } else {
                res.render("index", { logged: false, err: true });
            }
        }
    } else {
        if (req.isAuthenticated()) {
            res.render("index", { logged: true });
        } else {
            res.render("index", { logged: false });
        }
    }
});

router.get('/info/:slug',async(req,res)=>{
    if (req.params.slug != undefined){
        var data = await urls.findOne({ slug: req.params.slug });
        res.render('info',{url:data,logged: true});
    }
   
})



module.exports = router;