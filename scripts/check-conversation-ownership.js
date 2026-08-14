#!/usr/bin/env node

const pg = require("pg");

const { Pool } = pg;

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set to check conversation ownership.",
    );
  }

  const shouldFix = hasFlag("fix");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const summary = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE conversations.user_id IS NULL)::int AS null_owner_count,
          COUNT(*) FILTER (
            WHERE conversations.user_id IS NOT NULL AND users.id IS NULL
          )::int AS missing_user_count
        FROM conversations
        LEFT JOIN users ON users.id = conversations.user_id
      `);

      const counts = summary.rows[0] || {
        null_owner_count: 0,
        missing_user_count: 0,
      };
      const orphanCount =
        Number(counts.null_owner_count || 0) +
        Number(counts.missing_user_count || 0);

      let deletedConversations = 0;
      let deletedMessages = 0;

      if (shouldFix && orphanCount > 0) {
        const deletedMessageResult = await client.query(`
          DELETE FROM messages
          WHERE conversation_id IN (
            SELECT conversations.id
            FROM conversations
            LEFT JOIN users ON users.id = conversations.user_id
            WHERE conversations.user_id IS NULL OR users.id IS NULL
          )
        `);
        deletedMessages = deletedMessageResult.rowCount || 0;

        const deletedConversationResult = await client.query(`
          DELETE FROM conversations
          WHERE id IN (
            SELECT conversations.id
            FROM conversations
            LEFT JOIN users ON users.id = conversations.user_id
            WHERE conversations.user_id IS NULL OR users.id IS NULL
          )
        `);
        deletedConversations = deletedConversationResult.rowCount || 0;
      }

      const columnCheck = await client.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'user_id'
        LIMIT 1
      `);
      const userIdNullable = columnCheck.rows[0]?.is_nullable === "YES";

      const result = {
        ok: orphanCount === 0 && !userIdNullable,
        fixApplied: shouldFix,
        nullOwnerConversations: Number(counts.null_owner_count || 0),
        missingUserConversations: Number(counts.missing_user_count || 0),
        deletedConversations,
        deletedMessages,
        userIdNullable,
      };

      if (shouldFix) {
        await client.query("COMMIT");
      } else {
        await client.query("ROLLBACK");
      }

      console.log(JSON.stringify(result, null, 2));

      if (!result.ok) {
        throw new Error(
          shouldFix
            ? "Conversation ownership is still not release-safe. Run the SQL migration after cleanup."
            : "Conversation ownership check failed. Run with --fix before applying the non-null migration.",
        );
      }
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `Conversation ownership check failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
