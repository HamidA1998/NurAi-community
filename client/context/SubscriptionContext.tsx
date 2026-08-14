/* eslint-disable @typescript-eslint/no-require-imports, react-hooks/exhaustive-deps -- RevenueCat is loaded as a stable optional native module singleton so dev/web builds do not crash when the SDK is unavailable. */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { AppState, Platform, Linking } from "react-native";
import { AuthContext } from "./AuthContext";
import {
  createRecentPaidTier,
  findRevenueCatPackage,
  higherPlanTier,
  revenueCatCustomerInfoAppUserIds,
  resolvePlanTierWithRecentPaidTier,
  resolvePurchasedPackageTier,
  resolveRevenueCatPlanTier,
  type RecentPaidTier,
  type PlanTier,
} from "@/services/subscriptionTier";
import { apiRequest } from "@/lib/query-client";

let purchasesModule: any | null | undefined;

function getPurchasesModule(): any | null {
  if (purchasesModule !== undefined) return purchasesModule;

  try {
    const required = require("react-native-purchases");
    purchasesModule = required?.default ?? required;
  } catch {
    purchasesModule = null;
  }

  return purchasesModule;
}

const STORE_UNAVAILABLE_MESSAGE =
  "Plans are temporarily unavailable. Please try again shortly or restore an existing purchase.";
const STORE_LOAD_ERROR_MESSAGE =
  "Plans could not be loaded. Please try again shortly or restore an existing purchase.";
const DEV_STORE_UNAVAILABLE_MESSAGE =
  "Plans are not configured in this development build.";
const ENTITLEMENT_REFRESH_THROTTLE_MS = 15_000;
const ENABLE_QA_AUTH_BYPASS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";

function isExpectedQAAuthError(error: unknown): boolean {
  if (!ENABLE_QA_AUTH_BYPASS) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const responseBody =
    error && typeof error === "object"
      ? (error as { responseBody?: unknown }).responseBody
      : undefined;
  const responseText =
    responseBody && typeof responseBody === "object"
      ? JSON.stringify(responseBody)
      : typeof responseBody === "string"
        ? responseBody
        : "";
  return /not authenticated|please sign in again/i.test(
    `${message} ${responseText}`,
  );
}

function revenueCatPublicApiKey(): string | undefined {
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || undefined;
  }

  if (Platform.OS === "ios") {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() ||
      process.env.EXPO_PUBLIC_REVENUECAT_KEY?.trim() ||
      undefined
    );
  }

  return process.env.EXPO_PUBLIC_REVENUECAT_KEY?.trim() || undefined;
}

function availablePackageCount(offering: any): number {
  return Array.isArray(offering?.availablePackages)
    ? offering.availablePackages.length
    : 0;
}

function pickAvailableOffering(offeringsResult: any): any | null {
  const currentOffering = offeringsResult?.current;
  if (availablePackageCount(currentOffering) > 0) return currentOffering;

  const allOfferings =
    offeringsResult?.all && typeof offeringsResult.all === "object"
      ? Object.values(offeringsResult.all)
      : [];

  return (
    allOfferings.find((offering: any) => availablePackageCount(offering) > 0) ||
    null
  );
}

function availablePackagesForOffering(offering: any): any[] {
  return Array.isArray(offering?.availablePackages)
    ? offering.availablePackages
    : [];
}

