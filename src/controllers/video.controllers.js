import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { title } from "process"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const skip = (page - 1) * limit

    const video = await Video.aggregate([
        {
            $match: query
        },
        {
            $sort: {sortBy : sortType} || {createdAt: -1}
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        }
    ])

    if (!video){
        throw new ApiError(404,"Videos not found");
    }
    return res.status(200).json(new ApiResponse(200,video[0],"Video Query Fetched Successfully"))
})//done

const publishAVideo = asyncHandler(async (req, res) => {    
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.video?.[0]?.path

    if (!videoLocalPath){
        throw new ApiError(400,"video file is missing")
    }

    let videoLink;
    try {
        videoLink = await uploadOnCloudinary(videoLocalPath)
    } catch (error) {
        console.log("error uploading video",error);
        throw new ApiError(500,"Failed to upload Video on cloudinary")
    }

    try {
        const video = await Video.Create({
            title,
            description,
            videoFile: videoLink.url
        })
    } catch (error) {
        await deleteFromCloudinary(videoLink)
        throw new ApiError(500,"Failed to create video on mongodb")
    }
    return res.status(200).json(new ApiResponse(200,"Video uploaded Successfully"))

})//done

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    try {
        const video = await findById(videoId)
        return res.status(200).json(new ApiResponse(200,video[0],"Video Fetched Successfully"))
    } catch (error) {
        throw new ApiError(404,"Video Not Found")
    }
})//done

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    const { videoId } = req.params
    const {newTitle, newDescription} = req.body
    const thumbnailLocalPath = req.files?.video?.[0]?.path

    if (!thumbnailLocalPath){
        throw new ApiError(400,"Upload a new thumbnail")
    }
    
    const newThumbnailcloud = await uploadOnCloudinary(thumbnailLocalPath)

    if (!newThumbnailcloud.url){
        throw new ApiError(400,"Video Not uploaded")
    }

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $set:{
                thumbnail: newThumbnailcloud.url,
                title: newTitle,
                description:newDescription
            }
        }
    )
    return res.status(200).json(new ApiResponse(200, video,"Video Updated Successfully"))
})//done

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video = Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"video not found");
    }

    await deleteFromCloudinary(video.videoFile)
    
    await findByIdandDelete(videoId)

    return res.status(200).json(new ApiResponse(200,"Video deleted Successfullt"))

})//done

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    const video = findByIdAndUpdate(videoId,
        {
            $set:{
                isPublished: !isPublished
            }
        }
    )


})//done

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}