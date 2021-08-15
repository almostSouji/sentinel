create function next_incident_id() returns integer language plpgsql stable as $$ declare next_id integer;
begin
select max(id) into next_id
from incidents;
if next_id is null then return 1;
end if;
return next_id + 1;
end;
$$;