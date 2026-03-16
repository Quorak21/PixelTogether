import mongoose from 'mongoose';

const gridSchema = new mongoose.Schema({
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    ownerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pixels: { type: Map, of: String, default: {} },
    image: { type: String, default: null },
    type: {
        type: String,
        enum: ['public', 'limited', 'private'],
        default: 'public'
    },
    invitedUsers: { type: Array, default: [] }
});

const Grid = mongoose.model('Grid', gridSchema);

export default Grid;