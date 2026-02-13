import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    pseudo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gridID: { type: mongoose.Schema.Types.ObjectId, ref: 'Grid', default: null },
    myGrids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grid', default: [] }],
    colors: { type: [String], default: ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#c0c0c0', '#905a29'] }
});

const User = mongoose.model('User', userSchema);

export default User;