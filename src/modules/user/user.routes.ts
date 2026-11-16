import { Router } from 'express';
import { UserController } from './user.controller';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middlewares/validate.middleware';
import { authenticate, optionalAuthenticate } from '../../common/middlewares/auth.middleware';
import {
  updateProfileSchema,
  updatePrivacySchema,
  updateAccountSettingsSchema,
  changePasswordSchema,
  targetUserParamSchema,
  handleFollowRequestSchema,
  userIdListSchema,
  searchUsersSchema,
  suggestionsQuerySchema,
} from './user.validation';

const router = Router();

// User Search & Suggestions
router.get(
  '/search',
  optionalAuthenticate,
  validate(searchUsersSchema),
  asyncHandler(UserController.searchUsers)
);
router.get(
  '/suggestions',
  authenticate,
  validate(suggestionsQuerySchema),
  asyncHandler(UserController.getSuggestedUsers)
);

// Authenticated User Profile Retrieval & Updates
router.get('/me', authenticate, asyncHandler(UserController.getMyProfile));
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(UserController.updateMyProfile)
);

// Account Settings & Privacy Control (Public vs Private profile)
router.patch(
  '/me/privacy',
  authenticate,
  validate(updatePrivacySchema),
  asyncHandler(UserController.updatePrivacy)
);
router.patch(
  '/me/settings',
  authenticate,
  validate(updateAccountSettingsSchema),
  asyncHandler(UserController.updateAccountSettings)
);
router.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(UserController.changePassword)
);
router.patch(
  '/me/deactivate',
  authenticate,
  asyncHandler(UserController.deactivateAccount)
);

// Follow Requests Management (for Private Profiles)
router.get(
  '/me/follow-requests',
  authenticate,
  asyncHandler(UserController.getPendingFollowRequests)
);
router.patch(
  '/me/follow-requests/:followerId',
  authenticate,
  validate(handleFollowRequestSchema),
  asyncHandler(UserController.handleFollowRequest)
);

// Public / Private User Profile Retrieval by ID or Username
router.get(
  '/profile/:identifier',
  optionalAuthenticate,
  asyncHandler(UserController.getUserProfile)
);

// Follow / Unfollow System
router.post(
  '/:targetUserId/follow',
  authenticate,
  validate(targetUserParamSchema),
  asyncHandler(UserController.followUser)
);
router.delete(
  '/:targetUserId/follow',
  authenticate,
  validate(targetUserParamSchema),
  asyncHandler(UserController.unfollowUser)
);
router.get(
  '/:userId/followers',
  optionalAuthenticate,
  validate(userIdListSchema),
  asyncHandler(UserController.getFollowers)
);
router.get(
  '/:userId/following',
  optionalAuthenticate,
  validate(userIdListSchema),
  asyncHandler(UserController.getFollowing)
);

export default router;

