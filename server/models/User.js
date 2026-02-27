import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    pseudo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gridID: { type: mongoose.Schema.Types.ObjectId, ref: 'Grid', default: null },
    myGrids: [{ nom: String, image: String }],
    colors: { type: [String], default: ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#c0c0c0', '#905a29', '#ff8000', '#ff69b4', '#8b00ff', '#00ced1', '#006400', '#808080', '#1b1464', '#800000'] }
});

const User = mongoose.model('User', userSchema);

export default User;