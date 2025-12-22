/* Migration for chat_requests table */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // create enum type for status
    pgm.sql("CREATE TYPE chat_request_status AS ENUM ('pending','accepted','rejected')");

    pgm.createTable('chat_requests', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        sender_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        receiver_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        status: {type: 'chat_request_status', notNull: true, default: 'pending'},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')},
        responded_at: {type: 'timestamp with time zone', notNull: false}
    });

    // prevent sending request to self
    pgm.sql("ALTER TABLE chat_requests ADD CONSTRAINT chat_requests_no_self CHECK (sender_id <> receiver_id)");

    // unique unordered pair constraint: only one request between two users regardless of direction
    pgm.sql("CREATE UNIQUE INDEX chat_requests_pair_unique ON chat_requests (LEAST(sender_id::text, receiver_id::text), GREATEST(sender_id::text, receiver_id::text))");

    // indexes
    pgm.createIndex('chat_requests', ['receiver_id']);
    pgm.createIndex('chat_requests', ['sender_id']);
};

exports.down = (pgm) => {
    pgm.dropTable('chat_requests', {ifExists: true, cascade: true});
    pgm.sql('DROP TYPE IF EXISTS chat_request_status');
};

