/**
 * Migration to create refresh_tokens table
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    pgm.createTable('refresh_tokens', {
        id: {type: 'uuid', notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()')},
        user_id: {type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE'},
        token_hash: {type: 'varchar(128)', notNull: true, unique: true},
        expires_at: {type: 'timestamp with time zone', notNull: true},
        revoked: {type: 'boolean', notNull: true, default: false},
        created_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp')}
    });

    pgm.createIndex('refresh_tokens', ['user_id']);
};

exports.down = (pgm) => {
    pgm.dropTable('refresh_tokens', {ifExists: true, cascade: true});
};

