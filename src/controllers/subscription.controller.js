import mongoose, {isValidObjectId} from "mongoose"
import User from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if(userId.equals(channelId)){
        throw new ApiError(400,"You cannot subscribe to yourself")
    }

    const channelExists = await User.findById(channelId);
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOneAndDelete({
        subscriber: userId,
        channel: channelId
    })

    if (existingSubscription) {
        return res.status(204).json(new ApiResponse(204, "Unsubscribed successfully"));
    }

    await Subscription.create({ subscriber: userId, channel: channelId });

    return res.status(201).json(new ApiResponse(201, "Subscribed successfully"));
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const channelExists = await User.exists({ _id: channelId });
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribers = await Subscription.find({ channel: channelId }).populate("subscriber", "username fullName avatar");

    return res.status(200).json(new ApiResponse(200, "Subscribers fetched successfully", {
        count: subscribers.length,
        subscribers: subscribers.map(sub => sub.subscriber)
    }));
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    if (!userId.equals(subscriberId)) {
        throw new ApiError(403, "You are not allowed to access another user's subscriptions");
    }

    const userExists = await User.exists({ _id: subscriberId });
    if (!userExists) {
        throw new ApiError(404, "Subscriber not found");
    }

    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username fullName avatar");

    return res.status(200).json(new ApiResponse(200, "Subscribed channels fetched successfully", {
        count: subscriptions.length,
        channels: subscriptions.map(sub => sub.channel)
    }));

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}