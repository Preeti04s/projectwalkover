const nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});

module.exports.sendResetEmail = async (email, token) => {
   // change first part to your domain
  var url = "https://sort-s.herokuapp.com/user/reset-password?token=" + token;

  await smtpTransport.sendMail({
    from: process.env.USER,
    to: email,
    subject: "MakeItShort-RESET YOUR PASSWORD",
    text: `Someone (hopefully you) has requested a password reset for your MakeItShort account.Follow the link below to reset your password ${url}`,
    html: `<h3> Click on this link to reset your password : ${url} </h3> <br> <p>If you don't wish to reset your password, disregard this email and no action will be taken.</p><br><h3>The MakeItShort Team</h3><a href="https://sort-s.herokuapp.com/">https://sort-s.herokuapp.com/</a>`,
  });
};

module.exports.sendVerifyEmail = async (email, token) => {
  // change first part to your domain
  var url = "https://sort-s.herokuapp.com/user/verifyemail?token=" + token;

  await smtpTransport.sendMail({
    from: "saranshj2002@gmail.com",
    to: email,
    subject: "MakeItShort-Verify Your Email",
    text: `Click on this link to verify ${url}`,
    html: `<h3>Almost done,To complete your MakeItShort account we just need to verify your email address .Click on this link to verify your email : ${url} </h3> <br> <p>Once verified you can start using all of the 
    MakeItShort's features and rebrand your urls.</p>`,
  });
};
