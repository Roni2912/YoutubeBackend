import mongoose from "mongoose"
import Playlist from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 50) {
        throw new ApiError(400, "Name must be between 3-50 characters");
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 200) {
        throw new ApiError(400, "Description must be between 10-200 characters");
    }

    const user = await req.user;

    if(!user || !user._id){
        throw new ApiError(400,"Unauthorized: User not found")
    }

    const existingPlayList = await Playlist.findOne({name: name.trim(), owner: user._id});
    if (existingPlayList) {
        throw new ApiError(400,"Playlist with this name already exists")
    }

    const newPlayList = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner:user._id,
        videos:[]
    })

    return res
    .status(201)
    .json(
        new ApiResponse(200,newPlayList,"PlayList created successfully")
    )


});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!userId){
        throw new ApiError(400,"User ID is required")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID format");
    }

    const userPlayList = await Playlist.find({owner: userId}).lean()

    if(userPlayList.length === 0){
        throw new ApiError(404,"No playlists found for this user")
    }

    return res.status(200).json(new ApiResponse(200,userPlayList,"PlayList fetched successfully" ));

    // TODO : For LoggedIn user playList
    // const userId = req.user?._id; // Get logged-in user ID

    // if (!userId) {
    //     throw new ApiError(401, "Unauthorized access"); // 401 for authentication issues
    // }

    // const userPlaylists = await Playlist.find({ owner: userId }).lean();

    // return res.status(200).json(new ApiResponse(200, userPlaylists, "Playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!playlistId){
        throw new ApiError(400,"play List Id is required")
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist format");
    }

    const playList = await Playlist.findById(playlistId).populate("videos", "videoFile title duration").populate("owner", "name email").select("name description videos owner").lean();

    if (!playList) {
        throw new ApiError(404,"Playlist not found");
    }

    return res.status(200).json( new ApiResponse(200,playList,"PlatList fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!playlistId || !videoId) {
        throw new ApiError(400, "Playlist ID and Video ID are required!");
    }

    const userId = req.user?._id; 
    if (!userId) {
        throw new ApiError(401, "Unauthorized! Please log in.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }
    if (!playlist.owner.equals(userId)) {
        throw new ApiError(403, "You do not have permission to modify this playlist.");
    }

    const updatedPlaylist = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
        { $addFields: { videos: { $setUnion: ["$videos", [new mongoose.Types.ObjectId(videoId)]] } } },
        { $lookup: { from: "videos", localField: "videos", foreignField: "_id", as: "videos" } },
        { $project: { "videos.title": 1, "videos.duration": 1 } }
    ]);

    if (!updatedPlaylist.length) {
        throw new ApiError(500, "Failed to update the playlist.");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist[0], "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
   
    if (!playlistId || !videoId) {
        throw new ApiError(400, "Playlist ID and Video ID are required!");
    }

    const userId = req.user?._id; 
    if (!userId) {
        throw new ApiError(401, "Unauthorized! Please log in.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }
    if (!playlist.owner.equals(userId)) {
        throw new ApiError(403, "You do not have permission to modify this playlist.");
    }
    
    const updatedPlaylist  = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull : { videos:videoId } },
        { new: true }
    ).populate("videos", "title duration");

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video from playlist.");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!playlistId ) {
        throw new ApiError(400, "Playlist ID is required!");
    }

    const userId = req.user?._id; 
    if (!userId) {
        throw new ApiError(401, "Unauthorized! Please log in.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }
    if (!playlist.owner.equals(userId)) {
        throw new ApiError(403, "You do not have permission to delete this playlist.");
    }

    // TODOS: Remove playlist reference from videos before deleting the playlist
    // await Video.updateMany({ playlists: playlistId }, { $pull: { playlists: playlistId } });

    const deletedPlaylist  = await Playlist.findByIdAndDelete(playlistId);
    if (!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete playlist.");
    }

    return res.status(200).json( new ApiResponse(200,{},"Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!playlistId ) {
        throw new ApiError(400, "Playlist ID is required!");
    }
    
    if (!name || !description || !name.trim() || !description.trim()) {
        throw new ApiError(400, "Name and description are required!");
    }

    const userId = req.user?._id; 
    if (!userId) {
        throw new ApiError(401, "Unauthorized! Please log in.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }
   
    if (!playlist.owner.equals(userId)) {
        throw new ApiError(403, "You do not have permission to modify this playlist.");
    }

    const updatedPlayList = await Playlist.findByIdAndUpdate(
        playlistId,
        {
           $set: {name, description}
        },
        {
            new: true,
            runValidators: true
        }
    )

    if (!updatedPlayList) {
        throw new ApiError(304, "No changes made to the playlist.");
    }

    return res.status(200).json(new ApiResponse(200,updatedPlayList,"PlayList updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}