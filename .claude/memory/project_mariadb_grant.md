---
name: project-mariadb-grant
description: "MariaDB GRANT statement — syntax, privilege levels, privilege types, roles, TLS options, resource limits"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ab73896-e009-4bea-8b4e-76e0214e4f57
---

# MariaDB GRANT Reference

The `GRANT` statement assigns privileges or roles to accounts. Requires `GRANT OPTION` privilege and that you hold the privileges you're granting. Use `REVOKE` to remove, `SHOW GRANTS` to inspect.

## Syntax Forms

```sql
-- 1. Grant privileges
GRANT priv_type [(column_list)] [, ...]
  ON [object_type] priv_level
  TO account_or_role [, ...]
  [REQUIRE {NONE | tls_option ...}]
  [WITH grant_option_list]

-- 2. Grant proxy access
GRANT PROXY ON user_or_role TO account_or_role [WITH GRANT OPTION]

-- 3. Grant roles
GRANT role [, ...] TO account_or_role [WITH ADMIN OPTION]
```

## Privilege Levels (priv_level)

| Syntax | Scope | Stored in |
|--------|-------|-----------|
| `*.*` | Global | `mysql.global_priv` |
| `db_name.*` or `*` | Database | `mysql.db` |
| `db_name.tbl_name` or `tbl_name` | Table | table privs |
| Column list after priv type | Column | column privs |
| `FUNCTION db_name.routine_name` | Function | |
| `PROCEDURE db_name.routine_name` | Procedure | |

Global privileges take effect only for **new** connections after the GRANT.

## Key Privilege Types

**Global:** `ALL PRIVILEGES`, `SUPER`, `SHUTDOWN`, `PROCESS`, `FILE`, `RELOAD`, `REPLICATION CLIENT/SLAVE`, `CREATE USER`, `SHOW DATABASES`, `BINLOG ADMIN`, `CONNECTION ADMIN`, `READ_ONLY ADMIN`, `SET USER`

**Database:** `CREATE`, `DROP`, `ALTER`, `EVENT`, `LOCK TABLES`, `CREATE ROUTINE`, `CREATE TEMPORARY TABLES`, `SHOW CREATE ROUTINE`, `GRANT OPTION`

**Table:** `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `INDEX`, `CREATE VIEW`, `SHOW VIEW`, `TRIGGER`, `DELETE HISTORY`, `GRANT OPTION`

**Column:** `SELECT (col_list)`, `INSERT (col_list)`, `UPDATE (col_list)`

**Function/Procedure/Package:** `EXECUTE`, `ALTER ROUTINE`, `GRANT OPTION`

**Proxy:** `PROXY` — lets one user proxy as another (requires PAM auth plugin)

## Special Privileges

- `USAGE`: No real privileges; used to set options (TLS, resource limits) without changing access.
- `ALL PRIVILEGES`: Grants all available privileges at that level. Does **not** include `GRANT OPTION`.
- `GRANT OPTION`: Allows user to grant their own privileges to others. Cannot be set per-column.
- `SUPER`: Broad admin powers; being split into finer-grained privileges since MariaDB 10.5.

## Roles

Roles are assigned with `GRANT role TO user`. Granted roles are **inactive** until the user activates them with `SET ROLE`. Use `WITH ADMIN OPTION` to let the grantee re-grant the role.

**Warning:** If a role name conflicts with a user name, the role takes precedence in GRANT statements.

## TO PUBLIC (MariaDB 10.11+)

`GRANT privilege ON db.obj TO PUBLIC` — applies to all current and future users.

## Resource Limit Options (WITH clause)

| Option | Description |
|--------|-------------|
| `MAX_QUERIES_PER_HOUR n` | Max statements (including updates) per hour |
| `MAX_UPDATES_PER_HOUR n` | Max update statements per hour |
| `MAX_CONNECTIONS_PER_HOUR n` | Max connections per hour |
| `MAX_USER_CONNECTIONS n` | Max simultaneous connections (0 = use global max_connections) |
| `MAX_STATEMENT_TIME t` | Timeout in seconds per statement |

Reset with `FLUSH USER_RESOURCES` or `FLUSH PRIVILEGES`.

## TLS Options (REQUIRE clause)

| Option | Meaning |
|--------|---------|
| `REQUIRE NONE` | TLS optional |
| `REQUIRE SSL` | TLS required, no cert needed |
| `REQUIRE X509` | TLS + valid X509 cert required |
| `REQUIRE ISSUER 'issuer'` | Specific CA issuer required |
| `REQUIRE SUBJECT 'subject'` | Specific cert subject required |
| `REQUIRE CIPHER 'cipher'` | Specific cipher required |

## Authentication Options

- `IDENTIFIED BY 'password'` — plaintext, hashed on storage
- `IDENTIFIED BY PASSWORD 'hash'` — pre-hashed value
- `IDENTIFIED VIA plugin [USING 'arg']` — auth plugin (PAM, ed25519, etc.)
- Default plugin: `mysql_native_password`

## Implicit Account Creation

`GRANT` can create accounts implicitly unless `NO_AUTO_CREATE_USER` SQL mode is set (then auth info must be provided, or use `CREATE USER` first).

**Why:** Reference for intern work involving MariaDB database setup and user/privilege management.
**How to apply:** Use when writing SQL for user creation, privilege assignment, or security hardening of MariaDB instances.
