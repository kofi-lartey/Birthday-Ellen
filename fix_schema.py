import re

c = open('multi_event_schema.sql', 'r', encoding='utf-8').read()

# Replace all CREATE POLICY with CREATE POLICY IF NOT EXISTS
rows = c.split('\n')
out = []
for row in rows:
    if row.lstrip().startswith('CREATE POLICY "') and not row.lstrip().startswith('CREATE POLICY IF NOT EXISTS'):
        row = row.replace('CREATE POLICY "', 'CREATE POLICY IF NOT EXISTS "', 1)
    out.append(row)

c = '\n'.join(out)

with open('multi_event_schema.sql', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed')
