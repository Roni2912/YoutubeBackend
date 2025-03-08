import mongoose ,{ Schema } from "mongoose";
import mongooseAggregatePaginate from "mongooseAggregatePaginate";

const videoSchema = new Schema({
    videoFile: {
        type: String, // Cloudinary URL
        required: true
    },
    thumbnail:{
        type: String, // Cloudinary URL
        required: true
    },
    title:{
        type: String, 
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,  // Cloudinary URL
        required: true
    },
    views:{
        type: Number,
        default: 0
    },
    isPublished:{
        type: Boolean,
        default: false
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
},
{
    timestamps: true
}
);

videoSchema.plugin(mongooseAggregatePaginate)

export default Video = mongoose.model("Video", videoSchema)