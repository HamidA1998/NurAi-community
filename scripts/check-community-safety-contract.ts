import assert from "node:assert/strict";

import {
  canCommunityMembersInteract,
  canonicalCommunityPair,
  isCommunityAudienceChangeAllowed,
} from "../shared/communitySafety";

assert.equal(
  canCommunityMembersInteract("male", "female"),
  false,
  "brothers and sisters must never be eligible for social interaction",
);

assert.deepEqual(
  canonicalCommunityPair(42, 7),
  [7, 42],
  "connection and conversation pairs must have one canonical ordering",
);

assert.equal(
  isCommunityAudienceChangeAllowed("male", "female"),
  false,
  "a profile must not move its existing social history into another audience",
);

console.log("Community safety contract check passed.");
