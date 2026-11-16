import mongoose, { Types } from 'mongoose';
import { UserModel, IUser, ProfilePrivacy } from './user.model';
import { FollowModel } from './follow.model';
import { UpdateAccountSettingsInput } from './user.types';
import { TokenSessionModel } from '../auth/token.model';
import { AppError } from '../../common/utils/AppError';
import { comparePassword, hashPassword } from '../../common/utils/hash';

export class UserService {
  /**
   * 1. User Profile Retrieval & Updates
   */
  static async getMyProfile(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  static async getUserProfile(identifier: string, viewerId?: string) {
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
    const query = isObjectId
      ? { _id: identifier, isActive: true }
      : { username: identifier.toLowerCase(), isActive: true };

    const targetUser = await UserModel.findOne(query);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const isOwner = viewerId && targetUser._id.toString() === viewerId.toString();

    let followStatus: 'none' | 'pending' | 'accepted' = 'none';
    if (viewerId && !isOwner) {
      const followDoc = await FollowModel.findOne({
        follower: viewerId,
        following: targetUser._id,
      });
      if (followDoc) {
        followStatus = followDoc.status;
      }
    }

    const canViewFullProfile =
      isOwner || targetUser.privacy === 'public' || followStatus === 'accepted';

    if (!canViewFullProfile) {
      // Private profile restricted view
      return {
        id: targetUser._id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        avatarUrl: targetUser.avatarUrl,
        bio: targetUser.bio,
        privacy: targetUser.privacy,
        followersCount: targetUser.followersCount,
        followingCount: targetUser.followingCount,
        followStatus,
        isPrivateAndLocked: true,
      };
    }

    return {
      id: targetUser._id,
      username: targetUser.username,
      fullName: targetUser.fullName,
      ...(isOwner || targetUser.accountSettings.showEmail ? { email: targetUser.email } : {}),
      ...(isOwner || targetUser.accountSettings.showPhone ? { phone: targetUser.phone } : {}),
      bio: targetUser.bio,
      avatarUrl: targetUser.avatarUrl,
      coverUrl: targetUser.coverUrl,
      gender: targetUser.gender,
      dateOfBirth: targetUser.dateOfBirth,
      website: targetUser.website,
      location: targetUser.location,
      privacy: targetUser.privacy,
      followersCount: targetUser.followersCount,
      followingCount: targetUser.followingCount,
      followStatus,
      isPrivateAndLocked: false,
      createdAt: targetUser.createdAt,
    };
  }

  static async updateProfile(
    userId: string,
    updates: Partial<
      Pick<
        IUser,
        | 'username'
        | 'fullName'
        | 'bio'
        | 'avatarUrl'
        | 'coverUrl'
        | 'phone'
        | 'gender'
        | 'dateOfBirth'
        | 'website'
        | 'location'
      >
    >
  ) {
    if (updates.username) {
      updates.username = updates.username.toLowerCase();
      const existing = await UserModel.findOne({
        username: updates.username,
        _id: { $ne: userId },
      });
      if (existing) {
        throw new AppError('Username is already taken', 409);
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    return updatedUser;
  }

  /**
   * 2. Follow / Unfollow System
   */
  static async followUser(followerId: string, targetUserId: string) {
    if (followerId === targetUserId) {
      throw new AppError('You cannot follow yourself', 400);
    }

    const targetUser = await UserModel.findOne({ _id: targetUserId, isActive: true });
    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    const existingFollow = await FollowModel.findOne({
      follower: followerId,
      following: targetUserId,
    });

    if (existingFollow) {
      if (existingFollow.status === 'accepted') {
        throw new AppError('You are already following this user', 400);
      }
      throw new AppError('Follow request is already pending', 400);
    }

    if (targetUser.privacy === 'private') {
      if (!targetUser.accountSettings.allowFollowRequests) {
        throw new AppError('This user does not accept follow requests', 403);
      }

      const followRequest = await FollowModel.create({
        follower: followerId,
        following: targetUserId,
        status: 'pending',
      });

      return {
        status: followRequest.status,
        message: 'Follow request sent',
      };
    }

    await FollowModel.create({
      follower: followerId,
      following: targetUserId,
      status: 'accepted',
    });

    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      UserModel.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } }),
    ]);

    return {
      status: 'accepted' as const,
      message: 'Successfully followed user',
    };
  }

  static async unfollowUser(followerId: string, targetUserId: string) {
    if (followerId === targetUserId) {
      throw new AppError('Invalid operation', 400);
    }

    const followDoc = await FollowModel.findOneAndDelete({
      follower: followerId,
      following: targetUserId,
    });

    if (!followDoc) {
      throw new AppError('You are not following or requesting to follow this user', 404);
    }

    if (followDoc.status === 'accepted') {
      await Promise.all([
        UserModel.updateOne(
          { _id: followerId, followingCount: { $gt: 0 } },
          { $inc: { followingCount: -1 } }
        ),
        UserModel.updateOne(
          { _id: targetUserId, followersCount: { $gt: 0 } },
          { $inc: { followersCount: -1 } }
        ),
      ]);
    }

    return {
      removedStatus: followDoc.status,
    };
  }

  static async getPendingFollowRequests(userId: string) {
    const requests = await FollowModel.find({
      following: userId,
      status: 'pending',
    })
      .populate('follower', 'username fullName avatarUrl bio')
      .sort({ createdAt: -1 });

    return requests;
  }

  static async handleFollowRequest(
    userId: string,
    followerId: string,
    action: 'accept' | 'reject'
  ) {
    const followRequest = await FollowModel.findOne({
      follower: followerId,
      following: userId,
      status: 'pending',
    });

    if (!followRequest) {
      throw new AppError('Pending follow request not found', 404);
    }

    if (action === 'reject') {
      await followRequest.deleteOne();
      return { status: 'rejected' as const };
    }

    followRequest.status = 'accepted';
    await followRequest.save();

    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      UserModel.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } }),
    ]);

    return { status: 'accepted' as const };
  }

  private static async assertCanViewConnections(targetUserId: string, viewerId?: string) {
    const targetUser = await UserModel.findOne({ _id: targetUserId, isActive: true });
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    if (targetUser.privacy === 'public') {
      return;
    }

    if (viewerId && targetUser._id.toString() === viewerId.toString()) {
      return;
    }

    if (viewerId) {
      const isFollower = await FollowModel.exists({
        follower: viewerId,
        following: targetUserId,
        status: 'accepted',
      });
      if (isFollower) {
        return;
      }
    }

    throw new AppError('This account is private. Follow this user to view their connections.', 403);
  }

  static async getFollowers(targetUserId: string, page = 1, limit = 20, viewerId?: string) {
    await this.assertCanViewConnections(targetUserId, viewerId);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      FollowModel.find({ following: targetUserId, status: 'accepted' })
        .populate('follower', 'username fullName avatarUrl bio privacy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FollowModel.countDocuments({ following: targetUserId, status: 'accepted' }),
    ]);

    return {
      followers: items.map((doc) => doc.follower),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getFollowing(targetUserId: string, page = 1, limit = 20, viewerId?: string) {
    await this.assertCanViewConnections(targetUserId, viewerId);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      FollowModel.find({ follower: targetUserId, status: 'accepted' })
        .populate('following', 'username fullName avatarUrl bio privacy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FollowModel.countDocuments({ follower: targetUserId, status: 'accepted' }),
    ]);

    return {
      following: items.map((doc) => doc.following),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. User Search & Suggestions
   */
  static async searchUsers(query: string, page = 1, limit = 20, viewerId?: string) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const filter: Record<string, unknown> = {
      isActive: true,
      'accountSettings.searchable': true,
      $or: [{ username: regex }, { fullName: regex }, { bio: regex }],
    };

    if (viewerId) {
      filter._id = { $ne: viewerId };
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('username fullName avatarUrl bio privacy followersCount followingCount')
        .sort({ followersCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getSuggestedUsers(userId: string, limit = 10) {
    const myFollowDocs = await FollowModel.find({
      follower: userId,
    }).select('following status');

    const myFollowingIds = myFollowDocs.map((doc) => doc.following);
    const acceptedFollowingIds = myFollowDocs
      .filter((doc) => doc.status === 'accepted')
      .map((doc) => doc.following);

    const excludeIds: Types.ObjectId[] = [
      new mongoose.Types.ObjectId(userId),
      ...myFollowingIds,
    ];

    // Step 1: Friends of friends (mutual connections)
    let mutualSuggestions: Array<{ _id: Types.ObjectId; mutualCount: number }> = [];
    if (acceptedFollowingIds.length > 0) {
      mutualSuggestions = await FollowModel.aggregate([
        {
          $match: {
            follower: { $in: acceptedFollowingIds },
            status: 'accepted',
            following: { $nin: excludeIds },
          },
        },
        {
          $group: {
            _id: '$following',
            mutualCount: { $sum: 1 },
          },
        },
        { $sort: { mutualCount: -1 } },
        { $limit: limit },
      ]);
    }

    const mutualUserIds = mutualSuggestions.map((m) => m._id);
    const mutualMap = new Map<string, number>(
      mutualSuggestions.map((m) => [m._id.toString(), m.mutualCount])
    );

    const mutualUsers =
      mutualUserIds.length > 0
        ? await UserModel.find({
            _id: { $in: mutualUserIds },
            isActive: true,
            'accountSettings.searchable': true,
          }).select('username fullName avatarUrl bio privacy followersCount followingCount')
        : [];

    const results = mutualUsers.map((u) => ({
      ...u.toObject(),
      mutualFollowersCount: mutualMap.get(u._id.toString()) || 0,
    }));

    // Step 2: Fill remaining slots with popular users not yet followed
    if (results.length < limit) {
      const remaining = limit - results.length;
      const alreadyIncludedIds = [
        ...excludeIds,
        ...results.map((r) => new mongoose.Types.ObjectId(r._id.toString())),
      ];

      const popularUsers = await UserModel.find({
        _id: { $nin: alreadyIncludedIds },
        isActive: true,
        'accountSettings.searchable': true,
      })
        .select('username fullName avatarUrl bio privacy followersCount followingCount')
        .sort({ followersCount: -1, createdAt: -1 })
        .limit(remaining);

      for (const u of popularUsers) {
        results.push({
          ...u.toObject(),
          mutualFollowersCount: 0,
        });
      }
    }

    return results;
  }

  /**
   * 4. Account Settings & Privacy Control (Public vs Private profile)
   */
  static async updatePrivacy(userId: string, privacy: ProfilePrivacy) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const previousPrivacy = user.privacy;
    user.privacy = privacy;
    await user.save();

    // When switching from private to public, automatically accept pending follow requests
    if (previousPrivacy === 'private' && privacy === 'public') {
      const pendingRequests = await FollowModel.find({
        following: user._id,
        status: 'pending',
      });

      if (pendingRequests.length > 0) {
        const followerIds = pendingRequests.map((r) => r.follower);
        await FollowModel.updateMany(
          { following: user._id, status: 'pending' },
          { $set: { status: 'accepted' } }
        );

        await Promise.all([
          UserModel.updateMany(
            { _id: { $in: followerIds } },
            { $inc: { followingCount: 1 } }
          ),
          UserModel.findByIdAndUpdate(user._id, {
            $inc: { followersCount: pendingRequests.length },
          }),
        ]);
      }
    }

    return UserModel.findById(userId);
  }

  static async updateAccountSettings(
    userId: string,
    input: UpdateAccountSettingsInput
  ) {
    if (input.privacy) {
      await this.updatePrivacy(userId, input.privacy);
    }

    const settingsUpdate: Record<string, unknown> = {};
    if (input.allowFollowRequests !== undefined) {
      settingsUpdate['accountSettings.allowFollowRequests'] = input.allowFollowRequests;
    }
    if (input.showEmail !== undefined) {
      settingsUpdate['accountSettings.showEmail'] = input.showEmail;
    }
    if (input.showPhone !== undefined) {
      settingsUpdate['accountSettings.showPhone'] = input.showPhone;
    }
    if (input.searchable !== undefined) {
      settingsUpdate['accountSettings.searchable'] = input.searchable;
    }

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $set: settingsUpdate },
      { new: true }
    );

    if (!updated) {
      throw new AppError('User not found', 404);
    }

    return updated;
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.password) {
      throw new AppError(
        'This account uses Google Sign-In and does not have a local password set.',
        400
      );
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    await TokenSessionModel.updateMany(
      { userId: user._id, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  static async deactivateAccount(userId: string) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    await TokenSessionModel.updateMany(
      { userId: user._id, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }
}

