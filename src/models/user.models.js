/*  
    username string
    email string
    fullName string
    avatar string
    coverImage string
    watchHistory ObjectId[] videos
    password string
    refreshToken string
    createdAt Date
    updatedAt Date
*/

import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"  //used for encrypting
import jwt from "jsonwebtoken"

const userSchema = new Schema ({
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase:true,
            trim: true,
            index:true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase:true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index:true
        },
        avatar: {
            type: String,
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectID,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true,"Password is Required"]
        },
        refreshToken: {
            type: String
        }   
    },
    { timestamps: true }
)


userSchema.pre("save", async function (next) { //pre hook //encrypting password before saving


    if (!this.isModified("password")) return next() // password should only be saved if saving or updating


    this.password = bcrypt.hash(this.password, 10)


    next ()
})

userSchema.methods.isPasswordCorrect = async function (password) { // check whether the given password matches the saved password involving encryption
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function () {
    // short lived access token
    
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}



userSchema.methods.generateRefreshToken = function () {
    // short lived access token
    
    return jwt.sign({       
        _id: this._id,                                                                                      
     
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}




export const User = mongoose.model("User", userSchema)