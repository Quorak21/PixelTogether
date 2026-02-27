import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGOURL)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));
