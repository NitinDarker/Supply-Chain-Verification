import mongoose, { Schema, Document } from "mongoose";

export interface IChainState extends Document {
  chain: any[]; 
  pendingTransactions: any[];
  difficulty: number;
  lastUpdated: Date;
}

const ChainStateSchema: Schema = new Schema({
  chain: { type: Schema.Types.Mixed, required: true },
  pendingTransactions: { type: Schema.Types.Mixed, default: [] },
  difficulty: { type: Number, required: true, default: 2 },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model<IChainState>("ChainState", ChainStateSchema);
