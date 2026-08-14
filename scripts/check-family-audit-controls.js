#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireRegex(text, relativePath, checks, findings) {
  for (const [label, pattern] of checks) {
    if (!pattern.test(text)) {
      findings.push(`${relativePath}: missing ${label}`);
    }
  }
}

function main() {
  const findings = [];
  const schemaText = read("shared/schema.ts");
  const migrationText = read("migrations/0006_family_audit_events.sql");
  const familyMemberUniqueMigration = read(
    "migrations/0008_family_members_unique.sql",
  );
  const familyText = read("server/family.ts");
  const threatModelText = read("NurAI-Muslim-threat-model.md");
  const runbookText = read("docs/release/PRODUCTION_RELEASE_RUNBOOK.md");
  const releaseAuditText = read("docs/audit/RELEASE_COMPLETION_AUDIT.md");

  requireIncludes(
    schemaText,
    "shared/schema.ts",
    [
      "familyAuditEvents = pgTable",
      '"family_audit_events"',
      'action: text("action").notNull()',
      'actorId: varchar("actor_id")',
      'groupId: integer("group_id").references',
      'invitationId: integer("invitation_id").references',
      'targetUserId: varchar("target_user_id").references',
      'metadata: jsonb("metadata")',
      ".default",
      'index("family_audit_events_group_created_idx")',
      'index("family_audit_events_actor_created_idx")',
      'index("family_audit_events_invitation_idx")',
      'uniqueIndex("family_members_group_user_idx")',
    ],
    findings,
  );
  requireRegex(
    schemaText,
    "shared/schema.ts",
    [
      [
        "family audit actor cascades to users",
        /actorId:[\s\S]*?\.references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/,
      ],
      [
        "family audit group set-null",
        /groupId:[\s\S]*?familyGroups\.id,[\s\S]*?onDelete:\s*"set null"/,
      ],
    ],
    findings,
  );

  requireIncludes(
    migrationText,
    "migrations/0006_family_audit_events.sql",
    [
      "CREATE TABLE IF NOT EXISTS family_audit_events",
      "actor_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE",
      "group_id integer REFERENCES family_groups(id) ON DELETE SET NULL",
      "invitation_id integer REFERENCES family_invitations(id) ON DELETE SET NULL",
      "target_user_id varchar REFERENCES users(id) ON DELETE SET NULL",
      "metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
      "family_audit_events_group_created_idx",
      "family_audit_events_actor_created_idx",
      "family_audit_events_invitation_idx",
    ],
    findings,
  );
  requireIncludes(
    familyMemberUniqueMigration,
    "migrations/0008_family_members_unique.sql",
    [
      "DELETE FROM family_members",
      "ROW_NUMBER() OVER",
      "PARTITION BY group_id, user_id",
      "CREATE UNIQUE INDEX IF NOT EXISTS family_members_group_user_idx",
      "ON family_members (group_id, user_id)",
    ],
    findings,
  );

  requireIncludes(
    familyText,
    "server/family.ts",
    [
      "familyAuditEvents",
      "async function logFamilyAuditEvent",
      "db.insert(familyAuditEvents).values",
      'action: "group_created"',
      'action: "group_updated"',
      'action: "invitation_created"',
      'action: "member_removed"',
      'action === "accept" ? "invitation_accepted" : "invitation_declined"',
      "invitationId: invitation.id",
      "targetUserId: inviteeId",
      "targetUserId",
      "metadata: { previousName: group.name, name }",
    ],
    findings,
  );
  requireRegex(
    familyText,
    "server/family.ts",
    [
      [
        "family group rename route enforces paid access",
        /app\.put\("\/api\/family\/groups\/:id"[\s\S]{0,260}requireFamilyPremiumAccess\(req,\s*res,\s*user\)/,
      ],
    ],
    findings,
  );

  requireIncludes(
    threatModelText,
    "NurAI-Muslim-threat-model.md",
    [
      "family_audit_events",
      "npm run check:family-audit-controls",
      "verified email provider",
    ],
    findings,
  );
  requireIncludes(
    runbookText,
    "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    [
      "migrations/0006_family_audit_events.sql",
      "migrations/0008_family_members_unique.sql",
      "npm run check:family-audit-controls",
    ],
    findings,
  );
  requireIncludes(
    releaseAuditText,
    "docs/audit/RELEASE_COMPLETION_AUDIT.md",
    [
      "migrations/0006_family_audit_events.sql",
      "migrations/0008_family_members_unique.sql",
      "npm run check:family-audit-controls",
    ],
    findings,
  );

  if (findings.length) {
    console.error("Family audit-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Family audit-control check passed: schema, migration, family route audit writes, and release docs verified.",
  );
}

main();
