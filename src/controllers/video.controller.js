import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import User from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const aggregateQuery = await  Video.aggregate([
        {
            $match :{
                $or: [
                    { title: {$regex: query, $options: "i"}},
                    { description: { $regex: query, $options: "i" }}
                ]
            }
        },
        ...(userId ? [{
            $match :{
                _id: new mongoose.Types.ObjectId(userId)
            }
        }] : []),
        {
            $lookup: {
                from : "users",
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $sort : {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                user: {
                    username: 1,
                    email: 1
                  },
                createdAt: 1
            }
        }

    ])

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await Video.aggregatePaginate(aggregateQuery, options);

    return res
    .status(200)
    .json(
        new ApiResponse(200, result,"Video fetched Successfully" )
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if(!title || !description){
        throw new ApiError(400, "title and description are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    

    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required")
    }

    const videoFile = await  uploadOnCloudinary(videoLocalPath);
    const thumbnail = thumbnailLocalPath ? await  uploadOnCloudinary(thumbnailLocalPath) : null;

    if(!videoFile?.url){
        throw new ApiError(400, "Failed to upload video on Cloudinary")
    }
    
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail?.url || "",
        duration : videoFile?.duration || 0
    });

    if(!video){
        throw new ApiError(500, "Something went wrong while uploading video")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            video,
            "Video uploaded successfully"
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(400, "opps! Video not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video fetched Successfully"
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!videoId) {
        throw new ApiError(400, "Video ID is required")
    }

    const existingVideo = await Video.findById(videoId);

    if (!existingVideo) {
        throw new ApiError(404, "Video not found")
    }

    const updateFields = {}

    if (title) updateFields.title = title
    if (description) updateFields.description = description

    if (req.file) {
        const thumbnailLocalPath = req.file.path

        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Thumbnail file is missing")
        }

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail?.url) {
            throw new ApiError(400, "Error while uploading thumbnail")
        }

        updateFields.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        {
            new: true,  
            runValidators: true  
        }
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Error while updating video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideo,
                "Video updated successfully"
            )
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400,"Video ID is required")
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(400, "video not found")
    }

    await video.deleteOne()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video deleted Successfully"
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
   try {
     const { videoId } = req.params
     const userId = req.user?._id

     if(!videoId?.trim() || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid video ID");
     }

     const video = await Video.findOne({
        _id: videoId
     });

     if(!video){
        throw new ApiError(400, "Video not found")
     }

     video.isPublished = !video.isPublished

     const updateVideo = await video.save();

     return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updateVideo,
                    `Video ${video.isPublished ? 'published' : 'unpublished'} successfully`
                )
            )

   } catch (error) {
        console.error("Toggle Publish Status Error:", error)
        throw error
   }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}