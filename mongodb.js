const mongoose=require("mongoose");

const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");





mongoose.connect("mongodb://localhost:27017/User")
.then(()=>{console.log("mongodb connected")})
.catch(()=>{console.log("failed")})

const userSchema=new mongoose.Schema({
    name:String,
    username:String,
    password:String,
    secrets:[]
});
userSchema.plugin(passportLocalMongoose);

const user=new mongoose.model("User",userSchema);
// passport.use(user.createStrategy());
// passport.serializeUser(user.serializeUser());
// passport.deserializeUser(user.deserializeUser());

module.exports={
    user
}