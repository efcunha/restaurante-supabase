# SQL Scripts

This directory contains SQL scripts for database operations.

## Purpose

SQL scripts in this directory are used for:
- Database schema migrations
- Adding or modifying constraints
- Database queries and analysis
- Schema dumps and backups

## Usage

Most SQL scripts can be executed using the Supabase CLI or directly in the Supabase dashboard.

Example:
```bash
supabase db execute --file scripts/sql/your-script.sql
```

## Safety

- Always review SQL scripts before executing them
- Test on a development database first
- Back up data before running destructive operations
- Use transactions where appropriate
