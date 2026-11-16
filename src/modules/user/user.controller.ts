import { Request, Response } from 'express';
import { UserService } from './user.service';
import { sendResponse } from '../../common/utils/response';

export class UserController {
  // 1. User Profile Retrieval & Updates
  static async getMyProfile(req: Request, res: Response) {
    const user = await UserService.getMyProfile(req.user!._id.toString());
    return sendResponse(res, 200, 'Profile retrieved successfully', { user });
  }

  static async updateMyProfile(req: Request, res: Response) {
    const user = await UserService.updateProfile(req.user!._id.toString(), req.body);
    return sendResponse(res, 200, 'Profile updated successfully', { user });
  }

  static async getUserProfile(req: Request, res: Response) {
    const identifier = String(req.params.identifier);
    const viewerId = req.user?._id.toString();
    const profile = await UserService.getUserProfile(identifier, viewerId);
    return sendResponse(res, 200, 'User profile retrieved successfully', { profile });
  }

  // 2. Follow / Unfollow System
  static async followUser(req: Request, res: Response) {
    const targetUserId = String(req.params.targetUserId);
    const result = await UserService.followUser(req.user!._id.toString(), targetUserId);
    return sendResponse(res, 200, result.message, { status: result.status });
  }

  static async unfollowUser(req: Request, res: Response) {
    const targetUserId = String(req.params.targetUserId);
    const result = await UserService.unfollowUser(req.user!._id.toString(), targetUserId);
    return sendResponse(res, 200, 'Unfollowed user successfully', result);
  }

  static async getPendingFollowRequests(req: Request, res: Response) {
    const requests = await UserService.getPendingFollowRequests(req.user!._id.toString());
    return sendResponse(res, 200, 'Pending follow requests retrieved', { requests });
  }

  static async handleFollowRequest(req: Request, res: Response) {
    const followerId = String(req.params.followerId);
    const { action } = req.body;
    const result = await UserService.handleFollowRequest(
      req.user!._id.toString(),
      followerId,
      action
    );
    return sendResponse(res, 200, `Follow request ${result.status}`, result);
  }

  static async getFollowers(req: Request, res: Response) {
    const userId = String(req.params.userId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await UserService.getFollowers(
      userId,
      page,
      limit,
      req.user?._id.toString()
    );
    return sendResponse(res, 200, 'Followers retrieved successfully', result);
  }

  static async getFollowing(req: Request, res: Response) {
    const userId = String(req.params.userId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await UserService.getFollowing(
      userId,
      page,
      limit,
      req.user?._id.toString()
    );
    return sendResponse(res, 200, 'Following list retrieved successfully', result);
  }

  // 3. User Search & Suggestions
  static async searchUsers(req: Request, res: Response) {
    const q = String(req.query.q);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await UserService.searchUsers(
      q,
      page,
      limit,
      req.user?._id.toString()
    );
    return sendResponse(res, 200, 'Search results retrieved successfully', result);
  }

  static async getSuggestedUsers(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 10;
    const suggestions = await UserService.getSuggestedUsers(
      req.user!._id.toString(),
      limit
    );
    return sendResponse(res, 200, 'User suggestions retrieved successfully', {
      suggestions,
    });
  }

  // 4. Account Settings & Privacy Control (Public vs Private profile)
  static async updatePrivacy(req: Request, res: Response) {
    const { privacy } = req.body;
    const user = await UserService.updatePrivacy(req.user!._id.toString(), privacy);
    return sendResponse(res, 200, `Profile privacy updated to ${privacy}`, { user });
  }

  static async updateAccountSettings(req: Request, res: Response) {
    const user = await UserService.updateAccountSettings(
      req.user!._id.toString(),
      req.body
    );
    return sendResponse(res, 200, 'Account settings updated successfully', { user });
  }

  static async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    await UserService.changePassword(
      req.user!._id.toString(),
      currentPassword,
      newPassword
    );
    return sendResponse(
      res,
      200,
      'Password changed successfully. Please log in again.'
    );
  }

  static async deactivateAccount(req: Request, res: Response) {
    await UserService.deactivateAccount(req.user!._id.toString());
    return sendResponse(res, 200, 'Account deactivated successfully');
  }
}

