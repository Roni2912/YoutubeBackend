import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingLike = await Like.findOne({ video: videoId, likedBy: userId }).session(session);

        if (existingLike) {
            await Like.findByIdAndDelete(existingLike._id).session(session);
            await session.commitTransaction();
            session.endSession();
            return res.status(200).json(new ApiResponse(200, "Video like removed successfully"));
        } 

        await Like.create([{ video: videoId, likedBy: userId }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(new ApiResponse(201, "Video liked successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, "Something went wrong while toggling like");
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingLike = await Like.findOne({ comment: commentId, likedBy: userId }).session(session);

        if (existingLike) {
            await Like.findByIdAndDelete(existingLike._id).session(session);
            await session.commitTransaction();
            session.endSession();
            return res.status(200).json(new ApiResponse(200, "Comment like removed successfully"));
        }

        await Like.create([{ comment: commentId, likedBy: userId }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(new ApiResponse(201, "Comment liked successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, "Something went wrong while toggling like");
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingLike = await Like.findOne({ tweet:tweetId , likedBy:userId }).session(session);
        if(existingLike){
            await Like.findByIdAndDelete(existingLike._id, { session });
            await session.commitTransaction();
            session.endSession();
            return res.status(200).json(new ApiResponse(200, "Tweet like removed successfully"));
        }

        await Like.create([{tweet:tweetId, likedBy:userId}], { session });
        await session.commitTransaction();
        session.endSession();

        res.status(201).json(new ApiResponse(201, "Tweet liked successfully"));
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500,"Something went wrong while toggling like")
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "Unauthorized request");
    }

    const likedVideos = await Like.find({likedBy:userId}).populate({
        path: "video",
        select: "videoFile title thumbnail views duration owner isPublished",
    }).lean();
    
    if (likedVideos.length === 0) {
        throw new ApiError(404, "No liked videos found");
    }

    res.status(200).json(new ApiResponse(200, likedVideos ,"Liked Video fetched Successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}