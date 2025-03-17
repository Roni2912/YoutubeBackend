import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    owner : {
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    content : {
        type: String,
        required: true,
        trim: true,
        maxlength: [280, "Tweet cannot exceed 280 characters"]

    }
}, {
    timestamps: true
});

export const Tweet = mongoose.model("Tweet", tweetSchema)