function revenueCatPackageKey(pkg: any): string {
  return [
    pkg?.identifier,
    pkg?.packageType,
    pkg?.product?.identifier,
    pkg?.product?.productIdentifier,
    pkg?.product?.id,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

function uniqueRevenueCatPackages(packages: any[]): any[] {
  const seen = new Set<string>();
  return packages.filter((pkg) => {
    const key = revenueCatPackageKey(pkg);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function allPackagesFromOfferings(offeringsResult: any): any[] {
  const allOfferings =
    offeringsResult?.all && typeof offeringsResult.all === "object"
      ? Object.values(offeringsResult.all)
      : [];

  return uniqueRevenueCatPackages([
    ...availablePackagesForOffering(offeringsResult?.current),
    ...allOfferings.flatMap((offering: any) =>
      availablePackagesForOffering(offering),
    ),
  ]);
}

function offeringWithAllAvailablePackages(offeringsResult: any): any | null {
  const availableOffering = pickAvailableOffering(offeringsResult);
  const availablePackages = allPackagesFromOfferings(offeringsResult);

  if (!availableOffering && availablePackages.length === 0) return null;

  return {
    ...(availableOffering || offeringsResult?.current || {}),
    availablePackages,
  };
}

function missingRequiredPlanOptions(offering: any): string[] {
  const packages = availablePackagesForOffering(offering);
  const requiredOptions: {
    label: string;
    tier: Exclude<PlanTier, "free">;
    period: "monthly" | "annual";
  }[] = [
    { label: "Premium monthly", tier: "premium", period: "monthly" },
    { label: "Premium yearly", tier: "premium", period: "annual" },
    { label: "Scholar monthly", tier: "scholar", period: "monthly" },
    { label: "Scholar yearly", tier: "scholar", period: "annual" },
  ];

  return requiredOptions
    .filter(
      ({ tier, period }) => !findRevenueCatPackage(packages, tier, period),
    )
    .map(({ label }) => label);
}

function offeringHasAllRequiredPlanOptions(offering: any): boolean {
  return missingRequiredPlanOptions(offering).length === 0;
}

interface SubscriptionContextType {
  isPremium: boolean;
  isScholar: boolean;
  isLifetime: boolean;
  currentPlan: PlanTier;
  hasPaidAPIAccess: boolean;
  offerings: any | null;
  storeReady: boolean;
  storeError: string | null;
  loading: boolean;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkEntitlements: (options?: { force?: boolean }) => Promise<void>;
  manageSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isScholar: false,
  isLifetime: false,
  currentPlan: "free",
  hasPaidAPIAccess: false,
  offerings: null,
  storeReady: false,
  storeError: null,
  loading: true,
  purchasePackage: async () => false,
  restorePurchases: async () => false,
  checkEntitlements: async () => {},
  manageSubscription: () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext);
  const Purchases = getPurchasesModule();
  const [tier, setTier] = useState<PlanTier>("free");
  const [offerings, setOfferings] = useState<any | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);
  const lastLoggedInUserIdRef = useRef<string | null>(null);
  const lastEntitlementCheckAtRef = useRef(0);
  const entitlementCheckInFlightRef = useRef<Promise<void> | null>(null);
  const recentPaidTierRef = useRef<RecentPaidTier | null>(null);

  const determineTier = useCallback(resolveRevenueCatPlanTier, []);
  const rememberPaidTier = useCallback((resolvedTier: PlanTier) => {
    const nextRecentTier = createRecentPaidTier(resolvedTier);
    if (nextRecentTier) recentPaidTierRef.current = nextRecentTier;
  }, []);
  const getRecentPaidTier = useCallback((): RecentPaidTier | null => {
    const recent = recentPaidTierRef.current;
    if (!recent) return null;
    if (recent.expiresAt < Date.now()) {
      recentPaidTierRef.current = null;
      return null;
    }
    return recent;
  }, []);
  const applyCustomerInfoTier = useCallback(
    (customerInfo: any): PlanTier => {
      const resolvedTier = determineTier(customerInfo);
      const nextTier = resolvePlanTierWithRecentPaidTier(
        resolvedTier,
        getRecentPaidTier(),
      );
      rememberPaidTier(nextTier);
      setTier(nextTier);
      return nextTier;
    },
    [determineTier, getRecentPaidTier, rememberPaidTier],
  );

  const revenueCatRefreshPayload = useCallback(async (customerInfo?: any) => {
    let currentAppUserId: string | undefined;

    if (Purchases && typeof Purchases.getAppUserID === "function") {
      try {
        currentAppUserId = await Purchases.getAppUserID();
      } catch {
        currentAppUserId = undefined;
      }
    }

    return {
      revenueCatAppUserIds: revenueCatCustomerInfoAppUserIds(
        customerInfo,
        currentAppUserId,
      ),
    };
  }, []);

  const syncServerEntitlement = useCallback(
    async (customerInfo?: any): Promise<PlanTier | null> => {
      if (!activeUserIdRef.current) return null;
      if (ENABLE_QA_AUTH_BYPASS) return null;

      try {
        const response = await apiRequest(
          "POST",
          "/api/subscriptions/refresh",
          await revenueCatRefreshPayload(customerInfo),
        );
        const body = (await response.json()) as { tier?: unknown };
        const serverTier =
          body?.tier === "scholar" || body?.tier === "premium"
            ? body.tier
            : "free";
        if (serverTier !== "free") setTier(serverTier);
        return serverTier;
      } catch (error) {
        if (!isExpectedQAAuthError(error)) {
          console.warn(
            "Subscription server refresh unavailable:",
            error instanceof Error ? error.message : error,
          );
        }
        return null;
      }
    },
    [revenueCatRefreshPayload],
  );

  const identifyPurchasesUser = useCallback(async (): Promise<void> => {
    const appUserId = activeUserIdRef.current;
    if (!appUserId || !Purchases || typeof Purchases.logIn !== "function") {
      return;
    }

    try {
      const currentAppUserId =
        typeof Purchases.getAppUserID === "function"
          ? await Purchases.getAppUserID()
          : null;
      if (currentAppUserId === appUserId) return;

      const { customerInfo } = await Purchases.logIn(appUserId);
      lastLoggedInUserIdRef.current = appUserId;
      if (customerInfo) {
        const serverTier = await syncServerEntitlement(customerInfo);
        applyCustomerInfoTier(customerInfo);
        if (serverTier && serverTier !== "free") {
          rememberPaidTier(serverTier);
          setTier(serverTier);
        }
      }
    } catch (error) {
      console.warn(
        "Subscription RevenueCat identity sync unavailable:",
        error instanceof Error ? error.message : error,
      );
    }
  }, [applyCustomerInfoTier, rememberPaidTier, syncServerEntitlement]);

  const syncPaidCustomerInfoToServer = useCallback(
    async (customerInfo: any): Promise<PlanTier> => {
      const resolvedTier = applyCustomerInfoTier(customerInfo);
      const serverTier = await syncServerEntitlement(customerInfo);
      if (serverTier && serverTier !== "free") {
        rememberPaidTier(serverTier);
        setTier(serverTier);
        return serverTier;
      }

      return resolvedTier;
    },
    [applyCustomerInfoTier, rememberPaidTier, syncServerEntitlement],
  );

  const refreshRevenueCatOfferings = useCallback(async () => {
    const offeringsResult = await Purchases.getOfferings();
    const availableOffering = offeringWithAllAvailablePackages(offeringsResult);

    if (availableOffering) {
      setOfferings({ ...offeringsResult, current: availableOffering });
      const missingOptions = missingRequiredPlanOptions(availableOffering);
      setStoreError(
        missingOptions.length
          ? `Some plan options are temporarily unavailable: ${missingOptions.join(", ")}. You can still choose any plan shown here or restore an existing purchase.`
          : null,
      );
      return;
    }

    setOfferings(null);
    setStoreError(STORE_UNAVAILABLE_MESSAGE);
  }, []);

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      if (configured) {
        setLoading(false);
        return;
      }

      try {
        const apiKey = revenueCatPublicApiKey();
        const hasPurchasesSDK =
          Purchases && typeof Purchases.configure === "function";

        if (!apiKey || !hasPurchasesSDK) {
          if (__DEV__) {
            console.log(
              "Subscription: Dev mode — all features unlocked (scholar)",
            );
            setTier("scholar");
            setStoreError(DEV_STORE_UNAVAILABLE_MESSAGE);
          } else {
            console.log(
              "Subscription: No RevenueCat key in production, defaulting to free",
            );
            setTier("free");
            setStoreError(STORE_UNAVAILABLE_MESSAGE);
          }
          setLoading(false);
          return;
        }

        setStoreError(null);
        await Purchases.configure({
          apiKey,
          ...(user?.id ? { appUserID: user.id } : {}),
        });
        if (user?.id) {
          lastLoggedInUserIdRef.current = user.id;
        }
        setConfigured(true);

        try {
          await refreshRevenueCatOfferings();
        } catch (error) {
          console.warn(
            "RevenueCat offerings load error:",
            error instanceof Error ? error.message : error,
          );
          setOfferings(null);
          setStoreError(STORE_LOAD_ERROR_MESSAGE);
        }

        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const resolvedTier = await syncPaidCustomerInfoToServer(customerInfo);
          console.log("Subscription: RevenueCat tier resolved:", resolvedTier);
        } catch (error) {
          console.warn(
            "RevenueCat customer info error:",
            error instanceof Error ? error.message : error,
          );
        }

        Purchases.addCustomerInfoUpdateListener((info: any) => {
          syncPaidCustomerInfoToServer(info)
            .then((newTier) => {
              console.log("Subscription: Tier updated via listener:", newTier);
            })
            .catch((error: unknown) => {
              if (!isExpectedQAAuthError(error)) {
                console.warn(
                  "Subscription server refresh after RevenueCat listener unavailable:",
                  error instanceof Error ? error.message : error,
                );
              }
            });
        });
      } catch (error) {
        console.error("RevenueCat init error:", error);
        if (__DEV__) {
          console.log(
            "Subscription: Error in dev mode — unlocking all features",
          );
          setTier("scholar");
          setStoreError(DEV_STORE_UNAVAILABLE_MESSAGE);
        } else {
          setTier("free");
          setStoreError(STORE_LOAD_ERROR_MESSAGE);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [
    configured,
    refreshRevenueCatOfferings,
    syncPaidCustomerInfoToServer,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) {
      if (!configured || !Purchases) return;

      let cancelled = false;
      const applyAnonymousCustomerInfo = (customerInfo: any) => {
        if (!cancelled && customerInfo) {
          applyCustomerInfoTier(customerInfo);
        }
      };

      if (
        lastLoggedInUserIdRef.current &&
        typeof Purchases.logOut === "function"
      ) {
        Purchases.logOut()
          .then(({ customerInfo }: any) => {
            lastLoggedInUserIdRef.current = null;
            if (customerInfo) {
              applyAnonymousCustomerInfo(customerInfo);
              return;
            }
            return Purchases.getCustomerInfo().then(applyAnonymousCustomerInfo);
          })
          .catch((error: unknown) => {
            console.error("RevenueCat logout error:", error);
            lastLoggedInUserIdRef.current = null;
            return Purchases.getCustomerInfo()
              .then(applyAnonymousCustomerInfo)
              .catch(() => {
                if (!cancelled) setTier("free");
              });
          });

        return () => {
          cancelled = true;
        };
      }
      Purchases.getCustomerInfo()
        .then(applyAnonymousCustomerInfo)
        .catch((error: unknown) => {
          console.error("RevenueCat anonymous customer info error:", error);
          if (!cancelled) setTier("free");
        });

      return () => {
        cancelled = true;
      };
    }

    if (!configured || !Purchases) return;

    let cancelled = false;
    const identify = async () => {
      const currentAppUserId =
        typeof Purchases.getAppUserID === "function"
          ? await Purchases.getAppUserID().catch(() => null)
          : null;
      if (currentAppUserId === user.id) {
        lastLoggedInUserIdRef.current = user.id;
        const customerInfo =
          typeof Purchases.getCustomerInfo === "function"
            ? await Purchases.getCustomerInfo().catch(() => null)
            : null;
        return { customerInfo };
      }
      return Purchases.logIn(user.id);
    };

    identify()
      .then(({ customerInfo }: any) => {
        lastLoggedInUserIdRef.current = user.id;
        if (!cancelled) {
          syncPaidCustomerInfoToServer(customerInfo).catch((error: unknown) => {
            if (!isExpectedQAAuthError(error)) {
              console.warn(
                "Subscription server refresh after RevenueCat login unavailable:",
                error instanceof Error ? error.message : error,
              );
            }
          });
        }
      })
      .catch((error: unknown) => {
        console.error("RevenueCat identify error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    applyCustomerInfoTier,
    configured,
    syncPaidCustomerInfoToServer,
    user?.id,
  ]);

  const checkEntitlements = useCallback(
    async (options?: { force?: boolean }) => {
      if (!configured || !Purchases) return;
      const now = Date.now();
      if (
        !options?.force &&
        now - lastEntitlementCheckAtRef.current <
          ENTITLEMENT_REFRESH_THROTTLE_MS
      ) {
        return;
      }
      if (entitlementCheckInFlightRef.current) {
        return entitlementCheckInFlightRef.current;
      }

      const run = (async () => {
        lastEntitlementCheckAtRef.current = now;

        try {
          const customerInfo = await Purchases.getCustomerInfo();
          // syncPaidCustomerInfoToServer already applies the local RevenueCat
          // tier and performs the authenticated server refresh. Sending a
          // second refresh here can trigger RevenueCat rate limits and make a
          // valid paid account appear to be Free in the app.
          await syncPaidCustomerInfoToServer(customerInfo);
        } catch {}
        try {
          await refreshRevenueCatOfferings();
        } catch {}
      })();

      entitlementCheckInFlightRef.current = run;
      try {
        await run;
      } finally {
        entitlementCheckInFlightRef.current = null;
      }
    },
    [configured, refreshRevenueCatOfferings, syncPaidCustomerInfoToServer],
  );

  useEffect(() => {
    if (!configured || !Purchases) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkEntitlements({ force: true }).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [checkEntitlements, configured]);

  const purchasePackage = useCallback(
    async (pkg: any): Promise<boolean> => {
      if (!configured || !Purchases) return false;
      try {
        await identifyPurchasesUser();
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const purchasedPackageTier = resolvePurchasedPackageTier(pkg);
        const syncedTier = await syncPaidCustomerInfoToServer(customerInfo);
        const newTier = higherPlanTier(syncedTier, purchasedPackageTier);
        rememberPaidTier(newTier);
        setTier(newTier);
        return newTier !== "free";
      } catch (e: any) {
        if (e?.userCancelled) return false;
        throw e;
      }
    },
    [
      configured,
      identifyPurchasesUser,
      rememberPaidTier,
      syncPaidCustomerInfoToServer,
    ],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!configured || !Purchases) return false;
    try {
      await identifyPurchasesUser();
      const customerInfo = await Purchases.restoreTransactions();
      const newTier = await syncPaidCustomerInfoToServer(customerInfo);
      rememberPaidTier(newTier);
      setTier(newTier);
      return newTier !== "free";
    } catch (error) {
      console.warn(
        "RevenueCat restore unavailable:",
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }, [
    configured,
    identifyPurchasesUser,
    rememberPaidTier,
    syncPaidCustomerInfoToServer,
  ]);

  const manageSubscription = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else if (Platform.OS === "android") {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    } else {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    }
  }, []);

  const isPremium = tier === "premium" || tier === "scholar";
  const isScholar = tier === "scholar";
  const currentPlan = tier;
  const hasPaidAPIAccess = isPremium;
  const storeReady = offeringHasAllRequiredPlanOptions(offerings?.current);

  const value = useMemo(
    () => ({
      isPremium,
      isScholar,
      isLifetime: false,
      currentPlan,
      hasPaidAPIAccess,
      offerings,
      storeReady,
      storeError,
      loading,
      purchasePackage,
      restorePurchases,
      checkEntitlements,
      manageSubscription,
    }),
    [
      isPremium,
      isScholar,
      currentPlan,
      hasPaidAPIAccess,
      offerings,
      storeReady,
      storeError,
      loading,
      purchasePackage,
      restorePurchases,
      checkEntitlements,
      manageSubscription,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const subscription = useContext(SubscriptionContext);
  const { checkEntitlements, currentPlan, loading } = subscription;

  useEffect(() => {
    if (!loading && currentPlan === "free") {
      checkEntitlements().catch(() => {});
    }
  }, [checkEntitlements, currentPlan, loading]);

  return subscription;
}
