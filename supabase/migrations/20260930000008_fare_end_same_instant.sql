-- Included in 20260930000007_fare_engine.sql for a fresh install. Applied separately to the live project as: end_fare uses greatest(now(), effective_from + 1 second).
-- no-op marker: the end_fare fix is already part of migration 7 in this repository.
select 1;
