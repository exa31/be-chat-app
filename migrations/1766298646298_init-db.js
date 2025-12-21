/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // Ensure pgcrypto for gen_random_uuid()
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Create enum types (idempotent)
    pgm.sql(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('online','offline','away');
  END IF;
END
$$;`);

    pgm.sql(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_type') THEN
    CREATE TYPE chat_type AS ENUM ('private','group');
  END IF;
END
$$;`);

    pgm.sql(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE member_role AS ENUM ('admin','member');
  END IF;
END
$$;`);

    pgm.sql(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text','image','file');
  END IF;
END
$$;`);

    // users
    pgm.createTable('users', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        name: {type: 'varchar(255)', notNull: true},
        email: {type: 'varchar(255)', notNull: true, unique: true},
        password: {type: 'varchar(255)', notNull: true},
        avatar: {type: 'text'},
        status: {type: 'user_status', notNull: true, default: pgm.func("'offline'::user_status")},
        last_seen: {type: 'timestamp with time zone'},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')}
    });

    // chats
    pgm.createTable('chats', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        type: {type: 'chat_type', notNull: true, default: pgm.func("'private'::chat_type")},
        title: {type: 'varchar(255)'},
        created_by: {type: 'uuid', references: 'users(id)', onDelete: 'SET NULL'},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')}
    });

    // messages
    pgm.createTable('messages', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        chat_id: {type: 'uuid', notNull: true, references: 'chats(id)', onDelete: 'CASCADE'},
        sender_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'SET NULL'},
        content: {type: 'text'},
        type: {type: 'message_type', notNull: true, default: pgm.func("'text'::message_type")},
        reply_to: {type: 'uuid', references: 'messages(id)', onDelete: 'SET NULL'},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')},
        deleted_at: {type: 'timestamp with time zone'}
    });

    pgm.createIndex('messages', ['chat_id']);
    pgm.createIndex('messages', ['created_at']);

    // chat_members (many-to-many) -- moved here so messages table exists for FK last_read_message_id
    pgm.createTable('chat_members', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        chat_id: {type: 'uuid', notNull: true, references: 'chats(id)', onDelete: 'CASCADE'},
        user_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        role: {type: 'member_role', notNull: true, default: pgm.func("'member'::member_role")},
        joined_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')},
        last_read_message_id: {type: 'uuid', references: 'messages(id)', onDelete: 'SET NULL'}
    });

    // Ensure a user can be a member of a chat only once
    pgm.addConstraint('chat_members', 'chat_members_chat_id_user_id_unique', {
        unique: ['chat_id', 'user_id']
    });

    // message_attachments
    pgm.createTable('message_attachments', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        message_id: {type: 'uuid', notNull: true, references: 'messages(id)', onDelete: 'CASCADE'},
        file_url: {type: 'text', notNull: true},
        file_type: {type: 'varchar(100)'},
        file_size: {type: 'bigint'}
    });

    // message_reads
    pgm.createTable('message_reads', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        message_id: {type: 'uuid', notNull: true, references: 'messages(id)', onDelete: 'CASCADE'},
        user_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        read_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')}
    });

    // prevent duplicate read receipts
    pgm.addConstraint('message_reads', 'message_reads_message_id_user_id_unique', {unique: ['message_id', 'user_id']});

    // message_reactions
    pgm.createTable('message_reactions', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        message_id: {type: 'uuid', notNull: true, references: 'messages(id)', onDelete: 'CASCADE'},
        user_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        reaction: {type: 'varchar(100)', notNull: true},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')}
    });

    // optional: prevent duplicate identical reaction by same user on same message
    pgm.addConstraint('message_reactions', 'message_reactions_message_user_reaction_unique', {
        unique: ['message_id', 'user_id', 'reaction']
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Drop tables in reverse order of creation to respect FK dependencies
    pgm.dropTable('message_reactions', {ifExists: true, cascade: true});
    pgm.dropTable('message_reads', {ifExists: true, cascade: true});
    pgm.dropTable('message_attachments', {ifExists: true, cascade: true});
    pgm.dropTable('messages', {ifExists: true, cascade: true});
    pgm.dropTable('chat_members', {ifExists: true, cascade: true});
    pgm.dropTable('chats', {ifExists: true, cascade: true});
    pgm.dropTable('users', {ifExists: true, cascade: true});

    // Drop enum types
    pgm.sql('DROP TYPE IF EXISTS message_type;');
    pgm.sql('DROP TYPE IF EXISTS member_role;');
    pgm.sql('DROP TYPE IF EXISTS chat_type;');
    pgm.sql('DROP TYPE IF EXISTS user_status;');

    // NOTE: We do not drop the pgcrypto extension here to avoid unexpected side-effects in other migrations.
};
