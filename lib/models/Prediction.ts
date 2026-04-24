import mongoose, { Document, Schema } from 'mongoose'

export interface IPrediction extends Document {
  deviceId: string
  input: {
    temperature: number
    humidity: number
    moisture: number
    fanSpeed: number
    timeElapsed: number
    solarVoltage?: number
  }
  output: {
    predictedMoisture30min: number
    estimatedMinutesToTarget: number
    recommendation: string
    recommendationType: string
    efficiencyScore: number
    confidence: number
    isDryingComplete: boolean
    projectedCurve: { time: number; moisture: number }[]
    targetMoisture: number
    algorithm: string
  }
  isDryingComplete: boolean
  createdAt: Date
  updatedAt: Date
}

const PredictionSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
  },
  input: {
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    moisture: { type: Number, required: true },
    fanSpeed: { type: Number, required: true },
    timeElapsed: { type: Number, required: true },
    solarVoltage: { type: Number },
  },
  output: {
    predictedMoisture30min: { type: Number, required: true },
    estimatedMinutesToTarget: { type: Number, required: true },
    recommendation: { type: String, required: true },
    recommendationType: { type: String, required: true },
    efficiencyScore: { type: Number, required: true },
    confidence: { type: Number, required: true },
    isDryingComplete: { type: Boolean, required: true },
    projectedCurve: [{
      time: { type: Number, required: true },
      moisture: { type: Number, required: true },
    }],
    targetMoisture: { type: Number, default: 14 },
    algorithm: { type: String, default: 'rule-based-v1' },
  },
  isDryingComplete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
})

PredictionSchema.index({ deviceId: 1, createdAt: -1 })

export default mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema)
