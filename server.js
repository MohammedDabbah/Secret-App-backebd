const express = require("express");
const user = require("./mongodb");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const mail = require('./mail');
const encryption = require("./encryption");
const app = express();
// let code="";
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const corsOptions = {
    origin: "http://localhost:3000", // Replace with your frontend URL
    credentials: true, // Enable credentials (cookies)
};
app.use(cors(corsOptions));  

app.use(session({
    secret: "this our little secret.",
    resave: false,
    saveUninitialized: false,
    cookie: {domain: "localhost", secure: false },
    credentials: true,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/User");

passport.use(user.user.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        if (Array.isArray(user.secrets)) {
            return cb(null, {
                id: user.id,
                username: user.username,
                name:user.name,
                code: mail.generateFourDigitCode(),
                secrets: user.secrets.map(x => encryption.decrypt(x))
            });
        } else {
            return cb(null, {
                id: user.id,
                username: user.username,
                name:user.name,
                code: mail.generateFourDigitCode(),
                secrets: []
            });
        }
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

app.get("/Login", cors(corsOptions), function (req, res) {
    // Handle login page rendering or redirection
});

app.post("/Login", async function (req, res) {
    try {
        const { username, password } = req.body;
        const userFound = await user.user.findOne({ username: username });

        if (!userFound) {
            res.json("failed");
        } else {
            req.logIn({ username, password }, function (err) {
                if (err) {
                    console.log(err);
                    res.json("failed");
                } else {
                    passport.authenticate("local", function (err, user, info) {
                        if (err || !user) {
                            console.log(err || "Incorrect password");
                            res.json("failed");
                        } else {
                            req.logIn(user, function (err) {
                                if (err) {
                                    console.log(err);
                                    res.json("failed");
                                } else {
                                    res.json("success");
                                }
                            });
                        }
                    })(req, res);
                }
            });
        }
    } catch (err) {
        console.log(err);
        res.json("failed");
    }
});

app.get('/Register', cors(corsOptions), async(req, res) => {
    // Handle registration page rendering or redirection
   mail.code=await mail.generateFourDigitCode();
   const { username } = req.query;
   mail.sendEmail(username,"Verify your email",`Your code is :${mail.code}`);
});

// app.post("/Register", (req, res) => {
//     const { name, username, password, codeInput } = req.body;
//     console.log("Session code accessed:",mail.code,":",codeInput);
//     if(`${mail.code}`===codeInput){
//     user.user.register({ name: name, username: username }, password, function (err, user) {
//         if (err) {
//             console.log(err);
//             res.json("failed");
//         } else {
//             passport.authenticate("local")(req, res, function () {
//                 res.json(req.user);
//             });
//         }
//     });
//     }else{
//         res.json("failed");
//     }
// });

app.post("/Register", async function (req, res) {
    try {
        const { name, username, password, codeInput } = req.body;

        // Check if the username already exists
        const existingUser = await user.user.findOne({ username: username }).exec();

        if (existingUser) {
            // Username is already taken
            console.log("Username is already taken")
            return res.json("failed");
        }
        if(`${mail.code}`!==codeInput){
            console.log("incorrect code");
            return res.json("failed");
        }

        // Continue with user registration
        // ...

        // Handle the rest of the registration logic
        user.user.register({ name: name, username: username }, password, function (err, newUser) {
            if (err || !newUser) {
                console.log(err || "Registration failed");
                return res.json("failed");
            }

            // Registration successful
            req.login(newUser, function (err) {
                if (err) {
                    console.log(err);
                    return res.json("failed");
                }

                return res.json(newUser);
            });
        });
    } catch (err) {
        console.log(err);
        return res.json("failed");
    }
});



app.get("/User", cors(corsOptions), async function (req, res) {
    try {
        if (req.user === null) {
            res.redirect("/Login");
        } else {
            res.json(req.user);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

app.post("/User", async (req, res) => {
    const { secret, username } = req.body;
    try {
        const check = await user.user.findOne({ username: req.user.username });
        if (check) {
            check.secrets.push(encryption.encrypt(secret));
            await check.save();
            const arr = check.secrets.map(x => encryption.decrypt(x));
            res.json(arr);
        } else {
            res.status(404).json({ error: "User not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

app.get("/delete", cors(corsOptions), (req, res) => {
    // Handle delete page rendering or redirection
});

app.post("/delete", async (req, res) => {
    const { index ,username} = req.body;
    try {
        const check = await user.user.findOne({ username:req.user.username });
        if (check) {
            check.secrets.splice(index, 1);
            await check.save();
            const arr=check.secrets.map(x=>encryption.decrypt(x));
            res.json(arr);
        } else {
            res.status(404).json({ error: "User not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

app.get("/Verification", cors(corsOptions), function (req, res) {
    try{
        mail.sendEmail(req.user.username, "Verification Code", `your Verification Code is : ${req.user.code}`);
        res.json("loggedIn");
    }catch(err){
        console.log(err);
        res.json("failed");
    }
});

app.post("/Verification", function (req, res) {
    const { code } = req.body;
    const stCode = req.user.code;
    if (`${stCode}` === code) {
        console.log("codes match!");
        res.redirect("/User");
    } else {
        res.json("not match");
    }
});

app.get("/ChangePassword",async function(req,res){
    const {username}=req.query;
    try{
        const userFound = await user.user.findOne({ username: username });

        if (!userFound) {
            // User not found
            console.log("not found")
            return res.json("failed");
        }
        mail.code=mail.generateFourDigitCode();
        mail.sendEmail(username,"changing your password",`your code ${mail.code} to enable changing your password`);
        return res.json("success")
    }catch(err){
        console.log(err);
    }
});

app.post("/ChangePassword", async function (req, res) {
    try {
        const { username,password,code } = req.body;

        // Find the user by username
        const userFound = await user.user.findOne({ username: username });

        if (!userFound) {
            // User not found
            return res.json("failed");
        }

        // Verify the provided code
        if (`${mail.code}`!== code) {
            console.log("Incorrect code");
            return res.json("failed");
        }

        // // Verify the current password
        // if (!(await userFound.authenticate(currentPassword))) {
        //     // Incorrect current password
        //     console.log("Incorrect current password");
        //     return res.json("failed");
        // }

        // Update the user's password
        userFound.setPassword(password, async (err) => {
            if (err) {
                console.log("Error updating password");
                return res.json("failed");
            }

            // Save the updated user
            await userFound.save();

            // Password update successful
            return res.json("success");
        });
    } catch (err) {
        console.log(err);
        return res.json("failed");
    }
});


app.post("/Logout", cors(corsOptions), async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            res.json("failed");
        } else {
            res.clearCookie('connect.sid', { path: '/', domain: 'localhost' }); // Adjust the domain as needed
            res.json("logout");
        }
    });
});

app.listen(8000, () => { console.log("server started on port 8000.") });
