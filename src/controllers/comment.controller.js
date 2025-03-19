import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId format");
    }
    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const totalComments = await Comment.countDocuments({ video: videoId });

    if (totalComments === 0) {
        throw new ApiError(404, "No comments found for this video!");
    }
    
    const comments = await Comment.find({ video: videoId })
    .select("content owner createdAt")
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

    return res
    .status(200)
    .json( new ApiResponse(200, { 
        comments,
        totalComments,
        totalPages: Math.ceil(totalComments / limitNum),
        currentPage: pageNum
    },
        "Comments fetched Successfully" ))

})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId format");
    }

    if (!content) {
       throw new ApiError(400, "Content is required");
    }

    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }

    const newComment = await Comment.create({
        content,
        video: [videoId], 
        owner: req.user._id
    });

    const populatedComment = await Comment.aggregate([
        { $match: { _id: newComment._id } },
        { 
            $lookup: { 
                from: "videos", 
                localField: "video", 
                foreignField: "_id", 
                as: "videoDetails" 
            } 
        },
        { 
            $lookup: { 
                from: "users", 
                localField: "owner", 
                foreignField: "_id", 
                as: "ownerDetails" 
            } 
        },
        { $unwind: "$ownerDetails" }, 
    ]);

    return res.status(201).json( new ApiResponse(201, populatedComment[0],"Comment added successfully"))
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid commentId format");
    }

    if (!content) {
       throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findOneAndUpdate(
        { _id: commentId, owner: req.user.id }, 
        { content }, 
        { new: true, runValidators: true }
    );

    if (comment.content === content) {
        throw new ApiError(400, "No changes detected");
    }

    return res.status(200).json(new ApiResponse(200,comment,"Comment updated Successfully!"))
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid commentId format");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "comment not found");
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "Unauthorized: You can only delete your own comment");
    }
    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(new ApiResponse(200,{},"Comment deleted successfully"));
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }



 find({
    $and: [
        {age: {$gt: 25}},
        {status: "active"}
    ]
 })   

{$or: [{},{}]}