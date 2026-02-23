import mongoose from 'mongoose';

const gridSchema = new mongoose.Schema({
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    isPublic: { type: Boolean, default: false },
    ownerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isFinished: { type: Boolean, default: false },
    pixels: { type: Map, of: String, default: {} }
});

const Grid = mongoose.model('Grid', gridSchema);

export default Grid;