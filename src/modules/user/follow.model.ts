import mongoose, { Schema } from 'mongoose';
import { IFollow } from './user.types';

export { IFollow, FollowStatus } from './user.types';

const followSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['accepted', 'pending'],
      default: 'accepted',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const FollowModel = mongoose.model<IFollow>('Follow', followSchema);

