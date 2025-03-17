import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import User from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
     const { content } = req.body;
     const user = req.user; 
     if (!content) {
         throw new ApiError(400, "Content must be required!");
     }
 
     if (!user || !user._id) {
         throw new ApiError(401, "Unauthorized: User not found");
     }
 
     const newTweet = await Tweet.create({
         content,
         owner: user._id
     });
 
     return res.status(201).json(
         new ApiResponse(201, newTweet, "Tweet created successfully")
     );
});

const getUserTweets = asyncHandler(async (req, res) => {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return next(new ApiError(400, "Invalid userId format"));;
        }
        
        if(!userId){
            throw new ApiError(400, "User must be logged In")
        }

        const getUserTweet = await Tweet.find({ owner: userId }).select("content");
        console.log("sns is:",getUserTweet);
        
        if(!getUserTweet || getUserTweet.length === 0){
            throw new ApiError(404,"Tweet not found")
        }

        return res.status(200).json(
            new ApiResponse(200, getUserTweet, "Tweets fetched successfully")
        );
});

const updateTweet = asyncHandler(async (req, res) => {
        const { tweetId } = req.params;
        const { content } = req.body;

        if (!mongoose.Types.ObjectId.isValid(tweetId)) {
            return next(new ApiError(400, "Invalid tweetId format"));;
        }
        

        if (!content) {
            return next(new ApiError(400, "Content is required"));
        }

        const updatedTweet = await Tweet.findByIdAndUpdate( tweetId, {content:content},{new: true, runValidators: true}).select("content");

        if (!updatedTweet) {
            return next(new ApiError(404, "Tweet not found"));
        }

        return res.status(200).json(new ApiResponse(200,updatedTweet,"Tweet updated successfully"))
});

const deleteTweet = asyncHandler(async (req, res) => {
        const { tweetId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(tweetId)) {
            return next(new ApiError(400, "Invalid tweetId format"));;
        }

        const tweet = await Tweet.findById(tweetId);
        if (!tweet) {
            return next(new ApiError(404, "Tweet not found"));
        }

        if(tweet.owner.toString() !== req.user._id.toString()){
            return next(new ApiError(403, "Unauthorized: You can only delete your own tweet"));
        }

        await Tweet.findByIdAndDelete(tweetId);

        return res.status(200).json(new ApiResponse(200,{},"Tweet deleted successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}