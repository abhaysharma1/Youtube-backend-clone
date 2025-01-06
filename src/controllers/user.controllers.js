import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";
import { json } from "stream/consumers";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId) 
        if (!user){
            console.log("user not found");
            throw new Error("User not Found");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refersh token");
        
    }
}

const registerUser = asyncHandler(async (req,res) => {
    const {fullname,email,username,password} = req.body

    //validation
    if (
        [fullname,username,email,password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({ //check if user exists
        $or: [{username},{email}]
    })

    if (existedUser){
        throw new ApiError(400,"User with the same user or email already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path  // gives local path of the avatar file
    const coverLocalPath = req.files?.coverImage?.[0]?.path  // gives local path of the avatar file

    if (!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    

    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudinary(coverLocalPath)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("uploaded avatar");
        
    } catch (error) {
        console.log("error uploading avatar",error);
        throw new ApiError(500,"Failed to upload avatar")
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("uploaded coverImage");
        
    } catch (error) {
        console.log("error uploading coverImage",error);
        throw new ApiError(500,"Failed to upload coverImage")
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken")//retrieve the user from database except for password and refresh token
    
        if(!createdUser){
            throw new ApiError(500,"Something went wrong while registering user")
        }
    
        return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));


    } catch (error) {
        console.log("user creation failed");

        if (avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500,"Something went wrong while registering the user and images were deleted");
        
    }
})

const loginUser = asyncHandler(async (req,res) => {
    //get data from body
    const {username,email,password} = req.body

    //validation

    if(!email){
        throw new ApiError(400,"Email is required");
    }

    const user = await User.findOne({ //check if user exists
        $or: [{username},{email}]
    })

    if (!user){
        throw new ApiError(404,"User Not Found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(
        200,
        {user: loggedInUser, accessToken, refreshToken},
        "User Logged in successfully"
        ))
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id, // find the user by it
        {
            $set:{          // set the refresh token to undefined hence loggin out the user
                refreshToken: undefined,
            }
        },
        {new: true}  // third parameteer of the findbyidandupdate,whetehr it should return the previous data or the updated one
    )
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV ==="production"
    }
    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json (new ApiResponse(200,{},"User Logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken){
        throw new ApiError(401,"Refresh Token is Required")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if (!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid Refresh Token")
        }

        const options ={
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(
        200,
        {accessToken, refreshToken:newRefreshToken},
        "Access Token refreshed successfully"
        ))

    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordValid){
        throw new ApiError(401,"Old Password is incorrect")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully "))
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200).json(new ApiResponse (200,req.user,"Current user Details"))
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    
    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res) => {
    
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath){
        throw new ApiError (400,"File is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500,"Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user,"Avatar Updated Successfully"))
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
       
    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath){
        throw new ApiError (400,"File is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(500,"Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user,"Cover Image Updated Successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is Required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullname:1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email:1
            }
        },
    ]);

    if (!channel?.length){
        throw new ApiError(404,"Channel not Found");
    }

    return res.status(200),json(new ApiResponse(
        200,
        channel[0],
        "Channel Profile Fetched Successfully"
    ))
})

const getWatchHistory = asyncHandler(async (req,res) => {
    
    const user = await User.aggregate([
        {
            $match: {
                _id : mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!user){
        throw new ApiError(404,"User not found");
    }
    return res.status(200).json(new ApiResponse(200,user[0]?.watchHistory,"Watch History Fetched Successfully"))
})



export{
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}