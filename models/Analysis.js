const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['text', 'file', 'url'], required: true },
  inputText: { type: String },
  fileName: { type: String },
  url: { type: String },
  result: {
    hasRisks: { type: Boolean },
    risks: [{
      clause: String,
      level: { type: String, enum: ['high', 'medium', 'low'] },
      explanation: String
    }],
    laws: [String],
    recommendations: [String],
    summary: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analysis', analysisSchema);
