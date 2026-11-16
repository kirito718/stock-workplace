-- Reversible rollback for 001_research_log.sql.
DROP TABLE IF EXISTS action_state;
DROP TABLE IF EXISTS research_entries;
