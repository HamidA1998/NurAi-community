import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerCommunityRoutes } from "./community";
import { registerCommunitySocialRoutes } from "./communitySocial";
import { registerCommunityCircleRoutes } from "./communityCircles";
import { registerAuthRoutes } from "./auth";
import { registerFamilyRoutes } from "./family";
import { registerFamilyPlacesRoutes } from "./familyPlaces";
import { registerPlacesRoutes } from "./places";
import { registerNasheedRoutes } from "./nasheeds";
import { registerProgressRoutes } from "./progress";
import { registerRevenueCatWebhookRoutes } from "./revenuecatWebhook";
import { registerLibrarySourceReviewRoutes } from "./librarySourceReview";
import { registerSubscriptionSyncRoutes } from "./subscriptionSync";
import { registerNotificationRoutes } from "./notifications";
import { registerTravelRoutes } from "./travel";
import { registerWalletPassRoutes } from "./wallet/walletPassRoutes";
import { registerHealthRoutes } from "./health";
import { registerAIRoutes } from "./ai/routes";
import { registerPersonalAIRoutes } from "./ai/personalAIRoute";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerScholarAgentRoutes } from "./replit_integrations/scholar-agent";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAuthRoutes(app);
  registerCommunityRoutes(app);
  registerCommunitySocialRoutes(app);
  registerCommunityCircleRoutes(app);
  registerFamilyRoutes(app);
  registerFamilyPlacesRoutes(app);
  registerPlacesRoutes(app);
  registerNasheedRoutes(app);
  registerProgressRoutes(app);
  registerSubscriptionSyncRoutes(app);
  registerNotificationRoutes(app);
  registerTravelRoutes(app);
  registerWalletPassRoutes(app);
  registerHealthRoutes(app);
  registerAIRoutes(app);
  registerPersonalAIRoutes(app);
  registerChatRoutes(app);
  registerAudioRoutes(app);
  registerScholarAgentRoutes(app);
  registerRevenueCatWebhookRoutes(app);
  registerLibrarySourceReviewRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
